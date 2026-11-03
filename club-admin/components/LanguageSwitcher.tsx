"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/dashboard-design";
import { useI18n } from "@/lib/i18n/i18n-context";
import { LANGUAGES } from "@/lib/i18n/locales";

/**
 * Header language picker — the active language's flag in a round button the
 * same size as `ThemeToggle`, opening a short list of the three languages,
 * each named in itself. Picking applies at once and persists (see
 * `I18nProvider.setLocale`).
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language.label")}
        title={t("language.label")}
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-drift-border bg-drift-background text-lg transition-colors hover:border-drift-primary ${className}`}
      >
        <span aria-hidden>{active.flag}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-48 overflow-hidden rounded-lg border border-drift-border bg-drift-surface py-1 shadow-lg"
        >
          {LANGUAGES.map((language) => {
            const selected = language.code === locale;
            return (
              <button
                key={language.code}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                lang={language.code}
                onClick={() => {
                  setOpen(false);
                  if (!selected) setLocale(language.code);
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-drift-primary-light ${
                  selected ? "text-drift-text-primary" : "text-drift-text-secondary"
                }`}
              >
                <span aria-hidden className="text-base">
                  {language.flag}
                </span>
                <span className="flex-1">{language.name}</span>
                {selected && <MaterialIcon name="check" className="text-[18px] text-drift-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
