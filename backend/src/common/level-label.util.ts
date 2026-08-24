/** Level→label thresholds, shared by the assessment result and the Home level-summary card. */
export function labelForLevel(level: number): string {
  return level < 2.5
    ? 'Beginner'
    : level < 4.0
      ? 'Foundational'
      : level < 5.5
        ? 'Intermediate'
        : 'Advanced';
}
