/**
 * Standard circle-method single round-robin — nothing in the foundation
 * docs specifies a pairing algorithm, so this is a documented decision, same
 * class as `matches/rating.ts`'s Elo formula. One player is fixed, the rest
 * rotate around it each round; an odd player count gets a `null` bye slot
 * padded in so every round divides evenly.
 *
 * A full round-robin only has `n - 1` distinct rounds. If the league is
 * configured for more rounds than that, the schedule repeats from the top
 * (a double round-robin, etc.) — side assignment isn't swapped on repeat
 * since there's no tennis "home advantage" to balance for.
 */
export interface RoundPairing {
  index: number;
  pairs: Array<[string, string | null]>;
}

/**
 * Reorders a level-sorted list so the circle method's round-1 pairing
 * (position `i` vs position `n-1-i`) lands *adjacent* seeds against each
 * other — i.e. round 1 becomes (s0 v s1), (s2 v s3), (s4 v s5)… so players
 * meet their nearest level first (M15). Pass the result straight into
 * `generateRounds`. First half takes the even-indexed seeds, second half
 * the odd-indexed seeds reversed. Verified by hand for n = 4 and n = 6.
 */
export function foldForNearestSeed<T>(seeded: T[]): T[] {
  const evens: T[] = [];
  const odds: T[] = [];
  seeded.forEach((item, i) => (i % 2 === 0 ? evens : odds).push(item));
  return [...evens, ...odds.reverse()];
}

export function generateRounds(
  playerIds: string[],
  roundCount: number,
): RoundPairing[] {
  if (playerIds.length < 2 || roundCount < 1) {
    return [];
  }

  const players: (string | null)[] = [...playerIds];
  if (players.length % 2 !== 0) {
    players.push(null);
  }
  const n = players.length;
  const uniqueRounds = n - 1;

  const schedule: Array<Array<[string, string | null]>> = [];
  const rotating = players.slice(1);

  for (let r = 0; r < uniqueRounds; r++) {
    const arrangement = [players[0], ...rotating];
    const pairs: Array<[string, string | null]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arrangement[i];
      const b = arrangement[n - 1 - i];
      if (a === null && b === null) continue;
      if (a === null) {
        pairs.push([b as string, null]);
      } else {
        pairs.push([a, b]);
      }
    }
    schedule.push(pairs);
    // Rotate everyone except the fixed first player.
    rotating.unshift(rotating.pop()!);
  }

  const rounds: RoundPairing[] = [];
  for (let i = 0; i < roundCount; i++) {
    rounds.push({ index: i + 1, pairs: schedule[i % uniqueRounds] });
  }
  return rounds;
}
