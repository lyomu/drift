import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { CompetitionHooksModule } from './competition-hooks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ClubFeedModule } from './club-feed/club-feed.module';
import { CoachesModule } from './coaches/coaches.module';
import { LearningModule } from './learning/learning.module';
import { NewsModule } from './news/news.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting (starter docs Phase 18 / PRD security NFR). Defaults are
    // production values; NODE_ENV=test relaxes them so the e2e suites' many
    // rapid auth round trips are never throttled by design.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL_MS') ?? 60_000),
            // Under Jest (NODE_ENV=test) effectively unlimited, so the e2e
            // suites' rapid auth round trips never flake on the limiter.
            limit:
              process.env.NODE_ENV === 'test'
                ? 10_000
                : Number(config.get('THROTTLE_LIMIT') ?? 300),
          },
        ],
      }),
    }),
    PrismaModule,
    CompetitionHooksModule,
    ScheduleModule.forRoot(),
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
    PlatformAdminModule,
    ClubFeedModule,
    CoachesModule,
    LearningModule,
    NewsModule,
    NotificationsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
