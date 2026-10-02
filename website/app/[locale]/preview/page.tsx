/**
 * Drift Tennis — landing page redesign, staged.
 *
 * WHY THIS ROUTE EXISTS: the live landing page at `/` is not being replaced
 * until the redesign has been tested end to end. This route runs the new
 * design beside the current one, on the same app, the same proxy and the same
 * locale routing, so what gets signed off is what ships. When it ships, this
 * file's tree becomes `app/[locale]/page.tsx`, `components/v2/` becomes
 * `components/`, and this route and its robots entry are deleted.
 *
 * NOT INDEXED: `robots` below plus the `/preview` disallow in `app/robots.ts`.
 * Two independent fences, because a staged copy of the home page that leaks
 * into search competes with the real one for its own ranking.
 *
 * New components live in `components/v2/` and the current ones are never
 * edited, so the two designs cannot drift into each other by accident.
 */
import type { Metadata } from "next";

import { PreviewLandingPage } from "@/components/v2/landing-page";
import { getDictionary, resolveLocale } from "@/lib/content";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(resolveLocale(locale));
  return {
    title: { absolute: `${t.meta.title} (preview)` },
    description: t.meta.description,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: undefined },
  };
}

export default async function PreviewHomePage({ params }: PageProps) {
  const { locale } = await params;
  const current = resolveLocale(locale);
  return <PreviewLandingPage locale={current} />;
}
