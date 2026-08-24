# 05 — Design System

**Drift Tennis — Phase 1 Foundation, Document 5 of 7**

---

## 1. Design Principles

1. **Tennis-native, not generic SaaS.** Court-inspired geometry, strong statistics typography, athletic imagery. A screenshot of Drift should never be mistaken for a generic CRUD admin tool.
2. **White/neutral surfaces dominate; blue earns its place.** #1C91D0 marks primary actions, active states, and important statistics — it is never a background flood.
3. **Progress is visible.** Ratings, standings, and skill development are always rendered as something the player can watch move over time — charts and trend indicators over static numbers wherever possible.
4. **Structured over freeform.** Match scheduling, results, and disputes use explicit workflows and named states, not open-ended text, so the product is trustworthy under conflict.
5. **Beginner-first clarity.** Plain labels (Play, Compete, Discover, Improve) over jargon; a first-time player and a competitive league player both find the interface legible.
6. **Never a dead end.** Every empty state proposes the one action that resolves it.
7. **Accessible by default, not by retrofit.** WCAG 2.2 AA is a baseline, not a stretch goal — colour-independent status, real touch targets, screen-reader labels from the first component.

## 2. Colour System

### Primary palette

| Token | Value | Usage |
|---|---|---|
| `color.primary` | `#1C91D0` | Primary CTA, active nav, selected states, links, key interactions, progress indicators, selected filters, important statistics, brand moments |
| `color.primary.dark` | `#126A9B` | Pressed/active state of primary, high-emphasis text-on-light accents |
| `color.primary.light` | `#E8F5FC` | Selected-surface backgrounds, subtle highlight fills |
| `color.background` | `#F7FAFC` | App/page background |
| `color.surface` | `#FFFFFF` | Cards, sheets, modals |
| `color.text.primary` | `#111827` | Primary text |
| `color.text.secondary` | `#6B7280` | Secondary/supporting text |
| `color.border` | `#E5E7EB` | Dividers, outlines, neutral controls |
| `color.status.success` | `#16A34A` | Confirmations, wins, positive trend |
| `color.status.warning` | `#F59E0B` | Pending/attention states (e.g. awaiting confirmation) |
| `color.status.error` | `#DC2626` | Errors, disputes, destructive actions |
| `color.status.info` | `#1C91D0` | Informational banners (reuses primary) |

**Rule: white and neutral surfaces remain dominant.** Blue is reserved for the interactions listed above — never used as a large background fill, card background, or default icon colour.

### Semantic tokens (never hard-code raw hex in components)

```
color.primary
color.primary.hover
color.primary.active
color.primary.surface          → color.primary.light

color.text.primary
color.text.secondary
color.text.disabled            → color.text.secondary at 40% opacity

color.surface.default          → color.surface
color.surface.subtle           → color.background
color.surface.elevated         → color.surface + elevation.2

color.border.default           → color.border
color.border.strong            → color.text.secondary at 24% opacity

color.status.success / .success.surface
color.status.warning / .warning.surface
color.status.error   / .error.surface
color.status.info    / .info.surface
```

Each `.surface` variant is a ~10% tint of its status colour on `color.background`, used behind badges/banners so status is never conveyed by colour alone (see Accessibility, §9).

### Colour-independent status (accessibility requirement)

Every status colour pairs with an icon or label — e.g. a disputed match shows a warning triangle icon *and* "Disputed" text, not just an amber border. Applies to: match states, competition states, verification badges, connection status.

## 3. Typography

**Two-family pairing:**

- **Display typeface — Sharp Sans Display.** Carries headlines, screen titles, section headers, and large statistics/scores — the moments where Drift needs an athletic, confident voice (scoreboards, suggested-level reveals, standings).
- **Body/UI typeface — Outfit.** Carries everything read at length or interacted with: body copy, labels, buttons, form fields, captions, navigation.

This replaces the earlier single-typeface direction (Inter) established in the original brief — the two-family pairing gives headlines a distinct, sportier presence while keeping UI chrome and reading text in a clean, highly-legible geometric sans.

