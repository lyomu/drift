import { canChallenge, resolvePositions } from './ladder-rules';

describe('ladder-rules', () => {
  it('allows challenging only within range and strictly above', () => {
    expect(canChallenge(5, 4, 2)).toBe(true);
    expect(canChallenge(5, 3, 2)).toBe(true);
    expect(canChallenge(5, 2, 2)).toBe(false); // out of range
    expect(canChallenge(5, 5, 2)).toBe(false); // same rung
    expect(canChallenge(3, 5, 2)).toBe(false); // defender below challenger
  });

  it('an upset swaps the rungs', () => {
    const r = resolvePositions(
      { userId: 'challenger', position: 6 },
      { userId: 'defender', position: 4 },
      'challenger',
    );
    expect(r).toMatchObject({
      positionsSwapped: true,
      winnerUserId: 'challenger',
      winnerPosition: 4,
      loserUserId: 'defender',
      loserPosition: 6,
    });
  });

  it('a defender win holds the positions', () => {
    const r = resolvePositions(
      { userId: 'challenger', position: 6 },
      { userId: 'defender', position: 4 },
      'defender',
    );
    expect(r).toMatchObject({
      positionsSwapped: false,
      winnerUserId: 'defender',
      winnerPosition: 4,
      loserUserId: 'challenger',
      loserPosition: 6,
    });
  });
});
