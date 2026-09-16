import { WaitlistService } from './waitlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mail/mailer.service';
import { CreateWaitlistSignupDto } from './dto/create-waitlist-signup.dto';

type MockPrisma = {
  waitlistSignup: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    waitlistSignup: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'signup-1' }),
    },
  };
}

function createMockMailer() {
  return {
    sendWaitlistConfirmation: jest.fn().mockResolvedValue(true),
  };
}

function dto(overrides: Partial<CreateWaitlistSignupDto> = {}) {
  return {
    email: 'player@example.com',
    firstName: 'Njeri',
    audience: 'PLAYER',
    source: 'website',
    ...overrides,
  } as CreateWaitlistSignupDto;
}

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prisma: MockPrisma;
  let mailer: ReturnType<typeof createMockMailer>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mailer = createMockMailer();
    service = new WaitlistService(
      prisma as unknown as PrismaService,
      mailer as unknown as MailerService,
    );
  });

  it('records a signup and confirms it by email', async () => {
    await expect(service.join(dto())).resolves.toEqual({ ok: true });

    expect(prisma.waitlistSignup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'player@example.com' },
        create: expect.objectContaining({
          email: 'player@example.com',
          firstName: 'Njeri',
        }),
      }),
    );
    // The name is passed through so the confirmation can greet by it.
    expect(mailer.sendWaitlistConfirmation).toHaveBeenCalledWith(
      'player@example.com',
      'Njeri',
    );
  });

  it('is idempotent: a repeat signup succeeds without a second email', async () => {
    prisma.waitlistSignup.findUnique.mockResolvedValue({ id: 'signup-1' });

    await expect(service.join(dto())).resolves.toEqual({ ok: true });

    expect(prisma.waitlistSignup.upsert).toHaveBeenCalled();
    // The caller must not be able to tell a repeat from a first signup, but
    // the person must not be mailed twice either.
    expect(mailer.sendWaitlistConfirmation).not.toHaveBeenCalled();
  });

  it('does not blank existing detail when a later submission omits it', async () => {
    prisma.waitlistSignup.findUnique.mockResolvedValue({ id: 'signup-1' });

    await service.join(
      dto({ country: undefined, city: undefined, level: undefined }),
    );

    const call = prisma.waitlistSignup.upsert.mock.calls[0][0] as {
      update: Record<string, unknown>;
    };
    expect(call.update).not.toHaveProperty('country');
    expect(call.update).not.toHaveProperty('city');
    expect(call.update).not.toHaveProperty('level');
  });

  it('passes through the detail a submission does carry', async () => {
    await service.join(
      dto({ country: 'Kenya', city: 'Nairobi', level: '2.5-3.5' }),
    );

    const call = prisma.waitlistSignup.upsert.mock.calls[0][0] as {
      update: Record<string, unknown>;
    };
    expect(call.update).toMatchObject({
      country: 'Kenya',
      city: 'Nairobi',
      level: '2.5-3.5',
    });
  });

  it('accepts a signup that carries no name', async () => {
    await expect(service.join(dto({ firstName: undefined }))).resolves.toEqual({
      ok: true,
    });

    expect(mailer.sendWaitlistConfirmation).toHaveBeenCalledWith(
      'player@example.com',
      undefined,
    );
  });

  it('still records the signup when the confirmation email fails', async () => {
    mailer.sendWaitlistConfirmation.mockResolvedValue(false);

    await expect(service.join(dto())).resolves.toEqual({ ok: true });
    expect(prisma.waitlistSignup.upsert).toHaveBeenCalled();
  });
});
