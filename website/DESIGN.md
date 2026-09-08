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
  (DriftSoftCard); filled CTAs, 12px radius, filled with `primary-dark`
  (#126a9b) rather than #1c91d0 so white 15px label text clears WCAG AA
  (~5.9:1 vs ~3.5:1); pill chips at 999px; status badges tinted surface with
  text one step darker than the app's status colours (`#15803d`,
  `#b45309`, `#4b5563`) so 12px badge labels clear AA on the tint.
- **Motion:** CSS-only, no animation library. Four things move: a staggered
  entrance in the first viewport (`.enter` + `.enter-1..5`) with a single slow
  settle on the hero photograph (`.hero-settle`, a one-off scale on load, not
  parallax); scroll-driven fade-ups on section entry (`.reveal`) and on card
  grids in sequence (`.reveal-stagger`); the loop strip's rule drawing left to
  right (`.draw-line`); and hover/press lifts on buttons, cards and the nav
  underline. Still no parallax, no autoplay carousels, nothing that loops
  forever. **Every motion block sits inside
  `prefers-reduced-motion: no-preference`**, and the scroll-driven ones inside
  `@supports (animation-timeline: view())` as well, so motion is purely
  additive: where either check fails the element renders in its final state
  and nothing is hidden behind a feature check.
- **On primary fields** (standings, the final, photo bands): focus outlines
  switch to white (`[data-on-primary]`), body copy stays ≥ white/90.

## Photography (added 2026-09)

The surface shipped its first year with no images at all. It reads as
restraint only up to a point; past that it reads as unfinished, which is
what prompted the redesign.

- **Sourcing.** Two images come from the app's own onboarding assets; the
  rest are Unsplash, downloaded and self-hosted. Everything is served from
  `public/images/` — `img-src 'self' data: blob:` blocks external CDNs, and
  `output: "standalone"` does not bundle `public/`, so the Dockerfile copies
  it explicitly. Sources and licences: `public/images/CREDITS.md`.
- **One manifest.** `lib/images.ts` declares every slot's `src`, `alt`,
  dimensions and focal point. Components never hard-code an image path.
  Replacing a photograph is a file swap at the same aspect ratio.
- **Type over photography.** White type only ever sits on a scrim, and the
  scrims wash in primary-dark (`.scrim-hero`, `.scrim-band`) rather than
  neutral black — the brand keeps carrying the large regions, which is the
  committed palette strategy, and the wash is what guarantees AA rather than
  the photograph happening to be dark in the right place.
- **Focal points, not `center`.** The overhead and aerial shots lose their
  subject to a centre crop at narrow widths; `focal` drives
  `object-position`.
- **Photographs are never evidence.** They are editorial. No photograph is
  captioned or positioned to imply it shows Drift users, a Drift club, or a
  Drift match.

## Durable rules for this surface

1. Never fabricate: no testimonials, user counts, store links, or prices that
   do not exist. Illustrative app UI is labelled as such, visibly.
2. Tennis says its name in the first five seconds and leads every section
   above the fold; the product keeps the name Drift Tennis. **Revised
   2026-09-08:** padel is now co-billed rather than an opt-in footnote. It
   has its own section, its own entry in the primary navigation, and a
   mention in the hero. It still comes *after* the three tennis-led chapters
   and the standings, and it keeps the tinted ground so it reads as a
   distinct track rather than a fourth chapter. Order carries the hierarchy
   now, not omission.
3. The page's structural language is the product's own competition vocabulary
   (chapters of a season, fixtures, standings, the final) — the closing CTA
   is the final. **Revised 2026-09:** the page ran as five equal "rounds"
   rendered from one map, which meant five consecutive screens with an
   identical layout; it now runs as three chapters, each with its own
   opening treatment, and each merged chapter keeps its second loop stage as
   a coda in a different treatment again. The five-stage loop is not lost in
   that merge — `LoopStrip` names every stage explicitly, directly under the
   hero, because PRODUCT.md principle 1 requires the loop to survive
   whatever the page's narrative does.
