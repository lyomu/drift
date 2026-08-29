import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { labelForLevel } from '../common/level-label.util';
import { HOME_CARD_PRIORITY, type HomeCard } from './home-card';
import type {
  HomeCardContributor,
  HomeContext,
} from './contributors/home-contributor';
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
 * Home Dashboard — `foundation/04-screen-inventory.md` §A.3.
 *
 * Home answers "What should I do next?", so the feed is a priority-ordered
 * list of *prompts*, each carrying an action the client can route to.
 *
 * The card set was frozen at M4, when no match/competition/court data existed
 * and every card could only reflect onboarding answers back at the user. Tier
 * 1 (priority 10-99) is what makes the feed change between sessions; Tier 2
 * (100+) keeps it useful for a settled player with nothing outstanding.
 *
 * Identity data (level, goals, play style) deliberately no longer occupies
 * feed cards — it moved to `getSummary()`, the header, so it stops competing
 * with real activity for the top of the screen.
 */
@Injectable()
export class HomeService {
  private readonly logger = new Logger(HomeService.name);
  private readonly contributors: HomeCardContributor[];

  constructor(
    private readonly prisma: PrismaService,
    unconfirmedResult: UnconfirmedResultContributor,
    incomingChallenge: IncomingChallengeContributor,
    leagueRoundDeadline: LeagueRoundDeadlineContributor,
    upcomingMatch: UpcomingMatchContributor,
    pendingConnection: PendingConnectionContributor,
    unreadMessages: UnreadMessagesContributor,
    padelPrompt: PadelPromptContributor,
    developmentRecommendation: DevelopmentRecommendationContributor,
    suggestedOpponents: SuggestedOpponentsContributor,
    nearbyCourts: NearbyCourtsContributor,
    newsHighlight: NewsHighlightContributor,
    clubAnnouncement: ClubAnnouncementContributor,
    achievementProgress: AchievementProgressContributor,
  ) {
    this.contributors = [
      // Tier 1 — something is waiting on this user.
      unconfirmedResult,
      incomingChallenge,
      leagueRoundDeadline,
      upcomingMatch,
      pendingConnection,
      unreadMessages,
      // Tier 2 — discovery.
      suggestedOpponents,
      developmentRecommendation,
      nearbyCourts,
      clubAnnouncement,
      achievementProgress,
      newsHighlight,
      padelPrompt,
    ];
  }

  /**
   * The header above the feed: who this player is right now. Split out of the
   * card list because identity is *context*, not a prompt — as a card it just
   * pushed real activity down the screen.
   */
  async getSummary(userId: string) {
    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true },
      }),
      this.prisma.tennisProfile.findUnique({
        where: { userId },
        select: {
          userSelectedLevel: true,
          systemSuggestedLevel: true,
          singlesRating: true,
          doublesRating: true,
          onboardingGoals: true,
        },
      }),
    ]);
    if (!profile) throw new NotFoundException('Tennis profile not found.');

    const level = profile.userSelectedLevel ?? profile.systemSuggestedLevel;

    return {
      firstName: user?.firstName ?? null,
      level,
      // `null` rather than a fabricated default — an un-levelled player
      // renders as "Level not set", never as 1.0.
      levelLabel: level === null ? null : labelForLevel(level),
      singlesRating: profile.singlesRating,
      doublesRating: profile.doublesRating,
      goals: profile.onboardingGoals,
    };
  }

  async getFeed(userId: string): Promise<{ cards: HomeCard[] }> {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
      include: { availabilitySlots: true },
    });
    if (!profile) {
      throw new NotFoundException('Tennis profile not found.');
    }

    // Captured once and shared, so two contributors can't disagree about
    // whether a deadline has passed mid-build.
    const now = new Date();
    const ctx: HomeContext = { userId, now, profile };

    const [results, hidden] = await Promise.all([
      Promise.all(
        this.contributors.map(async (contributor) => {
          try {
            return await contributor.contribute(ctx);
          } catch (error) {
            // One failing contributor must not blank the app's landing
            // screen. Degrading to "that card is absent" is always better
            // than an error state on the screen every user lands on.
            this.logger.error(
              `Home contributor "${contributor.key}" failed for user ${userId}`,
              error instanceof Error ? error.stack : String(error),
            );
            return [];
          }
        }),
      ),
      this.hiddenCardIds(userId, now),
    ]);

    const cards = results
      .flat()
      .filter((card) => !hidden.has(card.id))
      .sort((a, b) => a.priority - b.priority);

    if (cards.length === 0) {
      cards.push({
        id: 'empty-fallback',
        type: 'EMPTY_FALLBACK',
        priority: HOME_CARD_PRIORITY.EMPTY_FALLBACK,
        title: "You're all caught up",
        body: 'Nothing needs you right now. Find a player nearby and set up your next match.',
        accent: 'neutral',
        action: { label: 'Find players', route: '/home?tab=play&play=find' },
        dismissible: false,
        data: null,
      });
    }

    return { cards };
  }

  async dismissCard(userId: string, cardId: string, snoozeHours?: number) {
    const snoozedUntil = snoozeHours
      ? new Date(Date.now() + snoozeHours * 60 * 60 * 1000)
      : null;

    await this.prisma.dismissedHomeCard.upsert({
      where: { userId_cardId: { userId, cardId } },
      // Re-dismissing replaces the previous window rather than stacking, so
      // snoozing a card that was already snoozed shortens or extends it
      // predictably instead of compounding.
      update: { snoozedUntil },
      create: { userId, cardId, snoozedUntil },
    });

    return { dismissed: true, snoozedUntil };
  }

  /**
   * Card ids currently hidden for this user. An expired snooze is simply
   * absent from the result — the row is left in place rather than swept, so
   * dismissal history survives for later analysis and there's no cron to run.
   */
  private async hiddenCardIds(userId: string, now: Date): Promise<Set<string>> {
    const rows = await this.prisma.dismissedHomeCard.findMany({
      where: {
        userId,
        OR: [{ snoozedUntil: null }, { snoozedUntil: { gt: now } }],
      },
      select: { cardId: true },
    });
    return new Set(rows.map((r) => r.cardId));
  }
}
