import type { MetadataRoute } from "next";

import { LOCALES } from "@/lib/locales";
import { sitemapLanguages } from "@/lib/seo";
import { absoluteUrl, localizedPath } from "@/lib/site";

/** Pages that exist in every locale. */
const LOCALIZED_PATHS = ["/", "/waitlist"];

/** English-only legal documents: one URL each, no alternates. */
const LEGAL_PATHS = ["/terms", "/privacy-policy", "/data-privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const localized = LOCALIZED_PATHS.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: absoluteUrl(localizedPath(locale, path)),
      alternates: { languages: sitemapLanguages(path) },
    })),
  );
  const legal = LEGAL_PATHS.map((path) => ({ url: absoluteUrl(path) }));
  return [...localized, ...legal];
}
