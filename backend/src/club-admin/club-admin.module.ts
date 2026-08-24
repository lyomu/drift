import { Module } from '@nestjs/common';
import { ClubsAdminController } from './clubs-admin.controller';
import { ClubsAdminService } from './clubs-admin.service';
import { ClubCompetitionsAdminController } from './club-competitions-admin.controller';
import { CompetitionsAdminController } from './competitions-admin.controller';
import { ClubCourtsAdminController } from './club-courts-admin.controller';
import { AnnouncementsAdminController } from './announcements-admin.controller';
import { AnnouncementsAdminService } from './announcements-admin.service';
import { ReportsAdminController } from './reports-admin.controller';
import { ClubMembershipGuard } from './guards/club-membership.guard';
import { ClubAuthService } from './club-auth.service';
import { CompetitionsModule } from '../competitions/competitions.module';
import { MatchesModule } from '../matches/matches.module';
import { CourtsModule } from '../courts/courts.module';
import { SafetyModule } from '../safety/safety.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    CompetitionsModule,
    MatchesModule,
    CourtsModule,
    SafetyModule,
    NotificationsModule,
  ],
  controllers: [
    ClubsAdminController,
    ClubCompetitionsAdminController,
    CompetitionsAdminController,
    ClubCourtsAdminController,
    AnnouncementsAdminController,
    ReportsAdminController,
  ],
  providers: [
    ClubsAdminService,
    AnnouncementsAdminService,
    ClubMembershipGuard,
    ClubAuthService,
  ],
})
export class ClubAdminModule {}
