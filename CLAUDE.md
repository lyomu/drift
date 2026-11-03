# Drift Tennis — project rules

## Translations (EN / FR / ES)
The mobile app, club-admin and backend notifications/emails are localized in English, French and Spanish.
- Never hard-code user-facing text. Every new string goes into all three catalogs in the same change:
  - mobile: `mobile/lib/l10n/app_en.arb`, `app_fr.arb`, `app_es.arb` → use `context.l10n.<key>`
  - club-admin: `club-admin/lib/i18n/messages/{en,fr,es}.ts` → use `t("<key>")` from `useT()`
  - backend push/email copy: `backend/src/common/i18n/messages.{en,fr,es}.ts` → `t(locale, key, params)`
- Format dates and numbers with the active locale (`intl` `DateFormat` on mobile, `Intl.DateTimeFormat` in club-admin), never hand-rolled month names.
- platform-admin is English-only.
