/**
 * The site header is a "rounds rail": brand mark, anchor chips for each
 * round (the page's structural metaphor), and the primary CTA.
 */
import { rounds } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]"
          aria-label="Drift Tennis — home"
        >
          <BallMark />
          Drift&nbsp;Tennis
        </a>

        <nav aria-label="Rounds" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-2">
            {rounds.map((round) => (
              <li key={round.id}>
                <a className="rail-chip" href={`#${round.id}`}>
                  {round.name}
                </a>
              </li>
            ))}
            <li>
              <a className="rail-chip" href="#clubs">
                For clubs
              </a>
            </li>
          </ul>
        </nav>

        <a
          href="#get-the-app"
          className="btn-primary ml-auto lg:ml-2 !px-4 !py-2 text-sm"
        >
          Get the app
        </a>
      </div>

      {/* The rounds rail carries wayfinding on every screen — on phones it
          becomes a horizontally scrollable chip row (the season structure
          must stay visible on the primary device). */}
      <nav aria-label="Rounds" className="border-t border-[var(--color-border)] lg:hidden">
        <ul className="flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
          {rounds.map((round) => (
            <li key={round.id} className="shrink-0">
              <a className="rail-chip" href={`#${round.id}`}>
                {round.label} · {round.name}
              </a>
            </li>
          ))}
          <li className="shrink-0">
            <a className="rail-chip" href="#clubs">
              For clubs
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}

/** A small tennis-ball mark: brand-light disc, primary seam curves. */
export function BallMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="13" fill="var(--color-primary)" />
      <path
        d="M4.5 6.5c5 3 5 12 0 15M23.5 6.5c-5 3-5 12 0 15"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
