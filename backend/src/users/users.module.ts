import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { MediaController } from './media.controller';

@Module({
  controllers: [UsersController, OnboardingController, MediaController],
  providers: [UsersService, OnboardingService],
})
export class UsersModule {}
