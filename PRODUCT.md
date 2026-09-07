# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are **Tennis players of every level** — beginners who don't know who to play with, developing social players who want to play more often, and competitive league players who care about verified ratings and standings. Secondary audiences: **coaches** (discoverability, learner progress), **club/community admins** (run competitions, members, announcements, courts on a web dashboard), and **padel players** (opt-in second sport). The landing page's primary visitor is a Tennis player deciding whether to download the app; club admins are a secondary track.

## Product Purpose

Drift Tennis is a Tennis-first ecosystem that helps players **discover** where and who to play, **play** more Tennis, **compete** in structured formats (leagues, seasons, rounds, fixtures, standings), **improve** through a real development system (adaptive assessment, skill profile, lessons, drills, goals), **connect** with a local Tennis community (connections, messaging, clubs, announcements), and **follow** the sport (categorised Tennis news). It exists to create a continuous loop: DISCOVER → PLAY → COMPETE → IMPROVE → CONNECT → PLAY AGAIN.

## Positioning

For Tennis players of every level, Drift Tennis turns "I should play more Tennis" into an actual match, an actual improvement plan, and an actual community — one Tennis-native product instead of fragmented tools (a booking app here, a WhatsApp group there, a spreadsheet ladder somewhere else). The mechanism a generic sports-social app cannot copy: one verified loop from player discovery → structured match scheduling → opponent-confirmed results → a real Elo-style rating → skill development profile, all in one place. **Tennis is unambiguously first**; Padel is a real but opt-in, additive second sport.

## Operating Context

- Mobile app is the player surface (Flutter, Android-first; iOS follows). Club Admin and Platform Admin are Next.js web consoles. One shared design system and one product vocabulary across all surfaces ("Fixture" means the same thing everywhere).
- Deployed at `drift.einsbrand.com` (API at `/api`, consoles, admin basic-auth on staging). Launch posture: Android first, app users free at launch, clubs pay via IntaSend subscriptions (KES pricing, Kenya/East-Africa market).
- This landing page is a new Next.js app in the monorepo (`website/`), player-first with a clubs section.

## Capabilities and Constraints

- Real shipped capabilities to speak to: adaptive NTRP-style assessment (1.0–7.0), player discovery with level/distance compatibility, match challenge + structured time proposals (no chat-only scheduling), opponent-confirm/dispute results, Elo-style rating on the same 1.0–7.0 scale, leagues with seasons/rounds/fixtures/standings, court & club discovery, learning centre with skill-score blend, Tennis news, in-app notifications, padel profile and rating.
- 18+ only at launch (age policy gate at signup). Account deletion/request has a web requirement pending (tracker P.7).
- Undecided / do not claim: app-store download links (Play Store submission in progress), specific club pricing numbers on the public page, testimonials/user counts (none exist — never fabricate).

## Brand Commitments

- Name: **Drift Tennis**. Tennis-first, never "racket sports" or "multi-sport".
- Palette: primary `#1C91D0`, primaryDark `#126A9B`, primaryLight `#E8F5FC`; light background `#F7FAFC`; text `#111827` / `#6B7280`; border `#E5E7EB`; semantic green/amber/red surfaces per design system (foundation/05-design-system.md, mobile/lib/core/theme/).
- Typography: **DM Sans** is the single family (display, heading, body, UI), zero letter-spacing. Outfit was dropped in the 2026 header redesign.
- Voice: honest, non-intimidating, player-respecting. No fake scarcity, no hype, no fabricated data — the product itself follows a "never fabricate" rule and the landing page must too.

## Evidence on Hand

- Full product foundation: `foundation/01-product-strategy.md` (vision, positioning, personas, feature map), `04-screen-inventory.md` (219 screens), `05-design-system.md` (tokens).
- Real app screens exist in the Flutter app; no marketing screenshots, photography, press, testimonials, or download-store links exist yet. Anything shown as app imagery must be labelled as illustrative until replaced with real screenshots.

## Product Principles

1. The loop wins: every page and every claim ties back to DISCOVER → PLAY → COMPETE → IMPROVE → CONNECT.
2. Never fabricate: no invented users, numbers, reviews, or capabilities.
3. Tennis says its name in the first five seconds; Padel is additive.
4. Meet players where they are — beginner-safe by design, honest about level.

## Accessibility & Inclusion

Standard web accessibility (WCAG AA contrast, keyboard navigable, semantic HTML). Beginner-friendliness is a product value: copy must not intimidate new players.
