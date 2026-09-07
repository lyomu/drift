# DESIGN.md — Drift Tennis public website

The public landing surface inherits the established Drift design system; it does
not invent a new one. Sources of truth: `foundation/05-design-system.md`,
`mobile/lib/core/theme/drift_colors.dart` / `drift_typography.dart`, and the
token block in `club-admin/src/app/globals.css`.

## Committed identity

- **Palette strategy — Committed:** brand blue carries large regions.
  - `--color-primary #1c91d0`, dark `#126a9b`, light `#e8f5fc`
  - background `#f7fafc`, surface `#ffffff`, text `#111827` / `#6b7280`,
    border `#e5e7eb`
  - success `#16a34a` / `#eafbf1`, warning `#f59e0b` / `#fef6e7`,
    error `#dc2626` / `#fdecec`, neutral surface `#f1f3f5`
- **Light only.** The landing page is read outdoors, on phones, by people
  deciding whether to download an app; the light palette is the scene, not a
  default. No dark variant ships on this surface.
- **Typography — DM Sans only**, one family for display, headings, body and UI,
  mirroring the 2026-09 mobile typography decision (`drift_typography.dart`).
  Letter-spacing is zero everywhere. Numerals in fixtures/standings use
  tabular figures (`font-feature-settings: "tnum"`), matching the app's
  `statistics` style. Display scale may exceed the app's 34px for the hero,
  but the weight axis (700 display/headings, 600 labels/buttons, 400 body)
  does not change.
- **Component grammar:** white cards, 16px radius, soft shadow, no border
  (DriftSoftCard); filled CTAs, 12px radius — filled with `primary-dark`
  (#126a9b) rather than #1c91d0 so white 15px label text clears WCAG AA
  (~5.9:1 vs ~3.5:1); pill chips at 999px; status badges tinted surface with
  text one step darker than the app's status colours (`#15803d`,
  `#b45309`, `#4b5563`) so 12px badge labels clear AA on the tint.
- **Motion:** CSS-only, restrained — smooth anchor scrolling, small
  hover/press lifts on cards and buttons. No parallax, no autoplay carousels.
- **On primary fields** (standings, the final): focus outlines switch to
  white (`[data-on-primary]`), body copy stays ≥ white/90.

## Durable rules for this surface

1. Never fabricate: no testimonials, user counts, store links, or prices that
   do not exist. Illustrative app UI is labelled as such, visibly.
2. Tennis says its name in the first five seconds; Padel appears as an
   explicit opt-in aside, never as co-branding.
3. The page's structural language is the product's own competition vocabulary
   (matchday, rounds, fixtures, standings, the final) — sections are rounds,
   the download CTA is the final.
4. Copy voice: honest, non-intimidating, beginner-safe. No hype, no scarcity.
5. Accessibility: WCAG AA contrast, semantic landmarks, keyboard-visible focus
   rings (2px `--color-primary` outline, 2px offset).
