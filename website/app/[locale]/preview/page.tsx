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

  return (
    <main style={{ padding: "4rem 1.5rem", maxWidth: "48rem", margin: "0 auto" }}>
      <p
        style={{
          display: "inline-block",
          padding: "0.25rem 0.75rem",
          borderRadius: 999,
          background: "var(--color-primary-light)",
          color: "var(--color-primary-dark)",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Preview
      </p>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginTop: "1rem" }}>
        Redesign lands here
      </h1>
      <p style={{ marginTop: "1rem", color: "var(--color-text-secondary)" }}>
        Locale <code>{current}</code>. The current site is untouched at{" "}
        <a href={current === "en" ? "/" : `/${current}`}>its own URL</a>. New
        sections go in <code>components/v2/</code> and are composed from this
        file.
      </p>
    </main>
  );
}
