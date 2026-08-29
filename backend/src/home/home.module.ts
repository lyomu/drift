import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { LearningModule } from '../learning/learning.module';
import { PlayersModule } from '../players/players.module';
import { CourtsModule } from '../courts/courts.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { UnconfirmedResultContributor } from './contributors/unconfirmed-result.contributor';
import { IncomingChallengeContributor } from './contributors/incoming-challenge.contributor';
import { LeagueRoundDeadlineContributor } from './contributors/league-round-deadline.contributor';
import { UpcomingMatchContributor } from './contributors/upcoming-match.contributor';
import { PendingConnectionContributor } from './contributors/pending-connection.contributor';
import { UnreadMessagesContributor } from './contributors/unread-messages.contributor';
import { PadelPromptContributor } from './contributors/padel-prompt.contributor';
import { DevelopmentRecommendationContributor } from './contributors/development-recommendation.contributor';
import { SuggestedOpponentsContributor } from './contributors/suggested-opponents.contributor';
import { NearbyCourtsContributor } from './contributors/nearby-courts.contributor';
import { NewsHighlightContributor } from './contributors/news-highlight.contributor';
import { ClubAnnouncementContributor } from './contributors/club-announcement.contributor';
import { AchievementProgressContributor } from './contributors/achievement-progress.contributor';

/**
 * Home reads across most of the domain, but deliberately imports almost none
 * of it.
 *
 * `MatchesModule` pulls in `MessagingModule` + `NotificationsModule`, and
 * `CompetitionsModule` pulls in `MatchesModule` — importing either here to
 * reach their read methods would drag half the app's write-side graph into
 * the app's most-hit endpoint and risk genuine circular imports.
 *
 * Instead, contributors read through `PrismaService` and reuse the **pure
 * mappers** (`match.mapper`, `player.mapper`, `court.mapper`) and pure state
 * helpers (`match-state`) that already hold the real domain knowledge —
 * shape, privacy gating, derived state. Those are plain functions with no DI,
 * and `match.mapper` already imports `player.mapper` and `court.mapper`
 * cross-module, so this follows an established precedent rather than
 * inventing one.
 *
 * The four modules imported below are the exceptions, and each is a leaf
 * (no module imports of its own, so no cycle is possible): they expose
 * genuine *engine* logic that can't be expressed as a pure function —
 * `LearningModule` for M10's skill-score recommendation, `PlayersModule` for
 * M5's ranked opponent compatibility, `CourtsModule` for M9's distance
 * search, `AchievementsModule` for the derived rule catalogue.
 */
@Module({
  imports: [LearningModule, PlayersModule, CourtsModule, AchievementsModule],
  controllers: [HomeController],
  providers: [
    HomeService,
    UnconfirmedResultContributor,
    IncomingChallengeContributor,
    LeagueRoundDeadlineContributor,
    UpcomingMatchContributor,
    PendingConnectionContributor,
    UnreadMessagesContributor,
    PadelPromptContributor,
    DevelopmentRecommendationContributor,
    SuggestedOpponentsContributor,
    NearbyCourtsContributor,
    NewsHighlightContributor,
    ClubAnnouncementContributor,
    AchievementProgressContributor,
  ],
})
export class HomeModule {}
