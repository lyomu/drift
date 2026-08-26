/**
 * Pure single-elimination bracket engine (Wave 6). No I/O — the service
 * persists what this returns. Draw size must be a power of two; byes fill
 * the first round so every seeded/player entry lands in round 2.
 *
 * Slots are numbered per round; round N+1 slot K is fed by the winners of
 * round N slots 2K and 2K+1.
 */

export interface BracketEntry {
  userId: string;
  seed?: number | null;
}

export interface BracketSlot {
  slotIndex: number;
  sideAUserId: string | null;
  sideBUserId: string | null;
  isBye: boolean;
}

export interface BracketRound {
  index: number; // 1 = first round
  slots: BracketSlot[];
}

export function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

/**
 * Standard seeded ordering (1 vs 8, 4 vs 5, 3 vs 6, 2 vs 7 for size 8) so
 * top seeds meet as late as possible. Unseeded entries fill remaining slots
 * in registration order, then byes absorb the rest.
 */
export function buildDraw(
  entries: BracketEntry[],
  drawSize: number,
): BracketRound[] {
  if (!isPowerOfTwo(drawSize)) {
    throw new Error(`drawSize must be a power of two, got ${drawSize}`);
  }
  if (entries.length < 2) {
    throw new Error('At least two entries are required.');
  }
  if (entries.length > drawSize) {
    throw new Error('More entries than draw slots.');
  }

  const seeded = entries
    .filter((e) => e.seed != null)
    .sort((a, b) => a.seed! - b.seed!);
  const unseeded = entries.filter((e) => e.seed == null);

  // `order` is the classic position→seed map: pos1vpos2 = 1v8, pos3vpos4 =
  // 4v5, pos5vpos6 = 2v7, pos7vpos8 = 3v6.
  const order: number[] = [1, 2];
  while (order.length < drawSize) {
    const sum = order.length * 2 + 1;
    const next: number[] = [];
    for (const pos of order) {
      next.push(pos);
      next.push(sum - pos);
    }
    order.splice(0, order.length, ...next);
  }

  const posToEntry: (BracketEntry | null | 'BYE')[] = order.map(
    (seedNo) => seeded.find((e) => e.seed === seedNo) ?? null,
  );
  let cursor = 0;
  for (let i = 0; i < drawSize; i++) {
    if (posToEntry[i] === null && cursor < unseeded.length)
      posToEntry[i] = unseeded[cursor++];
    if (posToEntry[i] === null) posToEntry[i] = 'BYE';
  }

  // Round 1 pairs; a slot paired with a BYE auto-advances (isBye fixture).
  const slots: (BracketEntry | null | 'BYE')[] = posToEntry.map((s) => s);
  const rounds: BracketRound[] = [];
  const first: BracketSlot[] = [];
  for (let i = 0; i < drawSize; i += 2) {
    const a = slots[i];
    const b = slots[i + 1];
    if (a === 'BYE' && b === 'BYE') {
      first.push({
        slotIndex: i / 2,
        sideAUserId: null,
        sideBUserId: null,
        isBye: true,
      });
    } else if (b === 'BYE') {
      first.push({
        slotIndex: i / 2,
        sideAUserId: (a as BracketEntry).userId,
        sideBUserId: null,
        isBye: true,
      });
    } else if (a === 'BYE') {
      first.push({
        slotIndex: i / 2,
        sideAUserId: (b as BracketEntry).userId,
        sideBUserId: null,
        isBye: true,
      });
    } else {
      first.push({
        slotIndex: i / 2,
        sideAUserId: (a as BracketEntry).userId,
        sideBUserId: (b as BracketEntry).userId,
        isBye: false,
      });
    }
  }
  rounds.push({ index: 1, slots: first });

  // Later rounds: empty slots to be filled as winners advance.
  let size = drawSize / 2;
  let index = 2;
  while (size >= 2) {
    const slotsNext: BracketSlot[] = [];
    for (let i = 0; i < size; i += 2) {
      slotsNext.push({
        slotIndex: i / 2,
        sideAUserId: null,
        sideBUserId: null,
        isBye: false,
      });
    }
    rounds.push({ index, slots: slotsNext });
    size /= 2;
    index++;
  }
  return rounds;
}

/** Which next-round slot feeds from (roundIndex, slotIndex). */
export function nextSlot(
  roundIndex: number,
  slotIndex: number,
): { roundIndex: number; slotIndex: number } {
  return { roundIndex: roundIndex + 1, slotIndex: Math.floor(slotIndex / 2) };
}

/** The opponent side letter in the current fixture for the given winner. */
export function winnerSide(
  fixture: { sideAUserId: string | null; sideBUserId: string | null },
  winnerUserId: string,
): 'A' | 'B' {
  if (fixture.sideAUserId === winnerUserId) return 'A';
  if (fixture.sideBUserId === winnerUserId) return 'B';
  throw new Error('Winner is not a participant of this fixture.');
}
