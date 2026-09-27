import type { MetadataRoute } from "next";

import { LOCALES } from "@/lib/locales";
import { sitemapLanguages } from "@/lib/seo";
import {
  WAITLIST_URL,
  absoluteUrl,
  localizedPath,
  originRootUrl,
} from "@/lib/site";

/** Pages that exist in every locale on the apex. */
const LOCALIZED_PATHS = ["/"];

/** English-only legal documents: one URL each, no alternates. */
const LEGAL_PATHS = ["/terms", "/privacy-policy", "/data-privacy"];

/**
 * One sitemap covers both origins. A sitemap may list URLs on another host as
 * long as both are verified in the same Search Console property, and keeping
 * one file means the waitlist cannot be forgotten when the apex sitemap is
 * regenerated.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const localized = LOCALIZED_PATHS.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      alternates: { languages: sitemapLanguages(path) },
    })),
  );

  // The waitlist origin serves the page at its own root, one URL per locale.
  const waitlist = LOCALES.map((locale) => ({
    url: originRootUrl(WAITLIST_URL, locale),
    alternates: { languages: sitemapLanguages("/", WAITLIST_URL) },
  }));

  const legal = LEGAL_PATHS.map((path) => ({ url: absoluteUrl(path) }));
  return [...localized, ...waitlist, ...legal];
}
