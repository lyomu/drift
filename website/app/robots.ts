import type { MetadataRoute } from "next";

import { LOCALES } from "@/lib/locales";
import { absoluteUrl } from "@/lib/site";

/**
 * `/preview` is the staged landing-page redesign (see
 * `app/[locale]/preview/page.tsx`). It is a near-copy of the home page, so it
 * is disallowed in every locale: left crawlable it would compete with `/` for
 * that page's own ranking. The route also sets `noindex` itself; this is the
 * second fence, and both go when the redesign ships.
 */
const PREVIEW_PATHS = [
  "/preview",
  ...LOCALES.filter((locale) => locale !== "en").map(
    (locale) => `/${locale}/preview`,
  ),
];

const RESERVED_PATHS = [
  "/reserved",
  ...LOCALES.filter((locale) => locale !== "en").map(
    (locale) => `/${locale}/reserved`,
  ),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...PREVIEW_PATHS, ...RESERVED_PATHS],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
