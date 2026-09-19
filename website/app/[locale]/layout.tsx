import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { dmSans } from "@/lib/fonts";
import { isLocale, LOCALES } from "@/lib/locales";
import { baseMetadata } from "@/lib/seo";

import "../globals.css";

/**
 * The locale segment is the root layout for every translated page, so the
 * server-rendered `<html lang>` is the locale actually being served (crawlers
 * and screen readers see it without waiting for hydration). The English-only
 * legal documents have their own root layout in `app/(legal)`. Static params
 * pin the three builds (en/fr/es); anything else in the segment 404s rather
 * than falling back silently.
 */
export const metadata: Metadata = baseMetadata;

export const viewport: Viewport = {
  themeColor: "#1c91d0",
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={dmSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
