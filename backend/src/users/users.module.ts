import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  controllers: [UsersController, OnboardingController],
  providers: [UsersService, OnboardingService],
})
export class UsersModule {}
