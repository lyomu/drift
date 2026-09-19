import type { Metadata } from "next";

import { LOCALES, type Locale } from "./locales";
import {
  CONTACT_EMAIL,
  OG_LOCALE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  localizedPath,
} from "./site";

/**
 * Metadata shared by both root layouts. `metadataBase` is what turns the
 * relative canonical / hreflang / Open Graph paths below into absolute URLs.
 * The title template applies to every page that sets a plain `title`; the
 * home page opts out with `title.absolute`.
 */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: { template: `%s · ${SITE_NAME}`, default: SITE_NAME },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

type PageMetadataInput = {
  /** Same-site path without locale prefix: `/`, `/waitlist`. */
  path: string;
  title: string;
  description: string;
  /** Use the title verbatim instead of applying the site template. */
  absoluteTitle?: boolean;
};

/**
 * Metadata for a page that exists in every locale: canonical, the full
 * hreflang set (English is also `x-default`), and Open Graph / Twitter cards.
 * The share image is set explicitly: a page that defines its own `openGraph`
 * replaces (rather than merges with) the one the layout-level
 * `[locale]/opengraph-image` file would supply, so the waitlist page would
 * otherwise ship with no image. English uses the unprefixed URL so scrapers
 * do not chase the proxy's `/en/...` redirect.
 */
export function localizedMetadata(
  locale: Locale,
  { path, title, description, absoluteTitle }: PageMetadataInput,
): Metadata {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = localizedPath(l, path);
  languages["x-default"] = localizedPath("en", path);

  const canonical = localizedPath(locale, path);
  const images = [
    {
      url: localizedPath(locale, "/opengraph-image"),
      width: 1200,
      height: 630,
      alt: SITE_NAME,
    },
  ];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: OG_LOCALE[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map(
        (l) => OG_LOCALE[l],
      ),
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

/**
 * Metadata for an English-only page (the legal documents): a self-referencing
 * canonical and no hreflang, since there is nothing to alternate to.
 */
export function englishOnlyMetadata({
  path,
  title,
  description,
}: Omit<PageMetadataInput, "absoluteTitle">): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      locale: OG_LOCALE.en,
    },
  };
}

/** Sitemap `alternates.languages` for a page, absolute URLs. */
export function sitemapLanguages(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absoluteUrl(localizedPath(l, path));
  languages["x-default"] = absoluteUrl(localizedPath("en", path));
  return languages;
}

/**
 * Home-page structured data: the organisation and the site. No app listing
 * and no ratings — neither exists yet, and structured data must describe what
 * is actually on the page.
 */
export function siteJsonLd(locale: Locale, description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl("/images/logo.png"),
        email: CONTACT_EMAIL,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description,
        inLanguage: locale,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}
