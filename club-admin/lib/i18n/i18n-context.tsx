"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { en, type MessageKey } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./locales";

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { en, fr, es };

export type Params = Record<string, string | number>;

/** `t("members.title")`, `t("members.count", { count: 3 })`. */
export type Translate = (key: MessageKey, params?: Params) => string;

type I18nValue = {
  locale: Locale;
  t: Translate;
  /** Picks `${base}_one` / `${base}_other` for `count` by the locale's rules. */
  tp: (base: string, count: number, params?: Params) => string;
  setLocale: (locale: Locale) => void;
  /** `Intl` formatters in the active language. */
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  /** Resolved on the server from the cookie / Accept-Language. */
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    // A year, site-wide; read by the server layout on the next request.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Staff emails follow the console language. Best-effort: signed out, the
    // call simply fails and the cookie still applies.
    void api.patch("/users/me/locale", { locale: next }).catch(() => {});
  }, []);

  const value = useMemo<I18nValue>(() => {
    const catalog = CATALOGS[locale] ?? CATALOGS[DEFAULT_LOCALE];
    const t: Translate = (key, params) =>
      interpolate(catalog[key] ?? en[key] ?? key, params);
    const rules = new Intl.PluralRules(locale);
    const tp = (base: string, count: number, params?: Params) => {
      const form = rules.select(count) === "one" ? "one" : "other";
      return t(`${base}_${form}` as MessageKey, { count, ...params });
    };
    return {
      locale,
      t,
      tp,
      setLocale,
      formatDate: (value, options) =>
        new Intl.DateTimeFormat(locale, options ?? { dateStyle: "medium" }).format(
          value instanceof Date ? value : new Date(value),
        ),
      formatNumber: (value, options) => new Intl.NumberFormat(locale, options).format(value),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** The common case: just the translate function. */
export function useT(): Translate {
  return useI18n().t;
}