> **Open licensing dependency:** Sharp Sans Display is a commercial typeface (Sharp Type foundry) and requires a purchased license (desktop + web-font license covering the app's expected reach) before it can ship in production Flutter/Next.js builds. **Until that license is secured, use [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (SIL Open Font License, free) as the display-family fallback** — it shares Sharp Sans Display's geometric, slightly technical character closely enough that no rework is needed when the licensed font is dropped in. Outfit (SIL OFL) has no licensing dependency and can be used immediately. Treat "acquire the Sharp Sans Display license" as a P0 dependency to track in Document 7, not a detail to forget once build starts.

| Style | Family | Size / Line-height | Weight | Usage |
|---|---|---|---|---|
| Display | Sharp Sans Display *(fallback: Space Grotesk)* | 34 / 40 | 700 | Rare hero moments (onboarding "Let's understand your game") |
| H1 | Sharp Sans Display *(fallback: Space Grotesk)* | 28 / 34 | 700 | Screen titles |
| H2 | Sharp Sans Display *(fallback: Space Grotesk)* | 24 / 30 | 700 | Section headers |
| H3 | Sharp Sans Display *(fallback: Space Grotesk)* | 20 / 26 | 600 | Card group headers |
| H4 | Outfit | 18 / 24 | 600 | Sub-section headers |
| Title | Outfit | 16 / 22 | 600 | Card titles, list item primary text |
| Subtitle | Outfit | 14 / 20 | 500 | Card secondary text |
| Body Large | Outfit | 16 / 24 | 400 | Primary reading content |
| Body | Outfit | 14 / 20 | 400 | Default UI text |
| Body Small | Outfit | 13 / 18 | 400 | Supporting/meta text |
| Label | Outfit | 13 / 16 | 600 | Form labels, tab labels |
| Caption | Outfit | 12 / 16 | 400 | Timestamps, fine print |
| Button | Outfit | 15 / 20 | 600 | Button text |
| Statistics / Numbers | Sharp Sans Display *(fallback: Space Grotesk)* | 28-40 / 1.1, tabular-nums | 700 | Ratings, scores, standings — always tabular figures so columns of numbers align |

Rules:
- Statistics and scores always use a tabular-figure numeral style so leaderboards/standings align vertically.
- **H4 and below stay in Outfit even inside a heavily-headlined screen** (e.g., a card group header uses H3/Sharp Sans Display, but the card titles beneath it use Title/Outfit) — this keeps the display face special-occasion rather than diluted across every level of hierarchy.
- Fallback stack beneath both families: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## 4. Spacing System

8px base unit: `spacing.0` = 0, `spacing.1` = 4, `spacing.2` = 8, `spacing.3` = 12, `spacing.4` = 16, `spacing.5` = 20, `spacing.6` = 24, `spacing.8` = 32, `spacing.10` = 40, `spacing.12` = 48, `spacing.16` = 64.

(`spacing.1` = 4px is the one half-step exception, used for icon-to-label gaps and dense list rows.)

## 5. Full Token Set

| Category | Tokens |
|---|---|
| **Sizing** | `size.icon.sm` 16 · `size.icon.md` 20 · `size.icon.lg` 24 · `size.avatar.sm` 24 · `size.avatar.md` 40 · `size.avatar.lg` 64 · `size.touchTarget.min` 44 |
| **Radius** | `radius.sm` 4 (chips, badges) · `radius.md` 8 (inputs, buttons) · `radius.lg` 12 (cards) · `radius.xl` 16 (sheets, modals) · `radius.full` 999 (avatars, pills) |
| **Borders** | `border.width.default` 1 · `border.width.strong` 2 (focus rings, selected cards) |
| **Elevation** | `elevation.0` none (flat surfaces) · `elevation.1` subtle card shadow · `elevation.2` raised card/dropdown · `elevation.3` modal/sheet · `elevation.4` toast/floating action button |
| **Opacity** | `opacity.disabled` 0.4 · `opacity.overlay` 0.5 (modal scrim) · `opacity.hover` 0.08 (hover tint over surface) · `opacity.pressed` 0.12 |
| **Icons** | Single icon family, line-style default with a filled variant for selected/active states; 1.5px stroke at `size.icon.md` |
| **Motion** | `motion.duration.fast` 120ms (hover/press feedback) · `motion.duration.default` 200ms (transitions, sheet open) · `motion.duration.slow` 320ms (page transitions) · `motion.easing.standard` ease-in-out · Respect `prefers-reduced-motion` / OS reduce-motion — swap slide/scale transitions for simple fades |
| **Breakpoints** (Next.js) | `bp.mobile` <640 · `bp.tablet` 640-1024 · `bp.laptop` 1024-1440 · `bp.desktop` ≥1440 |
| **Z-index** | `z.base` 0 · `z.stickyHeader` 10 · `z.dropdown` 20 · `z.modal` 30 · `z.toast` 40 · `z.tooltip` 50 |

## 6. Core Component Inventory

Buttons (primary/secondary/tertiary/destructive) · Icon Buttons · Text Inputs · Search Fields · Text Areas · Selects/Dropdowns · Checkboxes · Radio Buttons · Switches · Sliders (used for level adjustment) · Date Pickers · Time Pickers · Chips (filters, sport tags) · Tags · Badges (verification, status) · Avatars · Cards · Alerts (inline) · Toasts (transient) · Modals · Bottom Sheets · Dialogs (confirm/destructive) · Tabs · Accordions · Pagination · Breadcrumbs (Next.js only) · Tables · Data Tables (Next.js admin) · Bottom Navigation (Flutter) · Sidebar (Next.js admin) · Top Navigation (Next.js) · Filter Bars · Notification Row · Chat Bubble / Composer · Map Pins · Map Info Cards · Charts (line/bar for trends, radial for skill breakdown) · Progress Visualisations (bar, ring) · Empty States · Loading States · Skeletons.

## 7. Tennis-Specific Component Inventory

| Component | Purpose |
|---|---|
| **Player Card** | Compact player summary in lists (photo, name, level, distance, availability chip) |
| **Rating Badge** (Singles / Doubles) | Numeric rating with format indicator |
| **Skill Assessment Question** | Full-bleed behavioural-question card with lettered options |
| **Assessment Progress** | Step indicator scoped to the current branch's question budget |
| **Suggested Level Card** | Level number + name + explanation + Confirm/Adjust actions |
| **Skill Breakdown** | Radial/bar chart across the seven dimensions |
| **Match Card** | Opponent, date/time, court, competition context, status badge |
| **Match Score** | Set-by-set score display, tabular numerals |
| **Match Status Badge** | One of the defined match states, colour + icon + label |
| **League Card / Season Card** | League/season summary with state badge |
| **Season Progress** | Round N of M indicator |
| **Round Indicator** | Current round marker within a season timeline |
| **Fixture Card** | Single scheduled/played fixture |
| **Standings Table** | Ranked table with W/L, points, movement arrows |
| **Tournament Bracket** | Draw visualisation, live-updating |
| **Player Availability** | Compact availability-grid summary |
| **Court Card** | Court summary in list/map results |
| **Court Availability Chip** | Booking-availability indicator (never fabricated — "Unknown" is a valid state) |
| **Court Surface Chip** | Hard/clay/grass/indoor icon+label |
| **Coach Card** | Coach summary in discovery list |
| **Skill Card / Skill Progress** | Single-dimension development display |
| **Practice Streak** | Consecutive-session indicator |
| **Development Goal** | Goal card with progress bar and deadline |
| **Match Form (Recent Form)** | W/L/W/W/L strip, last N matches |
| **Win/Loss Record** | Aggregate record display |
| **Achievement Badge** | Earned/locked achievement with transparent criteria on tap |
| **Ranking Movement** | Up/down/steady indicator with delta |
| **News Card** | Headline, publisher, image, highlight, source attribution |

### Padel-aware variants (no new visual system)

`Padel Rating Badge`, `Padel Profile Card`, `Padel Skill Breakdown`, `Padel Match Card` reuse the exact components above with a Padel data source and a small sport-context label where ambiguity is possible (e.g., inside a mixed Players list once Padel filtering is active). **No Sport Switcher component exists in this system** — sport context is communicated through labels/filters only, per Document 1 positioning.

## 8. Component States

Every interactive component defines: **Default · Hover · Pressed · Focused · Selected · Disabled · Loading · Success · Warning · Error.**

- **Hover** applies to Next.js (pointer devices) only — Flutter substitutes a press/ripple state for touch.
- **Focused** must be visually distinct from Hover/Selected (a `border.width.strong` ring in `color.primary`, never colour-alone) — required for keyboard navigation on Next.js and for switch-control/assistive nav on mobile.
- **Loading** on a button shows an inline spinner and disables re-submission (duplicate-tap guard — directly relevant to Match Result submission and Payment actions).

## 9. Accessibility Rules (WCAG 2.2 AA target)

- **Contrast:** body text ≥ 4.5:1, large text/icons ≥ 3:1 — verified against both `color.background` and `color.surface`.
- **Touch targets:** minimum 44×44pt on mobile, 40×40px on web pointer targets.
- **Keyboard navigation (Next.js):** full tab order, visible focus rings, no keyboard traps in modals/sheets.
- **Screen readers:** every icon-only control has an accessible label; charts (skill breakdown, standings, revenue) expose an accessible data-table alternative, not just a canvas/SVG.
- **Dynamic text:** layouts tolerate at least 200% text scaling without clipping (critical for score/rating displays).
- **Reduced motion:** respects OS-level `prefers-reduced-motion`; page and sheet transitions degrade to simple fades.
- **Colour-independent status:** every status pairing (§2) uses icon + label, never colour alone.
- **Accessible forms:** every input has a persistent visible label (not placeholder-only), inline error text linked via `aria-describedby` (web) / semantic error slots (Flutter).

## 10. Responsive Rules

**Flutter (mobile app):** mobile-first, single-column, bottom-navigation-driven. No tablet/desktop Flutter target in this foundation (out of scope until a future phase).

**Next.js (Club Admin, Platform Admin):** desktop/laptop-first (primary admin work happens at a desk), with genuine responsive layouts down to tablet — **not** a stretched mobile layout. Concretely:
- **Desktop/Laptop (≥1024px):** persistent left sidebar + multi-column data tables/dashboards.
- **Tablet (640-1024px):** collapsible sidebar (icon rail or drawer), single-column dashboard cards, tables gain horizontal scroll inside their own container rather than compressing columns unreadably.
- **Small screens (<640px):** supported for emergency/glanceable use (e.g., approving a dispute from a phone) but is not a design target for full admin workflows — Club/Platform Admin are not being designed as mobile apps.

## 11. Technical Design System Mapping

Tokens are defined once, platform-neutral (as YAML/JSON in the eventual implementation), then mapped:

| Token category | Flutter | Next.js |
|---|---|---|
| Colour | `ThemeExtension<DriftColors>` fields matching semantic token names (`primary`, `primarySurface`, `textSecondary`, etc.), consumed via `Theme.of(context).extension<DriftColors>()` | CSS custom properties (`--color-primary`, `--color-text-secondary`, ...) + Tailwind theme extension referencing the same variables |
| Typography | `TextTheme` / custom `ThemeExtension<DriftType>` matching the scale in §3, with both `fontFamily: 'SharpSansDisplay'` (display styles) and `fontFamily: 'Outfit'` (body/UI styles) registered as app fonts (`pubspec.yaml`) | Tailwind `fontSize`/`lineHeight` scale + two `@font-face` declarations (`Sharp Sans Display`, `Outfit`), exposed as `font-display` / `font-body` Tailwind font-family utilities |
| Spacing | Static `EdgeInsets`/`SizedBox` constants named `Spacing.s2`, `Spacing.s4`, etc. | Tailwind spacing scale aligned to the same 8px steps |
| Radius/Elevation | `BorderRadius`/`BoxShadow` constants | Tailwind `borderRadius`/`boxShadow` tokens |
| Breakpoints | N/A (mobile-only) | Tailwind `screens` config matching §5 |

**Naming stays identical across platforms** (`color.primary`, `spacing.4`, `radius.lg`) so a designer or engineer can move between the Flutter app and the Next.js admin apps without relearning vocabulary.

## 12. Hero Pattern (added Phase M2)

A second reference product informed this pattern: the Australian Open app's onboarding flow — full-bleed blue backgrounds, large bold headlines with short supporting copy, a white pill-shaped primary CTA, a lightweight permission-priming narrative structure. Same rule as the Scala reference in Document 1 §3: **this is a UX/visual-pattern reference, not a source to clone.** Drift's implementation uses Drift's own brand colour, typography, iconography, and copy — no third-party logos, mascots, imagery, or wording are reused.

Drift's version uses a **solid** `color.primary` fill, not a gradient — confirmed after reviewing the first build. Flat colour keeps the brand blue reading as one deliberate block rather than a decorative wash, and matches the "blue earns its place" restraint in Design Principle 2 more literally.

**Where it's used:** Welcome, and other single-message onboarding moments (permission priming, "Do you also play Padel?") where the goal is one clear headline and one clear action — not dense information screens. Everyday screens (Home, Discover, Compete, forms) stay on the standard white/neutral surface per Design Principle 2; the hero pattern is reserved for these specific high-emotion, low-density moments so it keeps its impact.

**New component: Hero container**
- Full-bleed background, solid `color.primary` fill — no gradient.
- Content structure: a pinned top row (wordmark, optional "Skip"), a flexible middle area (icon, `Display`-style headline, one line of `Body Large` supporting copy — all in white/near-white), a pinned bottom area (primary CTA, optional secondary text action).
- All text on the hero background uses white or `white @ 90%` — never the standard `color.text.primary`/`color.text.secondary` tokens, which don't have sufficient contrast here.

**New button variant: Pill**
- Fully-rounded (`radius.full`), white fill, `color.primary.dark` text — the CTA variant for the Hero container specifically. Never used on a light/neutral surface (insufficient contrast against white).
- Sits alongside the existing Primary (filled, `color.primary`, for light surfaces) and Text (no fill, for secondary actions) variants from §6 — not a replacement for either.

**Flutter implementation:** `DriftHeroScaffold` (`mobile/lib/shared/widgets/drift_hero_scaffold.dart`), `DriftButton` with `DriftButtonVariant.pill` (`mobile/lib/shared/widgets/buttons/drift_button.dart`). First used in the Welcome screen (`mobile/lib/features/onboarding/presentation/welcome_screen.dart`).

---
*Previous: [`04-screen-inventory.md`](./04-screen-inventory.md) · Next: [`06-domain-technical-architecture.md`](./06-domain-technical-architecture.md)*
