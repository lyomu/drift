import { generateRounds } from './round-robin';

describe('round-robin', () => {
  it('pairs every player exactly once per round with an even count', () => {
    const players = ['a', 'b', 'c', 'd'];
    const rounds = generateRounds(players, 3);

    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      const seen = round.pairs.flatMap(([a, b]) => (b ? [a, b] : [a]));
      expect(new Set(seen)).toEqual(new Set(players));
      expect(round.pairs).toHaveLength(2);
    }
  });

  it('gives exactly one bye per round with an odd count', () => {
    const players = ['a', 'b', 'c'];
    const rounds = generateRounds(players, 3);

    for (const round of rounds) {
      const byes = round.pairs.filter(([, b]) => b === null);
      expect(byes).toHaveLength(1);
      const seen = round.pairs.flatMap(([a, b]) => (b ? [a, b] : [a]));
      expect(new Set(seen)).toEqual(new Set(players));
    }
  });

  it('never repeats a pairing within one full round-robin cycle', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'];
    const rounds = generateRounds(players, 5); // n - 1 = 5 unique rounds

    const seenPairs = new Set<string>();
    for (const round of rounds) {
      for (const [a, b] of round.pairs) {
        if (!b) continue;
        const key = [a, b].sort().join('-');
        expect(seenPairs.has(key)).toBe(false);
        seenPairs.add(key);
      }
    }
  });

  it('repeats the schedule when more rounds are requested than n - 1', () => {
    const players = ['a', 'b'];
    const rounds = generateRounds(players, 3);

    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      expect(round.pairs).toEqual([['a', 'b']]);
    }
  });

  it('returns nothing for fewer than two players', () => {
    expect(generateRounds(['a'], 3)).toEqual([]);
    expect(generateRounds([], 3)).toEqual([]);
  });

  it('assigns sequential 1-based round indices', () => {
    const rounds = generateRounds(['a', 'b', 'c', 'd'], 3);
    expect(rounds.map((r) => r.index)).toEqual([1, 2, 3]);
  });
});
