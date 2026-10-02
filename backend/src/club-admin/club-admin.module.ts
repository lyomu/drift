import { Module } from '@nestjs/common';
import { CoachesModule } from '../coaches/coaches.module';
import { EventsModule } from '../events/events.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { CourtsModule } from '../courts/courts.module';
import { MatchesModule } from '../matches/matches.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SafetyModule } from '../safety/safety.module';
import { UsersModule } from '../users/users.module';
import { AnnouncementsAdminController } from './announcements-admin.controller';
import { AnnouncementsAdminService } from './announcements-admin.service';
import { ClubAuthService } from './club-auth.service';
import { ClubCoachesAdminController } from './club-coaches-admin.controller';
import { ClubCompetitionsAdminController } from './club-competitions-admin.controller';
import { ClubCourtPhotosController } from './club-court-photos.controller';
import { ClubCourtsAdminController } from './club-courts-admin.controller';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { ClubsAdminController } from './clubs-admin.controller';
import { ClubsAdminService } from './clubs-admin.service';
import { CompetitionsAdminExpansionController } from './competitions-admin-expansion.controller';
import { CompetitionsAdminController } from './competitions-admin.controller';
import { ReportsAdminController } from './reports-admin.controller';
import { EventsAdminController } from './events-admin.controller';
import { ClubOperationsController } from './club-operations.controller';
import { ClubOperationsService } from './club-operations.service';

@Module({
  imports: [
    CompetitionsModule,
    MatchesModule,
    CourtsModule,
    SafetyModule,
    NotificationsModule,
    CoachesModule,
    EventsModule,
    UsersModule,
  ],
  controllers: [
    CompetitionsAdminExpansionController,
    ClubsAdminController,
    ClubCompetitionsAdminController,
    CompetitionsAdminController,
    ClubCourtsAdminController,
    ClubCourtPhotosController,
    AnnouncementsAdminController,
    ReportsAdminController,
    ClubCoachesAdminController,
    EventsAdminController,
    ClubOperationsController,
  ],
  providers: [
    ClubsAdminService,
    AnnouncementsAdminService,
    ClubMembershipGuard,
    ClubAuthService,
    ClubOperationsService,
  ],
})
export class ClubAdminModule {}
