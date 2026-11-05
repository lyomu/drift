import { en, type MessageKey } from './messages.en';
import { es } from './messages.es';
import { fr } from './messages.fr';

export type { MessageKey } from './messages.en';

/** The locale codes the apps ship in. Same values as the `AppLocale` enum. */
export type LocaleCode = 'en' | 'fr' | 'es';
export const LOCALES: readonly LocaleCode[] = ['en', 'fr', 'es'];
export const DEFAULT_LOCALE: LocaleCode = 'en';

const CATALOGS: Record<LocaleCode, Record<MessageKey, string>> = { en, fr, es };

/** A parameter that itself needs translating (e.g. the "a club" fallback). */
export interface MessageRef {
  key: MessageKey;
}

export type MessageParam = string | number | Date | MessageRef;

/** Copy addressed to one recipient, rendered in their language at send time. */
export interface LocalizedText {
  key: MessageKey;
  params?: Record<string, MessageParam>;
}

/**
 * What the notification and mail paths accept: a catalog message, or a literal
 * string for text a person wrote themselves (an announcement, a chat preview,
 * a court name) that must reach everyone verbatim.
 */
export type Localizable = string | LocalizedText;

/** A stored `preferredLocale` (null for accounts that predate it) → a code. */
export function localeOf(value: string | null | undefined): LocaleCode {
  return (LOCALES as readonly string[]).includes(value ?? '')
    ? (value as LocaleCode)
    : DEFAULT_LOCALE;
}

/** Shorthand for building a `LocalizedText`. */
export function msg(
  key: MessageKey,
  params?: Record<string, MessageParam>,
): LocalizedText {
  return params ? { key, params } : { key };
}

function formatParam(locale: LocaleCode, value: MessageParam): string {
  if (value instanceof Date) {
    // The server has no idea where the recipient is, so the time is stated in
    // UTC and labelled as such — the app shows the local time on the match.
    return `${new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(value)} UTC`;
  }
  if (typeof value === 'object') return t(locale, value.key);
  return String(value);
}

/**
 * Looks `key` up in the recipient's catalog and fills `{name}` placeholders.
 * A key missing from a translation (only possible at runtime through a cast)
 * falls back to English rather than showing the raw key.
 */
export function t(
  locale: LocaleCode,
  key: MessageKey,
  params?: Record<string, MessageParam>,
): string {
  const template = CATALOGS[locale]?.[key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? formatParam(locale, params[name]) : match,
  );
}

export function render(locale: LocaleCode, text: Localizable): string {
  return typeof text === 'string' ? text : t(locale, text.key, text.params);
}
