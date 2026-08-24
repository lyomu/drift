# 07 — MVP Prioritisation & Implementation Order

**Drift Tennis — Phase 1 Foundation, Document 7 of 7**

---

## 1. Prioritisation Principle

Do not build everything simultaneously. Prioritise the Tennis core — a player who never touches Padel, competitions admin, or platform admin should still get a complete, valuable product. Padel, Club Admin, and Platform Admin are real but *sequenced* commitments, not simultaneous ones (this reconciles the brief's "one ecosystem" framing in Document 1 with the mobile-first override established in your earlier project docs).

## 2. P0 — Launch Requirement (Tennis, Mobile)

Everything a player needs for the full core loop (Discover → Play → Compete → Improve → Connect → Play Again) to work end-to-end, Tennis-only, mobile-only:

- Authentication (register/login/verify/reset)
- Tennis onboarding + adaptive level assessment
- Player profile (own + others')
- Player discovery + connections
- Match challenge + structured scheduling
- Court discovery (map/list/profile/contact/directions)
- Match result entry + confirmation + dispute (basic)
- Match history + basic statistics
- Competitive rating
- Leagues + seasons + fixtures + standings (core competition engine)
- Notifications (push, core categories only)
- Basic messaging (structured actions + simple chat)
- Home (personalised, dynamic)
- Privacy & safety basics (block/report, general-location-only discovery)

**Explicitly excluded from P0** (present in the docs but not required to launch a usable core loop): skill development detail beyond the onboarding assessment, practice logging, goals, drills/lessons, achievements, tournaments, ladders, coach discovery, Tennis news, advanced court booking, Padel, and both web admin apps (a small pilot can be operated manually/via direct database access if genuinely needed before Club Admin exists — this should be a deliberate, time-boxed decision, not a default assumption).

## 3. P1 — Important Growth Feature

- Skill development profile (full seven-dimension tracking beyond the onboarding baseline)
- Practice tracking, goals, drills, structured learning content
- Achievements
- Advanced statistics (recent form trends, head-to-head)
- Tournaments, ladders
- Coach discovery
- Tennis news
- Advanced court booking (native booking for partner venues)
- **Club / Community Admin web app** (moves club operations off manual workarounds)
- Payments/monetisation foundation (entitlements, subscriptions)

## 4. P2 — Future Enhancement

- Padel expansion (assessment, profile, contextual discovery/competition/learning)
- Platform Admin dashboard (needed once the platform must scale past what founder-level manual ops can handle)
- Advanced analytics/cohort reporting
- Coach-submitted development feedback
- Sponsorships/promotions, coaching marketplace fees, booking commissions
- Video/AI-assisted stroke analysis (explicitly out of scope per the source BRD)
- Wearable integrations (explicitly out of scope per the source BRD)

## 4.5 Open Dependencies to Resolve Before Build

- **Sharp Sans Display font license.** The design system (Document 5 §3) specifies Sharp Sans Display as the display/headline typeface, paired with Outfit for body/UI. Sharp Sans Display is a commercial typeface requiring a purchased license before it can ship in production Flutter/Next.js builds. Track this as a P0 procurement item — design-system build-out (implementation step 2 below) should start against the free **Space Grotesk** fallback and swap in the licensed font without rework once secured, rather than blocking on it.
- **Minors / age-gating policy** (Document 6 §4) — parental consent flow and minimum age need a legal/compliance decision before onboarding (implementation step 3) ships.

## 5. Recommended Implementation Order

This is the order actually used to sequence build phases (M0 onward in your existing phased docs) — it deliberately does **not** interleave web admin or Padel work into the mobile build, per your mobile-first override:

1. **Foundation & requirements** — this document set (Documents 1-7)
2. **Design system build-out** — tokens → Flutter theme + component library (Document 5)
3. **Authentication & Tennis onboarding** (incl. adaptive assessment engine) — Document 3 §2-3
4. **Home** — dynamic personalisation logic — Document 3 primary journey
5. **Player discovery, profiles, connections** — Document 3 §4.1
6. **Match challenge, scheduling, messaging** — Document 3 §4.2
7. **Match results, ratings, statistics** — Document 3 §4.3
8. **Competition engine — leagues, seasons, rounds, standings** — Document 3 §5
9. **Court discovery** — Document 3 §6
10. **Learning, skill development, practice, goals** — Document 3 §8
11. **Tennis news** — Document 3 (Follow pillar)
12. **Notifications, profile, settings, safety hardening**
13. *(Mobile reaches a stable, launchable milestone — pilot/beta candidate)*
14. **Club / Community Admin web app** — Document 3 §10, Document 4 Part B
15. **Platform Admin dashboard** — Document 3 §11, Document 4 Part C
16. **Padel expansion** — Document 3 §9
17. **Payments & monetisation**
18. **Analytics, moderation, privacy hardening at scale**
19. **QA, accessibility, performance, security pass**
20. **Beta, launch, post-launch optimisation**

## 6. Success Metrics (carried from the source BRD, restated for traceability)

| Metric | Target |
|---|---|
| Activation | 60% of new users complete profile, skill baseline, and first court search |
| Engagement | 40% monthly active users log a match, practice session, or learning activity |
| Court coverage | 200 verified courts/profiles in the first launch market |
| Community adoption | 50 clubs/communities onboarded in first 6-12 months |
| Retention | 30-day retention above 35% for users who join a community or log progress |
| Revenue | Paid club/community subscription conversion from verified venues |

These map directly to the analytics taxonomy in Document 6 §5 — every metric above has at least one underlying event that measures it.

---

## Foundation Package — Complete

This closes the Phase 1 Foundation:

| # | Document | Status |
|---|---|---|
| 1 | [Product Strategy](./01-product-strategy.md) | ✅ |
| 2 | [Information Architecture](./02-information-architecture.md) | ✅ |
| 3 | [User Journeys](./03-user-journeys.md) | ✅ |
| 4 | [Screen Inventory](./04-screen-inventory.md) (219 screens) | ✅ |
| 5 | [Design System](./05-design-system.md) | ✅ |
| 6 | [Domain & Technical Architecture](./06-domain-technical-architecture.md) | ✅ |
| 7 | MVP Roadmap (this document) | ✅ |

**Per the stop condition: no production code, no Flutter/Next.js/NestJS scaffolding, and no high-fidelity screens have been produced.** This package is ready for your review. Implementation begins only after you approve it.

---
*Previous: [`06-domain-technical-architecture.md`](./06-domain-technical-architecture.md) · Start over: [`01-product-strategy.md`](./01-product-strategy.md)*
