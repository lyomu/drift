/**
 * Illustrative app UI, built from divs in the site's own component grammar.
 *
 * These are NOT screenshots. No real marketing screenshots exist yet
 * (PRODUCT.md, "Evidence on Hand"), so every surface that renders one of
 * these must carry a visible "Illustrative" label — DESIGN.md rule 1. The
 * cards show real product states (a scheduled fixture, an incoming
 * challenge, a skill profile); the names and numbers in them are invented
 * and are never presented as user data.
 *
 * Extracted from the old matchday hero in the 2026-09 redesign so the
 * chapters can reuse them inside device frames.
 */

export function Avatar({
  name,
  tone,
}: {
  name: string;
  tone: "light" | "raised";
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        tone === "light"
          ? "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]"
          : "bg-[var(--color-neutral-surface)] text-[var(--color-text-secondary)]"
      }`}
    >
      {initials}
    </span>
  );
}

export function FixtureCard() {
  return (
    <div className="drift-card w-full p-5">
      <div className="flex items-center justify-between">
        <span className="badge badge-primary">Up next · Round 3</span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          Doubles
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name="Sarah W." tone="light" />
          <div>
            <p className="text-sm font-semibold">Sarah &amp; Brian</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Rating 4.2
            </p>
          </div>
        </div>
        <span className="tabular text-lg font-bold text-[var(--color-text-secondary)]">
          vs
        </span>
        <div className="flex flex-row-reverse items-center gap-3">
          <Avatar name="Kevin M." tone="raised" />
          <div className="text-right">
            <p className="text-sm font-semibold">Kevin &amp; Grace</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Rating 3.8
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-[var(--color-border)] pt-3">
        <div className="flex items-center justify-between">
          <p className="tabular text-sm font-semibold">Sat · 16:00</p>
          <span className="badge badge-success">✓ Time accepted</span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Club court suggested · 2 of 3 proposals settled
        </p>
      </div>
    </div>
  );
}

export function ChallengeCard() {
  return (
    <div className="drift-card w-full p-4">
      <div className="flex items-center justify-between">
        <span className="badge badge-warning">Incoming challenge</span>
        <span className="text-xs text-[var(--color-text-secondary)]">2h</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name="Daniel K." tone="raised" />
        <div>
          <p className="text-sm font-semibold">Daniel challenged you</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Proposed: Sun 10:00 or 17:00
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="btn-primary !flex-1 !px-3 !py-1.5 text-xs">
          Accept
        </span>
        <span className="btn-secondary !flex-1 !px-3 !py-1.5 text-xs">
          Propose time
        </span>
      </div>
    </div>
  );
}

/**
 * The seven skill pillars the app actually blends from assessment baseline
 * and logged practice. The percentages are illustrative.
 */
const PILLARS = [
  { name: "Serve", value: 46 },
  { name: "Forehand", value: 72 },
  { name: "Backhand", value: 38 },
  { name: "Return", value: 61 },
  { name: "Net", value: 44 },
  { name: "Movement", value: 68 },
  { name: "Match play", value: 55 },
] as const;

export function SkillProfileCard() {
  return (
    <div className="drift-card w-full p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Skill profile</p>
        <span className="badge badge-primary tabular">Rating 3.5</span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {PILLARS.map((pillar) => {
          const weakest = pillar.name === "Backhand";
          return (
            <li key={pillar.name} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-[var(--color-text-secondary)]">
                {pillar.name}
              </span>
              <span
                aria-hidden="true"
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-neutral-surface)]"
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${pillar.value}%`,
                    background: weakest
                      ? "var(--color-warning)"
                      : "var(--color-primary)",
                  }}
                />
              </span>
              <span className="tabular w-8 shrink-0 text-right text-xs font-semibold text-[var(--color-text-secondary)]">
                {pillar.value}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 rounded-xl bg-[var(--color-warning-surface)] p-3">
        <p className="text-xs font-semibold text-[#b45309]">
          Practise next: backhand
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          3 drills matched to your level
        </p>
      </div>
    </div>
  );
}

/**
 * Small caption used wherever illustrative UI appears. Keeping it one
 * component means the label can never drift out of sync between sections.
 */
export function IllustrativeLabel({
  className = "",
  tone = "muted",
}: {
  className?: string;
  tone?: "muted" | "on-primary";
}) {
  return (
    <p
      className={`text-xs ${
        tone === "on-primary"
          ? "text-white/90"
          : "text-[var(--color-text-secondary)]"
      } ${className}`}
    >
      Illustrative app screens, not real player data.
    </p>
  );
}
