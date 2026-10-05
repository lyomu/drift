import { Module } from '@nestjs/common';
import { PlatformPermissionGuard } from '../platform-admin/guards/platform-permission.guard';
import { CoachesController } from './coaches.controller';
import { CoachesService } from './coaches.service';
import { CoachApplicationsController } from './coach-applications.controller';
import { CoachApplicationsAdminController } from './coach-applications-admin.controller';
import { CoachApplicationsService } from './coach-applications.service';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Public coach discovery plus the apply → review → listed flow behind it.
 * `PlatformPermissionGuard` is re-listed here for the same reason as in
 * ClubOnboardingModule: the `platform-jwt` strategy is registered globally by
 * PlatformAdminModule, but the guard itself must resolve from this injector.
 */
@Module({
  controllers: [
    CoachesController,
    CoachApplicationsController,
    CoachApplicationsAdminController,
  ],
  providers: [
    CoachesService,
    CoachApplicationsService,
    PlatformPermissionGuard,
  ],
  imports: [NotificationsModule],
  exports: [CoachesService],
})
export class CoachesModule {}
