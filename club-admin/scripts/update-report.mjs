import { readFileSync, writeFileSync } from "fs";

const FILE = "C:/Users/gmnyo/Desktop/Engineering projects/Drift Tennis/PROJECT_STATUS_REPORT.html";
let html = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
const pairs = [
  // Hero
  ['<div class="hero-badge">Verified Cross-Reference Analysis</div>',
   '<div class="hero-badge">Verified Cross-Reference Analysis · Updated 2026-08-24</div>'],
  ['against the active <strong>Flutter, NestJS & Next.js codebase</strong>.',
   'against the active <strong>Flutter, NestJS & Next.js codebase</strong>. Every number below was re-executed against the live code on 2026-08-24.'],
  // Stats grid
  ['<div class="stat-value" style="color: var(--brand-primary);">~68%</div>',
   '<div class="stat-value" style="color: var(--brand-primary);">~74%</div>'],
  ['<div class="stat-value" style="color: var(--brand-accent);">82%</div>',
   '<div class="stat-value" style="color: var(--brand-accent);">88%</div>'],
  ['89 of 123 screens/views built',
   '85 screens shipped · every one under automated test'],
  ['<div class="stat-value" style="color: #60A5FA;">80%</div>',
   '<div class="stat-value" style="color: #60A5FA;">85%</div>'],
  ['28 Controllers · 26 Services · 46 Models',
   '29 Controllers · 27 Services · 48 Models'],
  ['338 of 338 Unit & E2E tests passing',
   '477 of 477 Unit & E2E tests passing'],
  // Progress bars — Flutter
  ['<span class="badge badge-complete">Core MVP Done</span>',
   '<span class="badge badge-complete">Core MVP Done · Fully Tested</span>'],
  ['<div class="progress-percent">82%</div>', '<div class="progress-percent">88%</div>'],
  ['<div class="progress-fill green" style="width: 82%;"></div>',
   '<div class="progress-fill green" style="width: 88%;"></div>'],
  ['89 screens built: Auth, Onboarding, Matchmaking, Scoring, Leagues, Court Finder, News, Skills.',
   '85 screens built & 100% test-covered: Auth, Onboarding, Matchmaking, Scoring, Leagues, Courts, News, Skills — plus behavioural match-loop suites (554 Flutter tests).'],
  // Progress bars — Backend (stat anchor consumed its 80%)
  ['<div class="progress-percent">80%</div>', '<div class="progress-percent">85%</div>'],
  ['<div class="progress-fill" style="width: 80%;"></div>',
   '<div class="progress-fill" style="width: 85%;"></div>'],
  ['46 DB models, Socket.io realtime gateway, custom Elo rating engine (1.0–7.0), round-robin generator.',
   '48 DB models, Socket.io gateway + Redis adapter, Elo engine, round-robin generator — plus rate limiting, the platform-admin API and 15 notification triggers.'],
  // Progress bars — Platform Admin
  ['<span class="badge badge-pending">Deferred (Phase W2)</span>',
   '<span class="badge badge-complete">v1 Shipped (Wave 5)</span>'],
  ['52 governance screens: Global user moderation, financial payouts, global dispute overrides.',
   'Governance v1 live (`platform-admin/`, 8 routes): user suspension, report triage, news moderation, dispute rulings, audit log. Remaining: payouts, CMS, full-scope verification.'],
  // Filter chips
  ['All Phases (19)', 'All Phases (22)'],
  ['✅ Complete (7)', '✅ Complete (10)'],
  ['🟡 Built / Testing (7)', '🟡 Built / Testing (9)'],
  ['❌ Backlog Pending (5)', '❌ Backlog Pending (3)'],
  // Feature matrix rows
  ['level calculation (1.0–7.0), resume mid-journey.</td>',
   'level calculation (1.0–7.0), resume mid-journey. Rate limiting on all credential routes (Wave 4).</td>'],
  ['Redis socket adapter for multi-instance scaling; message reporting button in chat thread UI.',
   'Redis adapter shipped (Wave 5.2). Chat attachments deferred by design; message-report triage now lives in Platform Admin.'],
  ['<td><span class="badge badge-built">85%</span></td>\n              <td>In-app Notification Center, deep linking by entity, privacy settings, profile edit, soft delete with token revocation.</td>',
   '<td><span class="badge badge-built">90%</span></td>\n              <td>In-app Notification Center, deep linking, 15 triggers incl. waitlist promotion + registration confirmations, stale-cache fix, privacy controls, soft delete.</td>'],
  // Platform Admin matrix row → shipped, plus new Security row
  [`            <tr>
              <td style="font-weight: 700; color: #FFF;">Platform Admin Dashboard</td>
              <td><span class="badge badge-pending">0%</span></td>
              <td>Not yet built (Deferred Phase W2).</td>
              <td>52 screens: Global user management, financial payouts, global dispute resolution, CMS.</td>
            </tr>`,
   `            <tr>
              <td style="font-weight: 700; color: #FFF;">Platform Admin Dashboard</td>
              <td><span class="badge badge-complete">v1 Shipped</span></td>
              <td>Wave 5: user search & suspension (kills live sessions), report triage for players/messages/courts, news source + story moderation, platform-wide dispute rulings, write-once audit log. Staff auth fully isolated from player JWTs.</td>
              <td>Financial payouts, CMS, court verification at full scope; manual browser click-through of the console.</td>
            </tr>
            <tr>
              <td style="font-weight: 700; color: #FFF;">Security Hardening</td>
              <td><span class="badge badge-built">60%</span></td>
              <td>Rate limiting on all credential routes, suspension enforced end-to-end (login + refresh + per-request JWT), admin audit trail.</td>
              <td>OWASP-style API audit, load testing, file-upload safety review (Phase M16).</td>
            </tr>`],
  // Sprints
  ['Sprint 1: Verification & Push</div>\n          <div style="font-size: 0.875rem; color: var(--text-muted);">Consolidated manual on-device QA of Phases M8–M14 + wire Firebase Cloud Messaging (FCM) credentials for live push notifications.',
   'Sprint 1: Owner-Keyed Integrations</div>\n          <div style="font-size: 0.875rem; color: var(--text-muted);">Firebase (FCM) + email provider credentials for live push & real OTP mail; court-data ingestion route decision (Google Places vs curated import).'],
  ['Sprint 3: Tournaments & Ladders</div>\n          <div style="font-size: 0.875rem; color: var(--text-muted);">Expand the competition engine from Round-Robin Leagues to Knockout Tournament elimination brackets & Ladder challenges.',
   'Sprint 3: Tournaments, Ladders & Padel Discovery</div>\n          <div style="font-size: 0.875rem; color: var(--text-muted);">Knockout brackets, ladder challenges, and sport-aware player/court/competition filters.'],
  ['Sprint 4: Platform Admin & Store Launch</div>\n          <div style="font-size: 0.875rem; color: var(--text-muted);">Build the Platform Admin Web App for ops, assemble store metadata, complete legal review, and publish release builds.',
   'Sprint 4: A11y/Perf Audit → Beta & Store Launch</div>\n          <div style="font-size: 0.875rem; color: var(--text-muted);">WCAG 2.2 AA + performance passes, store metadata, privacy review, release builds. Platform Admin v1 is done — extend, not build.'],
  // Slides
  ['The platform has achieved a <strong>~68% overall project completion rate</strong> with the <strong>Player Mobile App MVP at 82%</strong> and the <strong>Backend API at 80%</strong>.',
   'The platform stands at <strong>~74% overall completion</strong> — <strong>Mobile 88%</strong>, <strong>Backend hardened at 85%</strong>, <strong>Platform Admin v1 shipped</strong>. All numbers re-verified against the code on 2026-08-24.'],
  ['<div style="font-size: 2.2rem; font-weight: 800; color: var(--brand-accent);">89 Screens</div>\n          <div style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.4rem;">Flutter mobile screens & interactive sheets active</div>',
   '<div style="font-size: 2.2rem; font-weight: 800; color: var(--brand-accent);">85 Screens</div>\n          <div style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.4rem;">Flutter screens — every one under automated state-matrix test</div>'],
  ['<div style="font-size: 2.2rem; font-weight: 800; color: #60A5FA;">338 Tests</div>\n          <div style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.4rem;">100% backend unit & E2E tests passing</div>',
   '<div style="font-size: 2.2rem; font-weight: 800; color: #60A5FA;">477 Tests</div>\n          <div style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.4rem;">Backend unit & E2E green (plus 554 Flutter tests)</div>'],
  ['<div style="font-size: 2.2rem; font-weight: 800; color: #10B981;">15 Pages</div>\n          <div style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.4rem;">Next.js Club Admin portal baseline built</div>',
   '<div style="font-size: 2.2rem; font-weight: 800; color: #10B981;">23 Pages</div>\n          <div style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.4rem;">Club Admin (15) + Platform Admin (8) consoles live</div>'],
  // Slide 4: swap the Platform Admin red card for court ingestion
  [`        <div class="slide-card" style="border-color: rgba(239,68,68,0.3);">
          <div style="font-weight: 700; color: #EF4444; margin-bottom: 0.5rem;">🏢 Platform Admin Dashboard</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">52 internal management screens unbuilt (Deferred Phase W2).</div>
        </div>`,
   `        <div class="slide-card" style="border-color: rgba(239,68,68,0.3);">
          <div style="font-weight: 700; color: #EF4444; margin-bottom: 0.5rem;">🗺️ Court Data Ingestion</div>
          <div style="font-size: 0.9rem; color: var(--text-muted);">Map & profiles live; automated ingestion awaits a route decision.</div>
        </div>`],
  // Slide 5 steps
  ['1. Manual QA & FCM Push</div>\n          <div style="font-size: 0.9rem; color: var(--text-muted);">Emulator/device walkthrough + real push alerts.',
   '1. FCM Push + Court Ingestion</div>\n          <div style="font-size: 0.9rem; color: var(--text-muted);">Both blocked only on owner credentials / ingestion-route decision.'],
  ['3. Knockout Tournaments</div>\n          <div style="font-size: 0.9rem; color: var(--text-muted);">Add elimination bracket draws and ladder challenges.',
   '3. Tournaments, Ladders & Beta</div>\n          <div style="font-size: 0.9rem; color: var(--text-muted);">Elimination brackets + ladders, then a11y/perf audit into store release.'],
  // Phases array
  ['{ id: "M8", title: "Leagues, Seasons, Rounds & Standings", status: "built", badge: "Built · Awaiting QA", desc: "Round-robin engine, derive-on-read season progression, round deadlines, auto-walkovers, standings table." }',
   '{ id: "M8", title: "Leagues, Seasons, Rounds & Standings", status: "complete", badge: "Complete", desc: "Round-robin engine, derive-on-read progression, deadlines, auto-walkovers, standings. Closed: full fixture match played to Played on device; competitions e2e green." }'],
  ['{ id: "M9", title: "Court & Club Discovery", status: "built", badge: "Built · Awaiting QA", desc: "OpenStreetMap interactive map (`flutter_map`), CourtGroups (surfaces/lights), booking options sheet, report info." }',
   '{ id: "M9", title: "Court & Club Discovery", status: "complete", badge: "Complete", desc: "OpenStreetMap map, CourtGroups, booking options, report info. Closed: on-device discovery → club list → profile → Club Feed walkthrough with live data." }'],
  ['{ id: "M10", title: "Learning, Skills, Practice & Progress", status: "built", badge: "Built · Awaiting QA", desc: "7-dimension skill radar profile, blended scoring, practice logbook, goal linear pace tracking, progress reports." }',
   '{ id: "M10", title: "Learning, Skills, Practice & Progress", status: "complete", badge: "Complete", desc: "Skill radar, blended scoring, practice logbook, goal pace tracking, reports. Closed: learning e2e suite + full screen-matrix coverage." }'],
  ['{ id: "M11", title: "Tennis News & Content", status: "built", badge: "Built · Awaiting QA", desc: "8-category news feed, story highlights with attribution links, bookmarking & saved stories." }',
   '{ id: "M11", title: "Tennis News & Content", status: "complete", badge: "Complete", desc: "8-category feed, highlights with attribution, saved stories. Closed: news e2e suite + screen matrix; moderation now administered via Platform Admin." }'],
  ['{ id: "M12", title: "Notifications, Profile, Settings & Safety", status: "built", badge: "Built · Awaiting QA", desc: "In-app Notification Center, preference matrix, profile editor, granular privacy controls, soft delete." }',
   '{ id: "M12", title: "Notifications, Profile, Settings & Safety", status: "complete", badge: "Complete", desc: "Notification Center, preference matrix, privacy controls, soft delete. Closed: m12 e2e (suppression, visibility, delete-rejection) + device bell-badge and stale-cache fix verification." }'],
  ['{ id: "M13", title: "Padel Expansion (Core Loop)", status: "built", badge: "Built · Awaiting QA", desc: "16-pillar Padel assessment, dual sports profile (Tennis & Padel), Padel match scoring and rating updates." }',
   '{ id: "M13", title: "Padel Expansion (Core Loop)", status: "complete", badge: "Complete", desc: "16-pillar Padel assessment, dual sports profile, Padel scoring/rating loop. Closed: padel e2e (branch-lock, rating isolation) + composer sport-toggle test." }'],
  ['{ id: "M14", title: "Club / Community Admin Web App", status: "built", badge: "Built · Awaiting QA", desc: "Next.js 15 portal: Club setup, court management, leagues & seasons, member roles, announcements, dispute ruling." }',
   '{ id: "M14", title: "Club / Community Admin Web App", status: "complete", badge: "Complete", desc: "Next.js portal: club setup, courts, leagues & seasons, members, announcements, dispute ruling. Closed: 18-step Playwright click-through with screenshot evidence + club-admin e2e." }'],
  ['{ id: "M16", title: "Security Audit, Performance & Accessibility", status: "pending", badge: "Pending Backlog", desc: "OWASP API audit, screen-reader accessibility passes, backend load testing." }',
   '{ id: "M16", title: "Security Audit, Performance & Accessibility", status: "built", badge: "Partially Built", desc: "Rate limiting, suspension enforcement and admin audit trail shipped (Waves 4/5). Outstanding: OWASP audit, WCAG 2.2 AA pass, load testing." }'],
  ['{ id: "W2", title: "Platform Admin Management Dashboard", status: "pending", badge: "Pending Backlog", desc: "52 governance screens: Global user moderation, financial payouts, global dispute resolution, CMS." }',
   '{ id: "W2", title: "Platform Admin Dashboard", status: "built", badge: "Built · v1 Shipped", desc: "Wave 5 governance slice live: user suspension, report triage, news moderation, dispute rulings, audit log — separate staff credentials. Full 52-screen scope continues." }'],
  ['      { id: "M14-Pay",',
   '      { id: "W3", title: "Quality Gate — Mappers, Screen Matrix & Behavioural Tests", status: "complete", badge: "Complete", desc: "All 70 mappers, 4-state × dark/light matrix on all 85 screens, match-loop & onboarding-resume behavioural suites. Caught the Notification Preferences crash." },\n      { id: "W4", title: "Trust & Safety Hardening", status: "complete", badge: "Complete", desc: "Rate limiting on credential routes, waitlist-promotion + registration notifications, stale Notification Centre cache fix, e2e stabilization." },\n      { id: "W5.2", title: "Socket.io Redis Adapter", status: "complete", badge: "Complete", desc: "Multi-instance chat broadcast via @socket.io/redis-adapter with best-effort fallback." },\n      { id: "M14-Pay",'],
  // Chart
  ['data: [52, 28, 20],', 'data: [82, 10, 8],'],
];

let missed = [];
for (const [find, replace] of pairs) {
  if (html.includes(find)) html = html.replaceAll(find, replace);
  else missed.push(find.slice(0, 70));
}
writeFileSync(FILE, html, "utf8");
console.log(`applied ${pairs.length - missed.length}/${pairs.length}`);
if (missed.length) { console.log("MISSED:"); missed.forEach((m) => console.log("  " + m)); }
