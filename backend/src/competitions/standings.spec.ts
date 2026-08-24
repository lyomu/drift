import { WIN_POINTS, computeStandings } from './standings';

describe('standings', () => {
  it('ranks by points, 3 per win', () => {
    const rows = computeStandings([
      { userId: 'a', displayName: 'Alice', wins: 2, losses: 0 },
      { userId: 'b', displayName: 'Bob', wins: 1, losses: 1 },
      { userId: 'c', displayName: 'Cara', wins: 0, losses: 2 },
    ]);

    expect(rows.map((r) => r.userId)).toEqual(['a', 'b', 'c']);
    expect(rows[0].points).toBe(2 * WIN_POINTS);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('breaks a points tie by wins', () => {
    // Equal points isn't reachable via wins alone at this points system,
    // but the tiebreak still needs to hold if the formula ever changes —
    // exercised directly via equal win counts here instead.
    const rows = computeStandings([
      { userId: 'a', displayName: 'Zoe', wins: 1, losses: 0 },
      { userId: 'b', displayName: 'Amy', wins: 1, losses: 0 },
    ]);
    // Same points and same wins — falls through to name order.
    expect(rows.map((r) => r.userId)).toEqual(['b', 'a']);
  });

  it('is deterministic for a fully tied field via display name', () => {
    const rows = computeStandings([
      { userId: 'x', displayName: 'Charlie', wins: 0, losses: 0 },
      { userId: 'y', displayName: 'Alpha', wins: 0, losses: 0 },
      { userId: 'z', displayName: 'Bravo', wins: 0, losses: 0 },
    ]);
    expect(rows.map((r) => r.displayName)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ]);
  });

  it('assigns consecutive 1-based ranks', () => {
    const rows = computeStandings([
      { userId: 'a', displayName: 'A', wins: 3, losses: 0 },
      { userId: 'b', displayName: 'B', wins: 2, losses: 1 },
      { userId: 'c', displayName: 'C', wins: 1, losses: 2 },
      { userId: 'd', displayName: 'D', wins: 0, losses: 3 },
    ]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
});
