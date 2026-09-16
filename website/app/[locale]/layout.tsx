import { notFound } from "next/navigation";

import { HtmlLang } from "@/components/html-lang";
import { isLocale, LOCALES } from "@/lib/locales";

/**
 * The locale segment wraps every translated page. Static params pin the three
 * builds (en/fr/es); anything else in the segment 404s rather than falling
 * back silently. The root layout cannot see this segment, so `<html lang>`
 * starts as "en" everywhere and `HtmlLang` corrects it on mount.
 */
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
    <>
      <HtmlLang locale={locale} />
      {children}
    </>
  );
}
