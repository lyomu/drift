/**
 * A single numeric "competition level" for a player, used to seed league
 * fixtures and tournament draws so players face the nearest-level opponents
 * first (M15). Mirrors the read precedence the rest of the app uses for a
 * player's level: the level they picked for themselves wins over the
 * system-suggested one (foundation/06-domain-technical-architecture.md §2's
 * "never merge the two" rule — this only *reads* them, in order). A player
 * with neither sorts to the bottom at 0 rather than being dropped.
 */
export interface LevelSource {
  userSelectedLevel: number | null;
  systemSuggestedLevel: number | null;
}

export function playerCompetitionLevel(profile?: LevelSource | null): number {
  return profile?.userSelectedLevel ?? profile?.systemSuggestedLevel ?? 0;
}
