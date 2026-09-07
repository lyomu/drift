/**
 * One "round" section: a tabular round number and scoreline-style heading
 * on the left rail, the round's fixtures as DriftCards on the right.
 * Structure and copy are data-driven (lib/content.ts) so the five rounds
 * can't drift apart.
 */
import type { rounds as RoundsData } from "@/lib/content";

type Round = (typeof RoundsData)[number];

export function RoundSection({ round, index }: { round: Round; index: number }) {
  return (
    <section
      id={round.id}
      aria-labelledby={`${round.id}-heading`}
      className={`mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 lg:py-20 ${
        index % 2 === 1 ? "bg-[var(--color-surface)]" : ""
      }`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-16">
          <div>
            <p className="tabular text-5xl font-bold text-[var(--color-primary)]">
              R{index + 1}
            </p>
            <h2
              id={`${round.id}-heading`}
              className="court-rule mt-3 pb-2 text-3xl font-bold"
            >
              {round.name}
            </h2>
            <p className="mt-6 text-lg font-semibold">{round.tagline}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {round.intro}
            </p>
          </div>

          <ul className="flex flex-col gap-4" role="list">
            {round.fixtures.map((fixture) => (
              <li
                key={fixture.title}
                className="drift-card drift-card-interactive p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold">{fixture.title}</h3>
                  <span className={`badge ${fixture.badge.tone}`}>
                    {fixture.badge.text}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-[var(--color-text-secondary)]">
                  {fixture.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** The padel aside sits after Round 5 — additive by design, never co-branded. */
export function PadelAside({ aside }: { aside: { title: string; body: string } }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-label="Padel">
      <div className="drift-card flex flex-col gap-3 bg-[var(--color-primary-light)]/60 p-6 sm:flex-row sm:items-center sm:gap-6">
        <span className="badge badge-neutral shrink-0">Opt-in · My Sports</span>
        <div>
          <h2 className="text-xl font-bold">{aside.title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {aside.body}
          </p>
        </div>
      </div>
    </section>
  );
}
