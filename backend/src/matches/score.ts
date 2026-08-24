import { BadRequestException } from '@nestjs/common';
import { MatchSide } from '@prisma/client';

/**
 * No ITF-style set-legality validation (win-by-2, valid tiebreak scores) —
 * scores are trusted as entered, same discipline as not over-building
 * beyond what §4.3 actually asks for.
 */
export interface SetScore {
  sideAGames: number;
  sideBGames: number;
  sideATiebreak?: number;
  sideBTiebreak?: number;
}

export function setWinner(set: SetScore): MatchSide {
  if (set.sideAGames !== set.sideBGames) {
    return set.sideAGames > set.sideBGames ? MatchSide.A : MatchSide.B;
  }
  if (
    set.sideATiebreak !== undefined &&
    set.sideBTiebreak !== undefined &&
    set.sideATiebreak !== set.sideBTiebreak
  ) {
    return set.sideATiebreak > set.sideBTiebreak ? MatchSide.A : MatchSide.B;
  }
  throw new BadRequestException('Each set needs a winner.');
}

/** The side that won more sets. Throws on a set count that ties. */
export function matchWinner(sets: SetScore[]): MatchSide {
  if (sets.length === 0) {
    throw new BadRequestException('Enter at least one set.');
  }
  let aWins = 0;
  let bWins = 0;
  for (const set of sets) {
    if (setWinner(set) === MatchSide.A) aWins++;
    else bWins++;
  }
  if (aWins === bWins) {
    throw new BadRequestException('The match needs an overall winner.');
  }
  return aWins > bWins ? MatchSide.A : MatchSide.B;
}
