import { Injectable, NotFoundException } from '@nestjs/common';
import { OnboardingStep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BasicProfileDto } from './dto/basic-profile.dto';
import { TennisExperienceDto } from './dto/tennis-experience.dto';
import { LevelDto } from './dto/level.dto';
import { GoalsDto } from './dto/goals.dto';
import { PreferencesDto } from './dto/preferences.dto';
import { LocationDto } from './dto/location.dto';
import { ClubCourtsDto } from './dto/club-courts.dto';
import { AvailabilityDto } from './dto/availability.dto';
import { PadelInterestDto } from './dto/padel-interest.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireTennisProfile(userId: string) {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Tennis profile not found.');
    }
    return profile;
  }

  async updateBasicProfile(userId: string, dto: BasicProfileDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          photoUrl: dto.photoUrl,
          onboardingStep: OnboardingStep.TENNIS_EXPERIENCE,
        },
      }),
      this.prisma.tennisProfile.update({
        where: { userId },
        data: { dominantHand: dto.dominantHand },
      }),
    ]);
    return { onboardingStep: OnboardingStep.TENNIS_EXPERIENCE };
  }

  async updateTennisExperience(userId: string, dto: TennisExperienceDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.tennisProfile.update({
        where: { userId },
        data: {
          experienceSignal: dto.experienceSignal,
          selfReportedRatingScale: dto.selfReportedRatingScale,
          selfReportedRatingValue: dto.selfReportedRatingValue,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.ASSESSMENT },
      }),
    ]);
    return { onboardingStep: OnboardingStep.ASSESSMENT };
  }

  async updateLevel(userId: string, dto: LevelDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.tennisProfile.update({
        where: { userId },
        data: { userSelectedLevel: dto.userSelectedLevel },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.GOALS },
      }),
    ]);
    return { onboardingStep: OnboardingStep.GOALS };
  }

  async updateGoals(userId: string, dto: GoalsDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.tennisProfile.update({
        where: { userId },
        data: { onboardingGoals: dto.goals },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.PLAYING_PREFERENCES },
      }),
    ]);
    return { onboardingStep: OnboardingStep.PLAYING_PREFERENCES };
  }

  async updatePreferences(userId: string, dto: PreferencesDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.tennisProfile.update({
        where: { userId },
        data: {
          formatPreference: dto.formatPreference,
          stylePreference: dto.stylePreference,
          preferredTimeSlots: dto.preferredTimeSlots,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.LOCATION },
      }),
    ]);
    return { onboardingStep: OnboardingStep.LOCATION };
  }

  async updateLocation(userId: string, dto: LocationDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.tennisProfile.update({
        where: { userId },
        data: {
          generalLocation: dto.generalLocation,
          latitude: dto.latitude,
          longitude: dto.longitude,
          locationSource: dto.locationSource,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.CLUB_COURTS },
      }),
    ]);
    return { onboardingStep: OnboardingStep.CLUB_COURTS };
  }

  async updateClubCourts(userId: string, dto: ClubCourtsDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.tennisProfile.update({
        where: { userId },
        data: {
          preferredClubName: dto.preferredClubName,
          preferredCourtNames: dto.preferredCourtNames ?? [],
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.AVAILABILITY },
      }),
    ]);
    return { onboardingStep: OnboardingStep.AVAILABILITY };
  }

  async updateAvailability(userId: string, dto: AvailabilityDto) {
    const profile = await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.availabilitySlot.deleteMany({
        where: { tennisProfileId: profile.id },
      }),
      this.prisma.availabilitySlot.createMany({
        data: dto.slots.map((slot) => ({
          tennisProfileId: profile.id,
          dayOfWeek: slot.dayOfWeek,
          timeBlock: slot.timeBlock,
        })),
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.PADEL_INTEREST },
      }),
    ]);
    return { onboardingStep: OnboardingStep.PADEL_INTEREST };
  }

  async updatePadelInterest(userId: string, dto: PadelInterestDto) {
    await this.requireTennisProfile(userId);
    await this.prisma.$transaction([
      this.prisma.tennisProfile.update({
        where: { userId },
        data: { padelInterest: dto.padelInterest },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          onboardingStep: OnboardingStep.COMPLETE,
          onboardingCompletedAt: new Date(),
        },
      }),
    ]);
    return { onboardingStep: OnboardingStep.COMPLETE };
  }
}
