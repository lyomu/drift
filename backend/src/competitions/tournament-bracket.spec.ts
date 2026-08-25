import { BracketEntry, BracketRound, buildDraw, isPowerOfTwo } from './tournament-bracket';

describe('tournament-bracket', () => {
  const eight = (ids: string[], seeds?: Record<string, number>) =>
    ids.map((userId) => ({ userId, seed: seeds?.[userId] ?? null })) as BracketEntry[];

  it('rejects a draw size that is not a power of two', () => {
    expect(() => buildDraw(eight(['a', 'b']), 6)).toThrow(/power of two/);
  });

  it('requires at least two entries', () => {
    expect(() => buildDraw(eight(['a']), 4)).toThrow(/At least two/);
  });

  it('rejects more entries than slots', () => {
    expect(() => buildDraw(eight(['a', 'b', 'c', 'd', 'e']), 4)).toThrow(/More entries/);
  });

  it('builds a full 8-draw: 4 first-round fixtures, then QF/SF/F placeholders', () => {
    const rounds = buildDraw(
      eight(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 }),
      8,
    );
    expect(rounds).toHaveLength(3);
    expect(rounds[0].slots).toHaveLength(4);
    expect(rounds[1].slots).toHaveLength(2);
    expect(rounds[2].slots).toHaveLength(1);
    // Seed 1 vs seed 8 in slot 0; seed 4 vs 5 in slot 1 (standard order).
    expect(rounds[0].slots[0]).toMatchObject({ sideAUserId: 'a', sideBUserId: 'h', isBye: false });
    expect(rounds[0].slots[1]).toMatchObject({ sideAUserId: 'd', sideBUserId: 'e' });
    // Bottom half: 2v7 then 3v6 — halves stay seed-separated for the SFs.
    expect(rounds[0].slots[2]).toMatchObject({ sideAUserId: 'b', sideBUserId: 'g' });
    expect(rounds[0].slots[3]).toMatchObject({ sideAUserId: 'c', sideBUserId: 'f' });
  });

  it('converts unpaired slots into byes that carry the paired player', () => {
    // 5 players into an 8 draw → 3 byes.
    const rounds = buildDraw(eight(['a', 'b', 'c', 'd', 'e'], { a: 1, b: 2, c: 3, d: 4 }), 8);
    const byes = rounds[0].slots.filter((s) => s.isBye);
    expect(byes).toHaveLength(3);
    // Every bye fixture carries exactly one real player.
    for (const bye of byes) {
      expect([bye.sideAUserId, bye.sideBUserId].filter(Boolean)).toHaveLength(1);
    }
    // No real-vs-real fixture has a bye flag.
    const reals = rounds[0].slots.filter((s) => !s.isBye);
    for (const r of reals) {
      expect(r.sideAUserId).not.toBeNull();
      expect(r.sideBUserId).not.toBeNull();
    }
  });

  it('isPowerOfTwo guards the boundary', () => {
    expect(isPowerOfTwo(2)).toBe(true);
    expect(isPowerOfTwo(32)).toBe(true);
    expect(isPowerOfTwo(1)).toBe(false);
    expect(isPowerOfTwo(6)).toBe(false);
  });
});
