import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssessmentModule } from './assessment/assessment.module';
import { PadelModule } from './padel/padel.module';
import { HomeModule } from './home/home.module';
import { ConnectionsModule } from './connections/connections.module';
import { SafetyModule } from './safety/safety.module';
import { MessagingModule } from './messaging/messaging.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { CourtsModule } from './courts/courts.module';
import { ClubsModule } from './clubs/clubs.module';
import { ClubAdminModule } from './club-admin/club-admin.module';
import { ClubFeedModule } from './club-feed/club-feed.module';
import { CoachesModule } from './coaches/coaches.module';
import { LearningModule } from './learning/learning.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssessmentModule,
    PadelModule,
    HomeModule,
    PlayersModule,
    ConnectionsModule,
    SafetyModule,
    MessagingModule,
    MatchesModule,
    CompetitionsModule,
    CourtsModule,
    ClubsModule,
    ClubAdminModule,
    ClubFeedModule,
    CoachesModule,
    LearningModule,
    NewsModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
