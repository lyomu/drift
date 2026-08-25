/**
 * Pure ladder rules (Wave 6). A ladder is an ordered rung list; a member
 * may challenge anyone within `range` rungs above them. On a confirmed
 * result: an upset swaps the two rungs; a defender win (higher rung kept)
 * leaves positions untouched. Either way the winner's win/loss counters
 * move.
 */

export interface LadderPositionPair {
  challengerPosition: number;
  defenderPosition: number;
}

export function canChallenge(
  challengerPosition: number,
  defenderPosition: number,
  range: number,
): boolean {
  // Defender must be ABOVE the challenger (lower rung number) and within range.
  return defenderPosition < challengerPosition && challengerPosition - defenderPosition <= range;
}

export interface PositionSwap {
  winnerUserId: string;
  loserUserId: string;
  winnerPosition: number;
  loserPosition: number;
  positionsSwapped: boolean;
}

/**
 * Upset (lower-ranked challenger beats higher-ranked defender) → the two
 * swap rungs. Otherwise positions hold.
 */
export function resolvePositions(
  challenger: { userId: string; position: number },
  defender: { userId: string; position: number },
  winnerUserId: string,
): PositionSwap {
  const upset = winnerUserId === challenger.userId;
  // The rungs themselves don't move — on an upset the two OWNERS exchange
  // them. So the winner always ends on the defender's rung and the loser on
  // the challenger's, whether that's a swap or a hold.
  return {
    winnerUserId,
    loserUserId: upset ? defender.userId : challenger.userId,
    winnerPosition: defender.position,
    loserPosition: challenger.position,
    positionsSwapped: upset,
  };
}
