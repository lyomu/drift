import { Module } from '@nestjs/common';
import { PasswordPolicyService } from '../auth/password-policy';
import { PlatformPermissionGuard } from '../platform-admin/guards/platform-permission.guard';
import { ClubOnboardingController } from './club-onboarding.controller';
import { ClubOnboardingAdminController } from './club-onboarding-admin.controller';
import { ClubOnboardingService } from './club-onboarding.service';

/**
 * The club-creation request → platform approval → magic-link → setup-wizard
 * flow. `PrismaService` and `ConfigService` are global; the platform guard's
 * `platform-jwt` strategy is registered by `PlatformAdminModule` (Passport
 * strategies are process-global), and `PlatformPermissionGuard` is re-listed
 * here so `@UseGuards` can resolve it.
 */
@Module({
  controllers: [ClubOnboardingController, ClubOnboardingAdminController],
  providers: [
    ClubOnboardingService,
    PlatformPermissionGuard,
    PasswordPolicyService,
  ],
})
export class ClubOnboardingModule {}
