import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
import { BasicProfileDto } from './dto/basic-profile.dto';
import { TennisExperienceDto } from './dto/tennis-experience.dto';
import { LevelDto } from './dto/level.dto';
import { GoalsDto } from './dto/goals.dto';
import { PreferencesDto } from './dto/preferences.dto';
import { LocationDto } from './dto/location.dto';
import { ClubCourtsDto } from './dto/club-courts.dto';
import { AvailabilityDto } from './dto/availability.dto';
import { PadelInterestDto } from './dto/padel-interest.dto';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  private userId(req: Request): string {
    return (req.user as { userId: string }).userId;
  }

  @Patch('basic-profile')
  basicProfile(@Req() req: Request, @Body() dto: BasicProfileDto) {
    return this.onboardingService.updateBasicProfile(this.userId(req), dto);
  }

  @Patch('tennis-experience')
  tennisExperience(@Req() req: Request, @Body() dto: TennisExperienceDto) {
    return this.onboardingService.updateTennisExperience(this.userId(req), dto);
  }

  @Patch('level')
  level(@Req() req: Request, @Body() dto: LevelDto) {
    return this.onboardingService.updateLevel(this.userId(req), dto);
  }

  @Patch('goals')
  goals(@Req() req: Request, @Body() dto: GoalsDto) {
    return this.onboardingService.updateGoals(this.userId(req), dto);
  }

  @Patch('preferences')
  preferences(@Req() req: Request, @Body() dto: PreferencesDto) {
    return this.onboardingService.updatePreferences(this.userId(req), dto);
  }

  @Patch('location')
  location(@Req() req: Request, @Body() dto: LocationDto) {
    return this.onboardingService.updateLocation(this.userId(req), dto);
  }

  @Patch('club-courts')
  clubCourts(@Req() req: Request, @Body() dto: ClubCourtsDto) {
    return this.onboardingService.updateClubCourts(this.userId(req), dto);
  }

  @Patch('availability')
  availability(@Req() req: Request, @Body() dto: AvailabilityDto) {
    return this.onboardingService.updateAvailability(this.userId(req), dto);
  }

  @Patch('padel-interest')
  padelInterest(@Req() req: Request, @Body() dto: PadelInterestDto) {
    return this.onboardingService.updatePadelInterest(this.userId(req), dto);
  }
}