4. Copy voice: honest, non-intimidating, beginner-safe. No hype, no scarcity.
5. Accessibility: WCAG AA contrast, semantic landmarks, keyboard-visible focus
   rings (2px `--color-primary` outline, 2px offset).

## Forms (added 2026-09)

The waitlist page brought the first form, and the first client component, to
a surface that had neither.

- **Controls:** `.input` / `.select` / `.radio-card` in `globals.css`,
  matching the card grammar — 12px radius, `--color-border` hairline, focus
  ring as a 3px `primary-light` halo inside the existing 2px outline rules.
- **Radio cards** keep the native input in the DOM (visually hidden, never
  `display: none`) so keyboard and screen-reader behaviour is inherited
  rather than reimplemented.
- **Errors** are announced, not just coloured: `aria-invalid` plus an
  id-linked `role="status"` region that is always present in the DOM.
- **No scarcity, ever.** No signup counter, no queue position, no countdown,
  no "limited places" — rule 4 and PRODUCT.md's never-fabricate rule both
  apply, and neither number exists anyway. The page converts on being clear
  about what it will send and when.
- **Submission stays same-origin.** The form posts to a Next route handler
  that proxies to the API server-side, which is what keeps `connect-src` and
  `form-action` at `'self'` in `next.config.ts`. A direct browser call to
  the API host would mean widening the CSP and the API's CORS allowlist; do
  not do that for a marketing form.

## Revisions, 2026-09-08

- **Pills are for status, never for navigation.** Header links are plain text
  with an underline that grows from the left (`.nav-link`); the old pill chips
  made the header read as a row of filters. `.badge` keeps the pill shape and
  keeps its meaning: a state, a tag, a label on illustrative UI.
- **No "Chapter N" chrome.** Sections open with the oversized ordinal alone.
  Spelling the label out in a pill meant every section began with the same
  piece of furniture, and the merged chapters' codas now use the same plain
  label treatment rather than a lone chip.
- **No em dashes in copy.** Rendered text uses full stops, colons, commas or
  parentheses instead. This is a house voice rule, so it applies to `alt`
  text, `aria-label`s, page titles and API error strings, not only body copy.
- **No age gate in the copy.** The site previously said "18+ at launch"; it no
  longer does, because younger players are welcome. ⚠ Note this contradicts
  `PRODUCT.md` ("18+ only at launch (age policy gate at signup)") and the
  app's signup gate — the product side needs to follow, or the site is
  promising something the app refuses.
- **Free at launch is stated plainly.** "Free to join while we get going",
  matching `PRODUCT.md`'s launch posture (app users free, clubs pay). Worded
  as a launch commitment, not "free forever", which nobody has decided.

## Padel positioning, 2026-09-08

The old rule made padel an aside "never co-branded". That is no longer the
brief: padel is a second sport the page says out loud, with tennis still
first by name, by order and by volume.

What made this safe to claim rather than aspirational, checked before a word
changed:

- `MatchSport` is `TENNIS | PADEL` and scopes `Match`, `League`,
  `Tournament`, `Ladder`, `CourtGroup`, `Club` and `LearningContent`.
- club-admin's **league** and **ladder** forms both expose the sport picker,
  and the league list renders a padel icon for `sport === "PADEL"`.
- `PadelProfile`, `PadelAssessmentSession` and `PadelAssessmentAnswer` carry
  the separate assessment and rating, independent of the tennis record.

So "padel leagues and ladders, created by clubs the same way as tennis ones"
is a statement about shipped behaviour, not a roadmap. ⚠ Note this widens the
line in `PRODUCT.md`, which still reads "Padel is a real but opt-in, additive
second sport" and "never 'racket sports' or 'multi-sport'". The site now
leans further toward co-billing than that wording allows — the phrase
"racket sports" is still avoided, and the two sports are always named
explicitly, but `PRODUCT.md` should be updated to match.
