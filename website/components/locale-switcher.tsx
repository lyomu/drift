"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/locales";

const INITIALS: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
};

const NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};

/**
 * The visible language switcher. Auto-detection is a first guess, never a
 * decision: a device set to English belongs to a francophone all the time, so
 * every page carries this switcher in the header.
 *
 * URLs stay canonical per locale (English unprefixed, others prefixed), so the
 * switcher computes the sibling URL by swapping the locale prefix on the
 * current path. Rendered on locale pages only — the English-only legal routes
 * link back to the home page instead.
 *
 * The English link deliberately points at `/en...`, not the bare unprefixed
 * path. `proxy.ts` re-detects the locale on every request that isn't already
 * `/en`, `/fr`, or `/es` — landing on `/` while the `drift-locale` cookie
 * still says `fr` made the proxy read that stale cookie and bounce straight
 * back to `/fr`, so "switch to English" silently did nothing. `/en` is the
 * one path the proxy always treats as an explicit choice: it sets the cookie
 * to `en` first, then redirects to the canonical unprefixed URL.
 */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() ?? "/";
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Native <details> only closes on a second click of its own <summary> — a
  // click anywhere else on the page leaves it open. This is the standard
  // pattern for closing it on an outside click without a menu library.
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Strip this page's own prefix ("/fr", "/es") to get the page path; English
  // is canonical at the root and the rewritten English pages see the original
  // unprefixed path, so no stripping is needed there.
  const segments = pathname.split("/");
  const first = segments[1];
  const unprefixed =
    first === "fr" || first === "es"
      ? `/${segments.slice(2).join("/")}`.replace(/\/+$/, "") || "/"
      : pathname;
  const suffix = unprefixed === "/" ? "" : unprefixed;

  return (
    <details ref={detailsRef} className="nav-disclosure">
      {/* .nav-link is `display: inline-block` in globals.css, which beats
          Tailwind's `flex` utility class in the compiled stylesheet order —
          without the inline style below, EN and the chevron stack instead of
          sitting side by side. Inline style always wins, so it's the
          reliable fix rather than fighting the cascade with more classes. */}
      <summary
        className="nav-link cursor-pointer"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
      >
        <span aria-hidden="true">{INITIALS[current]}</span>
        <span className="sr-only">{NATIVE_NAMES[current]}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path
            d="m1 1 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      {/* .nav-menu's 13.75rem min-width fits "Legal"'s longer labels; a
          3-item initials list needs far less, so this overrides it inline
          rather than fighting the plain CSS rule's specificity. */}
      <nav aria-label="Language" className="nav-menu" style={{ minWidth: "5rem" }}>
        {LOCALES.map((locale) => {
          const href = locale === DEFAULT_LOCALE ? `/en${suffix}` : `/${locale}${suffix}`;
          return (
            <Link
              key={locale}
              href={href}
              hrefLang={locale}
              aria-current={locale === current ? "true" : undefined}
              className={locale === current ? "!text-[var(--color-primary-dark)]" : undefined}
            >
              {INITIALS[locale]}
              <span className="sr-only"> — {NATIVE_NAMES[locale]}</span>
            </Link>
          );
        })}
      </nav>
    </details>
  );
}
