import { MatchFormat, MatchResultStatus, MatchSport } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { labelForLevel } from '../common/level-label.util';

export interface FormatStats {
  rating: number | null;
  ratingLabel: string | null;
  wins: number;
  losses: number;
}

export interface PlayerStats {
  singles: FormatStats;
  doubles: FormatStats;
  /** Most recent first, capped at 10 — every settled format combined. */
  recentForm: ('W' | 'L')[];
}

const RECENT_FORM_LIMIT = 10;

/**
 * Shared by `results.service.ts` (a player's own stats) and
 * `players/players.service.ts` (another player's profile) — one
 * computation, so the two views can't drift. Not connection-gated: ratings
 * and stats aren't in Doc 6 §4's privacy-sensitive list the way skill
 * breakdown is, matching the precedent M5 already set.
 *
 * `sport` defaults to TENNIS so every pre-M13 call site keeps its exact
 * existing behavior; Padel Match History & Stats (M13) passes `PADEL`.
 */
export async function getPlayerStats(
  prisma: PrismaService,
  userId: string,
  sport: MatchSport = MatchSport.TENNIS,
): Promise<PlayerStats> {
  const [profile, participations] = await Promise.all([
    sport === MatchSport.PADEL
      ? prisma.padelProfile.findUnique({ where: { userId } })
      : prisma.tennisProfile.findUnique({ where: { userId } }),
    prisma.matchParticipant.findMany({
      where: {
        userId,
        match: { sport, result: { status: MatchResultStatus.CONFIRMED } },
      },
      include: { match: { include: { result: true } } },
      orderBy: { match: { updatedAt: 'desc' } },
    }),
  ]);

  const singles: FormatStats = {
    rating: profile?.singlesRating ?? null,
    ratingLabel:
      profile?.singlesRating != null
        ? labelForLevel(profile.singlesRating)
        : null,
    wins: 0,
    losses: 0,
  };
  const doubles: FormatStats = {
    rating: profile?.doublesRating ?? null,
    ratingLabel:
      profile?.doublesRating != null
        ? labelForLevel(profile.doublesRating)
        : null,
    wins: 0,
    losses: 0,
  };
  const recentForm: ('W' | 'L')[] = [];

  for (const participation of participations) {
    const result = participation.match.result;
    // A walkover confirmed "in favour of neither player" has no winningSide
    // — it doesn't count toward either bucket.
    if (!result || !result.winningSide) continue;

    const won = result.winningSide === participation.side;
    const bucket =
      participation.match.format === MatchFormat.DOUBLES ? doubles : singles;
    if (won) bucket.wins++;
    else bucket.losses++;

    if (recentForm.length < RECENT_FORM_LIMIT) {
      recentForm.push(won ? 'W' : 'L');
    }
  }

  return { singles, doubles, recentForm };
}
