/**
 * The site header: brand mark, section links, and the primary CTA.
 *
 * Navigation is plain underlined text, not pills. In this design system a
 * pill means a filter or a status (`.badge`, the old rail chip), so pilled
 * nav items read as a row of chips rather than as somewhere to go.
 *
 * `minimal` drops the rail and the CTA entirely. The waitlist page uses it:
 * its anchors would point at sections that do not exist on that route, and a
 * conversion page should not offer five ways to leave.
 */
import Link from "next/link";

import { chapters, legalLinks } from "@/lib/content";

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  if (minimal) {
    return (
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]"
            aria-label="Drift Tennis, home"
          >
            <BallMark />
            Drift&nbsp;Tennis
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary-dark)]"
          >
            ← Back to the site
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]"
          aria-label="Drift Tennis, home"
        >
          <BallMark />
          Drift&nbsp;Tennis
        </a>

        <nav aria-label="Sections" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-7">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <a className="nav-link" href={`#${chapter.id}`}>
                  {chapter.title}
                </a>
              </li>
            ))}
            <li>
              <a className="nav-link" href="#padel">
                Padel
              </a>
            </li>
            <li>
              <a className="nav-link" href="#clubs">
                For clubs
              </a>
            </li>
            <li>
              <details className="nav-disclosure">
                <summary className="nav-link cursor-pointer">Legal</summary>
                <div className="nav-menu">
                  {legalLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </details>
            </li>
          </ul>
        </nav>

        <Link
          href="/waitlist"
          className="btn-primary ml-auto !px-4 !py-2 text-sm lg:ml-10 xl:ml-20"
        >
          Join the waitlist
        </Link>
      </div>

      {/* Wayfinding stays visible on the primary device — on phones the rail
          becomes a horizontally scrollable chip row. */}
      <nav
        aria-label="Sections"
        className="border-t border-[var(--color-border)] lg:hidden"
      >
        <ul className="flex gap-6 overflow-x-auto px-4 py-2.5 sm:px-6">
          {chapters.map((chapter) => (
            <li key={chapter.id} className="shrink-0">
              <a className="nav-link" href={`#${chapter.id}`}>
                {chapter.title}
              </a>
            </li>
          ))}
          <li className="shrink-0">
            <a className="nav-link" href="#padel">
              Padel
            </a>
          </li>
          <li className="shrink-0">
            <a className="nav-link" href="#clubs">
              For clubs
            </a>
          </li>
          {legalLinks.map((link) => (
            <li key={link.href} className="shrink-0">
              <Link className="nav-link" href={link.href}>
                {link.shortLabel}
              </Link>
            </li>
          ))}
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
