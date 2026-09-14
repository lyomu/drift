/**
 * The site header: brand mark, section links, the language switcher, and the
 * primary CTA.
 *
 * Navigation is plain underlined text, not pills. In this design system a
 * pill means a filter or a status (`.badge`, the old rail chip), so pilled
 * nav items read as a row of chips rather than as somewhere to go.
 *
 * `minimal` drops the rail and the CTA entirely. The waitlist and legal
 * pages use it: their anchors would point at sections that do not exist on
 * those routes, and a conversion page should not offer five ways to leave.
 * The language switcher stays even in the minimal variant: picking up the
 * wrong language must always have a visible way out.
 *
 * `locale` defaults to English because the legal routes (English-only, no
 * locale segment) render this header without knowing a locale.
 */
import Link from "next/link";

import { LocaleSwitcher } from "./locale-switcher";
import { getDictionary, legalLinks } from "@/lib/content";
import { localeHref, type Locale } from "@/lib/locales";

export function SiteHeader({
  locale = "en",
  minimal = false,
}: {
  locale?: Locale;
  minimal?: boolean;
}) {
  const t = getDictionary(locale);

  if (minimal) {
    return (
      <header className="header-enter border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={localeHref(locale, "/")}
            className="brand-link flex shrink-0 items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]"
            aria-label="Drift Tennis, home"
          >
            <BallMark />
            Drift&nbsp;Tennis
          </Link>
          <div className="flex shrink-0 items-center gap-5">
            <LocaleSwitcher current={locale} />
            <Link
              href={localeHref(locale, "/")}
              className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary-dark)]"
            >
              {t.header.backToSite}
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="header-enter sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a
          href="#top"
          className="brand-link flex shrink-0 items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]"
          aria-label="Drift Tennis, home"
        >
          <BallMark />
          Drift&nbsp;Tennis
        </a>

        <nav aria-label={t.header.sectionsAria} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-7">
            {t.chapters.map((chapter) => (
              <li key={chapter.id}>
                <a className="nav-link" href={`#${chapter.id}`}>
                  {chapter.title}
                </a>
              </li>
            ))}
            <li>
              <a className="nav-link" href="#padel">
                {t.header.padel}
              </a>
            </li>
            <li>
              <a className="nav-link" href="#clubs">
                {t.header.forClubs}
              </a>
            </li>
            <li>
              <details className="nav-disclosure">
                <summary className="nav-link cursor-pointer">{t.header.legal}</summary>
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
          href={localeHref(locale, "/waitlist")}
          className="btn-primary ml-auto !px-4 !py-2 text-sm lg:ml-6 xl:ml-14"
        >
          {t.header.joinCta}
        </Link>
        <div className="hidden lg:block">
          <LocaleSwitcher current={locale} />
        </div>
      </div>

      {/* Wayfinding stays visible on the primary device — on phones the rail
          becomes a horizontally scrollable chip row. */}
      <nav
        aria-label={t.header.sectionsAria}
        className="border-t border-[var(--color-border)] lg:hidden"
      >
        <ul className="flex gap-6 overflow-x-auto px-4 py-2.5 sm:px-6">
          {t.chapters.map((chapter) => (
            <li key={chapter.id} className="shrink-0">
              <a className="nav-link" href={`#${chapter.id}`}>
                {chapter.title}
              </a>
            </li>
          ))}
          <li className="shrink-0">
            <a className="nav-link" href="#padel">
              {t.header.padel}
            </a>
          </li>
          <li className="shrink-0">
            <a className="nav-link" href="#clubs">
              {t.header.forClubs}
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
      className="brand-mark"
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
