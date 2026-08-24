import { Injectable, NotFoundException } from '@nestjs/common';
import { PadelInterestValue } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { labelForLevel } from '../common/level-label.util';
import { LearningService } from '../learning/learning.service';

/**
 * Card types the Home feed can produce today, from real onboarding-derived
 * data only (`foundation/06-domain-technical-architecture.md` §1). Match/
 * competition/court card types (unconfirmed results, suggested opponents,
 * nearby courts, league rounds — see `foundation/04-screen-inventory.md`
 * §A.3) stay deferred — an intentional scope decision, not a gap, per
 * PROGRESS.md's M9 entry (a "nearby courts" card was explicitly deferred
 * there too). DEVELOPMENT_RECOMMENDATION is new in M10 — Doc 3's Home
 * priority list names "Development recommendations" explicitly, and it's
 * real data (LearningService's own weakest-skill recommendation), not a
 * placeholder.
 */
export type HomeCardType =
  | 'LEVEL_SUMMARY'
  | 'GOALS_SUMMARY'
  | 'PLAY_STYLE_SUMMARY'
  | 'PADEL_TEASER'
  | 'DEVELOPMENT_RECOMMENDATION'
  | 'EMPTY_FALLBACK';

export interface HomeCard {
  id: string;
  type: HomeCardType;
  priority: number;
  title: string;
  body: string;
}

const FORMAT_LABEL: Record<string, string> = {
  SINGLES: 'singles',
  DOUBLES: 'doubles',
  EITHER: 'singles or doubles',
};

const STYLE_LABEL: Record<string, string> = {
  SOCIAL: 'social',
  COMPETITIVE: 'competitive',
  EITHER: 'social or competitive',
};

const SKILL_LABEL: Record<string, string> = {
  FOREHAND: 'forehand',
  BACKHAND: 'backhand',
  SERVE: 'serve',
  RETURN: 'return',
  NET_PLAY: 'net play',
  MOVEMENT: 'movement',
  MATCH_PLAY: 'match play',
};

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learning: LearningService,
  ) {}

  async getFeed(userId: string): Promise<{ cards: HomeCard[] }> {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
      include: { availabilitySlots: true },
    });
    if (!profile) {
      throw new NotFoundException('Tennis profile not found.');
    }

    const cards: HomeCard[] = [];

    const level = profile.userSelectedLevel ?? profile.systemSuggestedLevel;
    if (level != null) {
      cards.push({
        id: 'level-summary',
        type: 'LEVEL_SUMMARY',
        priority: 10,
        title: `Level ${level.toFixed(1)} — ${labelForLevel(level)}`,
        body: 'This is where you stand today. You can adjust it any time from your profile.',
      });
    }

    if (profile.onboardingGoals.length > 0) {
      cards.push({
        id: 'goals-summary',
        type: 'GOALS_SUMMARY',
        priority: 20,
        title: 'Your goals',
        body: profile.onboardingGoals.join(' • '),
      });
    }

    const slotCount = profile.availabilitySlots.length;
    if (profile.formatPreference || profile.stylePreference || slotCount > 0) {
      const parts: string[] = [];
      if (profile.formatPreference) {
        parts.push(`You're up for ${FORMAT_LABEL[profile.formatPreference]}`);
      }
      if (profile.stylePreference) {
        parts.push(`playing ${STYLE_LABEL[profile.stylePreference]}`);
      }
      let body = parts.length > 0 ? `${parts.join(', ')}.` : '';
      if (slotCount > 0) {
        body += `${body ? ' ' : ''}You're generally free ${slotCount} time ${slotCount === 1 ? 'slot' : 'slots'} a week.`;
      }
      cards.push({
        id: 'play-style-summary',
        type: 'PLAY_STYLE_SUMMARY',
        priority: 30,
        title: 'Your play style',
        body,
      });
    }

    if (
      profile.padelInterest === PadelInterestValue.YES ||
      profile.padelInterest === PadelInterestValue.WANT_TO_LEARN
    ) {
      cards.push({
        id: 'padel-teaser',
        type: 'PADEL_TEASER',
        priority: 40,
        title: 'Padel is coming to Drift',
        body:
          profile.padelInterest === PadelInterestValue.WANT_TO_LEARN
            ? "You told us you'd like to learn Padel — we'll let you know the moment it's ready."
            : "You're into Padel too — we'll let you know the moment it's ready on Drift.",
      });
    }

    const skillProfile = await this.learning.getSkillProfile(userId);
    if (skillProfile.weakestSkill && skillProfile.recommendations.length > 0) {
      const top = skillProfile.recommendations[0];
      cards.push({
        id: 'development-recommendation',
        type: 'DEVELOPMENT_RECOMMENDATION',
        priority: 50,
        title: `Your ${SKILL_LABEL[skillProfile.weakestSkill] ?? skillProfile.weakestSkill.toLowerCase()} could use work`,
        body: `Try "${top.title}" — a ${top.type === 'DRILL' ? 'drill' : 'lesson'} to help you improve.`,
      });
    }

    if (cards.length === 0) {
      cards.push({
        id: 'empty-fallback',
        type: 'EMPTY_FALLBACK',
        priority: 0,
        title: "You're all caught up",
        body: "Here's what to try next.",
      });
    }

    cards.sort((a, b) => a.priority - b.priority);
    return { cards };
  }
}
