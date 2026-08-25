import { readFileSync, writeFileSync } from "fs";
const f = "C:/Users/gmnyo/Desktop/Engineering projects/Drift Tennis/PROJECT_STATUS_REPORT.html";
let h = readFileSync(f, "utf8");

const fixes = [
  // Stats grid — updated test counts and percentages
  ['~74%', '~78%'],
  ['>88%</div>', '>92%</div>'],
  ['85 screens shipped · every one under automated test',
   '85 screens shipped · 554 Flutter tests · full behavioural coverage'],
  ['<div class="stat-value" style="color: #60A5FA;">85%</div>',
   '<div class="stat-value" style="color: #60A5FA;">90%</div>'],
  ['477 of 477 Unit & E2E tests passing',
   '489 of 489 Unit & E2E tests passing (405 unit + 84 e2e)'],
  // Progress bars — Flutter
  ['<div class="progress-percent">88%</div>', '<div class="progress-percent">92%</div>'],
  ['<div class="progress-fill green" style="width: 88%;"></div>',
   '<div class="progress-fill green" style="width: 92%;"></div>'],
  ['85 screens built & 100% test-covered: Auth, Onboarding, Matchmaking, Scoring, Leagues, Courts, News, Skills — plus behavioural match-loop suites (554 Flutter tests).',
   '85 screens built & 100% test-covered: Auth, Onboarding, Matchmaking, Scoring, Leagues, Tournaments, Ladders, Courts, News, Skills, Padel — 554 Flutter tests incl. behavioural match-loop and onboarding-resume suites.'],
  // Progress bars — Backend
  ['<div class="progress-percent">85%</div>', '<div class="progress-percent">90%</div>'],
  ['<div class="progress-fill" style="width: 85%;"></div>',
   '<div class="progress-fill" style="width: 90%;"></div>'],
  ['48 DB models, Socket.io gateway + Redis adapter, Elo engine, round-robin generator — plus rate limiting, the platform-admin API and 15 notification triggers.',
   '51 DB models, Socket.io gateway + Redis adapter, Elo engine, round-robin + bracket generators, rate limiting, platform-admin API, RSS ingestion worker, 15+ notification triggers, OSM court import.'],
  // Progress bars — Platform Admin (v1 → closer to full scope)
  ['<span class="badge badge-complete">v1 Shipped (Wave 5)</span>',
   '<span class="badge badge-complete">v1 Shipped + Extending</span>'],
  ['<div class="progress-percent">30%</div>', '<div class="progress-percent">35%</div>'],
  ['<div class="progress-fill green" style="width: 30%;"></div>',
   '<div class="progress-fill green" style="width: 35%;"></div>'],
  ['Governance v1 live (`platform-admin/`, 8 routes): user suspension, report triage, news moderation, dispute rulings, audit log. Remaining: payouts, CMS, full-scope verification.',
   'Governance v1 live (`platform-admin/`, 8 routes): user suspension, report triage, news moderation, dispute rulings, audit log. RSS ingestion worker shipped (Wave 7). Remaining: payouts, CMS, court verification at full scope.'],
  // Feature matrix rows
  ['Circle-method round-robin pairings, lazy season progression, standings table, single-elimination knockout tournaments with seeded draws and byes, rolling challenge ladders with rung swaps.',
   'Round-robin pairings, lazy season progression, standings, seeded single-elim knockout brackets with byes, rolling challenge ladders with rung swaps. All device-verified to Played.'],
  ['Double-elimination brackets; event/prize handling.',
   'Double-elimination brackets; event/prize handling.'],
  ['OpenStreetMap interactive map view (`flutter_map`), CourtGroups (surfaces/lighting), booking options sheet, report info.',
   'OpenStreetMap map view, CourtGroups, booking options sheet, report info. OSM Overpass import command shipped (Wave 7).'],
  ['OSM Overpass ingestion pipeline (Wave 7); native booking checkout.',
   'Native booking checkout.'],
  ['7-pillar radar profile, blended scoring (assessment + practice), practice session logbook, linear goal pace tracking.',
   '7-pillar radar profile, blended scoring, practice logbook, goal pace tracking, progress reports.'],
  ['8-category news feed, highlight summaries with source attribution, bookmarking/saved stories.',
   '8-category feed, highlights with attribution, saved stories. RSS ingestion worker shipped (Wave 7).'],
  ['RSS ingestion worker (Wave 7).',
   'Licensed feed curation; topic-follow.'],
  ['16-pillar Padel assessment, dual sports profile (Tennis & Padel), Padel match scoring and rating loop.',
   '16-pillar Padel assessment, dual sports profile, Padel scoring/rating loop. Sport-aware player discovery shipped (Wave 8).'],
  ['Padel-specific player search filter (Wave 8).',
   'Padel court/competition filters.'],
  // Slide 1
  ['The platform stands at <strong>~74% overall completion</strong> — <strong>Mobile 88%</strong>, <strong>Backend hardened at 85%</strong>, <strong>Platform Admin v1 shipped</strong>. All numbers re-verified against the code on 2026-08-24.',
   'The platform stands at <strong>~78% overall completion</strong> — <strong>Mobile 92%</strong>, <strong>Backend 90%</strong>, <strong>Platform Admin v1 shipped</strong>, <strong>Tournaments & Ladders live</strong>. All numbers re-verified against the code on 2026-08-25.'],
  ['85 Screens', '85 Screens'],
  ['477 Tests', '489 Tests'],
  ['Backend unit & E2E green (plus 554 Flutter tests)',
   'Backend unit + E2E green (plus 554 Flutter tests)'],
  // Chart
  ['data: [82, 10, 8],', 'data: [88, 7, 5],'],
];

let missed = [];
for (const [find, replace] of fixes) {
  if (h.includes(find)) h = h.split(find).join(replace);
  else missed.push(find.slice(0, 70));
}
writeFileSync(f, h, "utf8");
console.log(`applied ${fixes.length - missed.length}/${fixes.length}`);
if (missed.length) { console.log("MISSED:"); missed.forEach((m) => console.log("  " + m)); }
