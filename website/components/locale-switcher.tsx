"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/locales";

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
 */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() ?? "/";

  // Strip this page's own prefix ("/fr", "/es") to get the page path; English
  // is canonical at the root and the rewritten English pages see the original
  // unprefixed path, so no stripping is needed there.
  const segments = pathname.split("/");
  const first = segments[1];
  const unprefixed =
    first === "fr" || first === "es"
      ? `/${segments.slice(2).join("/")}`.replace(/\/+$/, "") || "/"
      : pathname;

  return (
    <nav aria-label="Language" className="flex items-center gap-3">
      {LOCALES.map((locale) => {
        const href =
          locale === DEFAULT_LOCALE
            ? unprefixed || "/"
            : `/${locale}${unprefixed === "/" ? "" : unprefixed}`;
        return (
          <Link
            key={locale}
            href={href}
            hrefLang={locale}
            aria-current={locale === current ? "true" : undefined}
            className={
              locale === current
                ? "text-sm font-bold text-[var(--color-primary-dark)] underline decoration-2 underline-offset-4"
                : "text-sm font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary-dark)]"
            }
          >
            {NATIVE_NAMES[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
