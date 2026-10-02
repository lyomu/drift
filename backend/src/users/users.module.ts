import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { MediaController } from './media.controller';

@Module({
  controllers: [UsersController, OnboardingController, MediaController],
  providers: [UsersService, OnboardingService],
  // Consumed by ClubCoachesAdminController (club-admin module) so a club
  // admin can set a coach's photo on their behalf, reusing the same
  // upload/delete logic as the coach's own /users/me/photo.
  exports: [UsersService],
})
export class UsersModule {}
