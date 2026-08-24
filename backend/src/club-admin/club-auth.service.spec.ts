import { ForbiddenException } from '@nestjs/common';
import { ClubAuthService } from './club-auth.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  clubMembership: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return { clubMembership: { findUnique: jest.fn() } };
}

describe('ClubAuthService', () => {
  let service: ClubAuthService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ClubAuthService(prisma as unknown as PrismaService);
  });

  it('rejects a caller with no membership at all', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue(null);
    await expect(
      service.assertRole('user-1', 'club-1', ['OWNER', 'ADMIN'] as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a SUSPENDED membership even with an allowed role', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({
      role: 'OWNER',
      status: 'SUSPENDED',
    });
    await expect(
      service.assertRole('user-1', 'club-1', ['OWNER'] as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an ACTIVE membership with a role outside the allowed set', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({
      role: 'READ_ONLY',
      status: 'ACTIVE',
    });
    await expect(
      service.assertRole('user-1', 'club-1', ['OWNER', 'ADMIN'] as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an ACTIVE membership with an allowed role', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue({
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await expect(
      service.assertRole('user-1', 'club-1', ['OWNER', 'ADMIN'] as never),
    ).resolves.toBeUndefined();
  });
});
