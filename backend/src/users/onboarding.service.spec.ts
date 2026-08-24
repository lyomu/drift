import { NotFoundException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  tennisProfile: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  availabilitySlot: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    tennisProfile: { findUnique: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
    availabilitySlot: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return prisma;
}

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.tennisProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
    });
    service = new OnboardingService(prisma as unknown as PrismaService);
  });

  it('throws NotFoundException when the caller has no tennis profile', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(null);

    await expect(
      service.updateBasicProfile('user-1', {
        firstName: 'A',
        lastName: 'B',
        dominantHand: 'RIGHT',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateBasicProfile persists User + TennisProfile fields and advances to TENNIS_EXPERIENCE', async () => {
    const result = await service.updateBasicProfile('user-1', {
      firstName: 'Alex',
      lastName: 'Doe',
      dominantHand: 'RIGHT',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Alex',
          lastName: 'Doe',
          onboardingStep: 'TENNIS_EXPERIENCE',
        }),
      }),
    );
    expect(prisma.tennisProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dominantHand: 'RIGHT' } }),
    );
    expect(result).toEqual({ onboardingStep: 'TENNIS_EXPERIENCE' });
  });

  it('updateTennisExperience advances to ASSESSMENT', async () => {
    const result = await service.updateTennisExperience('user-1', {
      experienceSignal: 'NEW',
    });

    expect(prisma.tennisProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ experienceSignal: 'NEW' }),
      }),
    );
    expect(result).toEqual({ onboardingStep: 'ASSESSMENT' });
  });

  it('updateLevel stores userSelectedLevel and advances to GOALS', async () => {
    const result = await service.updateLevel('user-1', {
      userSelectedLevel: 4.5,
    });

    expect(prisma.tennisProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userSelectedLevel: 4.5 } }),
    );
    expect(result).toEqual({ onboardingStep: 'GOALS' });
  });

  it('updateGoals advances to PLAYING_PREFERENCES', async () => {
    const result = await service.updateGoals('user-1', {
      goals: ['play_more', 'meet_people'],
    });
    expect(result).toEqual({ onboardingStep: 'PLAYING_PREFERENCES' });
  });

  it('updatePreferences advances to LOCATION', async () => {
    const result = await service.updatePreferences('user-1', {
      formatPreference: 'EITHER',
      stylePreference: 'SOCIAL',
      preferredTimeSlots: ['EVENING'],
    });
    expect(result).toEqual({ onboardingStep: 'LOCATION' });
  });

  it('updateLocation advances to CLUB_COURTS', async () => {
    const result = await service.updateLocation('user-1', {
      generalLocation: 'Brooklyn, NY',
      locationSource: 'MANUAL',
    });
    expect(result).toEqual({ onboardingStep: 'CLUB_COURTS' });
  });

  it('updateClubCourts defaults preferredCourtNames to [] and advances to AVAILABILITY', async () => {
    const result = await service.updateClubCourts('user-1', {});

    expect(prisma.tennisProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ preferredCourtNames: [] }),
      }),
    );
    expect(result).toEqual({ onboardingStep: 'AVAILABILITY' });
  });

  it('updateAvailability replaces (not appends) slots and advances to PADEL_INTEREST', async () => {
    const result = await service.updateAvailability('user-1', {
      slots: [{ dayOfWeek: 1, timeBlock: 'EVENING' }],
    });

    expect(prisma.availabilitySlot.deleteMany).toHaveBeenCalledWith({
      where: { tennisProfileId: 'profile-1' },
    });
    expect(prisma.availabilitySlot.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { tennisProfileId: 'profile-1', dayOfWeek: 1, timeBlock: 'EVENING' },
        ],
      }),
    );
    expect(result).toEqual({ onboardingStep: 'PADEL_INTEREST' });
  });

  it('updatePadelInterest advances to COMPLETE and sets onboardingCompletedAt', async () => {
    const result = await service.updatePadelInterest('user-1', {
      padelInterest: 'NO',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onboardingStep: 'COMPLETE',
          onboardingCompletedAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual({ onboardingStep: 'COMPLETE' });
  });
});
