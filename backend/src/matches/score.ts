import { BadRequestException } from '@nestjs/common';
import { MatchSide } from '@prisma/client';

/**
 * Standard tennis scoring. A set is won at 6 games with a 2-game margin
 * (6-0..6-4), at 7-5, or at 7-6 after a tiebreak (first to 7 points, win by
 * 2). A match is best of 3 or best of 5 sets and ends as soon as one side has
 * won the majority of them.
 */
export interface SetScore {
  sideAGames: number;
  sideBGames: number;
  sideATiebreak?: number;
  sideBTiebreak?: number;
}

export const ALLOWED_BEST_OF = [3, 5] as const;
export const DEFAULT_BEST_OF = 3;

/** Throws unless the set is a finished, legal tennis set. */
export function assertValidSet(set: SetScore, setNumber: number): void {
  const { sideAGames: a, sideBGames: b } = set;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    throw new BadRequestException(`Set ${setNumber} has an invalid score.`);
  }
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  const hasTiebreak =
    set.sideATiebreak !== undefined || set.sideBTiebreak !== undefined;

  if ((hi === 6 && lo <= 4) || (hi === 7 && lo === 5)) {
    if (hasTiebreak) {
      throw new BadRequestException(
        `Set ${setNumber} (${a}-${b}) did not go to a tiebreak.`,
      );
    }
    return;
  }

  if (hi === 7 && lo === 6) {
    const { sideATiebreak: tbA, sideBTiebreak: tbB } = set;
    if (tbA === undefined || tbB === undefined) {
      throw new BadRequestException(
        `Set ${setNumber} (7-6) needs the tiebreak points.`,
      );
    }
    const winnerTb = a > b ? tbA : tbB;
    const loserTb = a > b ? tbB : tbA;
    if (winnerTb < 7 || winnerTb - loserTb < 2) {
      throw new BadRequestException(
        `Set ${setNumber}'s tiebreak (${tbA}-${tbB}) is not a valid finish.`,
      );
    }
    return;
  }

  throw new BadRequestException(
    `Set ${setNumber} (${a}-${b}) is not a valid tennis score.`,
  );
}

export function setWinner(set: SetScore): MatchSide {
  if (set.sideAGames !== set.sideBGames) {
    return set.sideAGames > set.sideBGames ? MatchSide.A : MatchSide.B;
  }
  throw new BadRequestException('Each set needs a winner.');
}

/**
 * Validates every set, enforces the best-of length (no sets after the match
 * is decided, none missing before it is) and returns the winning side.
 */
export function matchWinner(
  sets: SetScore[],
  bestOf: number = DEFAULT_BEST_OF,
): MatchSide {
  if (sets.length === 0) {
    throw new BadRequestException('Enter at least one set.');
  }
  if (sets.length > bestOf) {
    throw new BadRequestException(
      `A best-of-${bestOf} match has at most ${bestOf} sets.`,
    );
  }

  const setsToWin = Math.ceil(bestOf / 2);
  let aWins = 0;
  let bWins = 0;
  for (let i = 0; i < sets.length; i++) {
    if (aWins === setsToWin || bWins === setsToWin) {
      throw new BadRequestException(
        `The match was already decided before set ${i + 1}.`,
      );
    }
    assertValidSet(sets[i], i + 1);
    if (setWinner(sets[i]) === MatchSide.A) aWins++;
    else bWins++;
  }

  if (aWins < setsToWin && bWins < setsToWin) {
    throw new BadRequestException(
      `The match isn't finished: a side needs ${setsToWin} sets to win a best-of-${bestOf}.`,
    );
  }
  return aWins > bWins ? MatchSide.A : MatchSide.B;
}
