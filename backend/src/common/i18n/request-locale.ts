import type { Request } from 'express';
import { DEFAULT_LOCALE, LOCALES, type LocaleCode } from './index';

/**
 * The language for text written into a response (Home cards), from the
 * `Accept-Language` the mobile app sends on every request. Takes the first
 * supported primary tag in preference order — `fr-CA,en;q=0.8` → `fr` — and
 * falls back to English.
 */
export function requestLocale(req: Request): LocaleCode {
  const header = req.headers['accept-language'];
  if (typeof header !== 'string') return DEFAULT_LOCALE;
  for (const part of header.split(',')) {
    const primary = part.split(';')[0].trim().split('-')[0].toLowerCase();
    if ((LOCALES as readonly string[]).includes(primary)) {
      return primary as LocaleCode;
    }
  }
  return DEFAULT_LOCALE;
}
