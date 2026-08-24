/**
 * Points system — documented decision, same class as `matches/rating.ts`'s
 * Elo formula: nothing in Doc 6 specifies one. Win = 3, loss = 0, and a
 * neutral (unplayed/system-walkover) fixture contributes 0 to both sides —
 * it's a no-result, not a loss. Rank by points desc, then wins desc, then
 * display name, for a fully deterministic order with no head-to-head
 * sub-table this phase.
 */
export const WIN_POINTS = 3;

export interface PlayerRecord {
  userId: string;
  displayName: string;
  wins: number;
  losses: number;
}

export interface StandingRow {
  userId: string;
  displayName: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
}

export function computeStandings(records: PlayerRecord[]): StandingRow[] {
  const withPoints = records.map((r) => ({
    ...r,
    points: r.wins * WIN_POINTS,
  }));

  const sorted = withPoints.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      a.displayName.localeCompare(b.displayName),
  );

  return sorted.map((r, i) => ({
    userId: r.userId,
    displayName: r.displayName,
    rank: i + 1,
    points: r.points,
    wins: r.wins,
    losses: r.losses,
  }));
}
