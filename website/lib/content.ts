/**
 * Copy dispatch for the public site.
 *
 * Every string on the landing and waitlist pages lives in one of the three
 * locale files (`en.ts`, `fr.ts`, `es.ts`); this module resolves the locale to
 * its dictionary and holds the few pieces of content that are NOT translated
 * (the illustrative standings rows: names and scores read the same in every
 * language). The never-fabricate rule applies to all three locales — see
 * PRODUCT.md "Capabilities and Constraints".
 */
import { en } from "./content/en";
import { es } from "./content/es";
import { fr } from "./content/fr";
import type { Dictionary } from "./content/types";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

export type { Chapter, Dictionary, Item } from "./content/types";
export type { Locale } from "./locales";

export const dictionaries: Record<Locale, Dictionary> = { en, fr, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Resolve a locale from a route segment, falling back to the default. */
export function resolveLocale(value: string | undefined): Locale {
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Illustrative standings rows. Names are invented and labelled as such in
 * every locale; the numbers and result codes (W/L) are language-neutral.
 */
export const standingsRows = [
  { pos: 1, player: "Sarah W.", p: 6, w: 5, l: 1, rating: 4.2, form: "W W W L W" },
  { pos: 2, player: "Kevin M.", p: 6, w: 4, l: 2, rating: 3.8, form: "W L W W L" },
  { pos: 3, player: "Emma O.", p: 6, w: 2, l: 4, rating: 2.4, form: "L W L L W" },
  { pos: 4, player: "Daniel K.", p: 6, w: 1, l: 5, rating: 2.1, form: "L L W L L" },
];

/**
 * The legal documents live at exactly one English URL in every locale, so
 * these routes and labels are not part of the dictionaries.
 */
export const legalLinks = [
  { href: "/terms", label: "Terms and Conditions", shortLabel: "Terms" },
  { href: "/privacy-policy", label: "Privacy Policy", shortLabel: "Privacy" },
  { href: "/data-privacy", label: "Data Privacy Notice", shortLabel: "Data Privacy" },
] as const;

