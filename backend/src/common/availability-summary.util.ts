import { TimeBlock } from '@prisma/client';

export interface AvailabilitySlotLike {
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  timeBlock: TimeBlock;
}

const BLOCK_LABEL: Record<TimeBlock, string> = {
  MORNING: 'mornings',
  AFTERNOON: 'afternoons',
  EVENING: 'evenings',
};

const isWeekend = (dayOfWeek: number) => dayOfWeek === 0 || dayOfWeek === 6;

/**
 * Collapses availability rows into the coarse phrasing discovery is allowed
 * to expose — "usually free weekend mornings". The full calendar is never
 * public (`foundation/06-domain-technical-architecture.md` §4); detailed
 * slots are connections-only.
 */
export function availabilitySummary(
  slots: AvailabilitySlotLike[],
): string | null {
  if (slots.length === 0) return null;

  const weekend = slots.filter((s) => isWeekend(s.dayOfWeek));
  const weekday = slots.filter((s) => !isWeekend(s.dayOfWeek));

  let dayPart: string;
  if (weekend.length > 0 && weekday.length === 0) {
    dayPart = 'weekend';
  } else if (weekday.length > 0 && weekend.length === 0) {
    dayPart = 'weekday';
  } else {
    dayPart = '';
  }

  // The most common time block across the slots that matched `dayPart`.
  const relevant =
    dayPart === 'weekend' ? weekend : dayPart === 'weekday' ? weekday : slots;
  const counts = new Map<TimeBlock, number>();
  for (const slot of relevant) {
    counts.set(slot.timeBlock, (counts.get(slot.timeBlock) ?? 0) + 1);
  }

  const blocks = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const topCount = blocks[0][1];
  const tied = blocks.filter(([, count]) => count === topCount);

  // No single dominant time of day — stay vague rather than pick arbitrarily.
  const blockPart =
    tied.length > 1 ? 'most times of day' : BLOCK_LABEL[blocks[0][0]];

  return dayPart
    ? `Usually free ${dayPart} ${blockPart}`
    : `Usually free ${blockPart}`;
}
