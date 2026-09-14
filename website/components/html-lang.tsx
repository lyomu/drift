"use client";

import { useEffect } from "react";

/**
 * Keeps `<html lang>` in sync with the locale actually rendered. The root
 * layout prerenders `lang="en"` for every route (the root layout cannot see
 * the locale segment), so the locale layout runs this one-line correction on
 * mount — screen readers pick up the right language as soon as hydration
 * lands.
 */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
