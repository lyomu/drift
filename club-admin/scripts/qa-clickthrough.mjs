/**
 * M14 closure evidence — drives the real Club Admin + Platform Admin UIs
 * in your installed Chrome (headed, so a human can watch) and screenshots
 * every stop into ../../qa-evidence/.
 *
 *   node scripts/qa-clickthrough.mjs
 *
 * Prereqs: backend on :3009, club-admin on :3010, platform-admin on :3011.
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { execSync } from "child_process";

const CLUB = "http://localhost:3010";
const PLATFORM = "http://localhost:3011";
const OUT = new URL("../../qa-evidence/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
mkdirSync(OUT, { recursive: true });

const stamp = Date.now();
const log = (m) => console.log(`[qa] ${m}`);

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true });
  log(`📸 ${name}.png`);
}

const browser = await chromium.launch({ channel: "chrome", headless: false, slowMo: 120 });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20_000);

// Auto-accept confirm() dialogs (suspend/restore use them).
page.on("dialog", (d) => d.accept());

// ------------------------------------------------------------- CLUB ADMIN
log("Club Admin: login");
await page.goto(`${CLUB}/login`);
await page.getByLabel("Email").fill("owner@drift.test");
await page.getByLabel("Password").fill("Password123!");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(`${CLUB}/`);
await page.waitForLoadState("networkidle");
await shot(page, "01-club-dashboard");

// Leagues: create one through the real form.
log("Club Admin: create league");
await page.goto(`${CLUB}/leagues`);
await page.getByRole("button", { name: /create|new league/i }).first().click();
await page.getByLabel("League name").fill(`QA League ${stamp}`);
await page.getByLabel("Description").fill("Created by the M14 closure click-through.");
await page.getByLabel("Start date").fill("2026-09-01");
await page.getByLabel("End date").fill("2026-12-15");
await page.getByRole("button", { name: /create league/i }).click();
await page.waitForLoadState("networkidle");
await shot(page, "02-club-league-created");

// Announcements: publish one (member-visible fan-out path).
log("Club Admin: publish announcement");
await page.goto(`${CLUB}/announcements`);
await page.getByRole("button", { name: /new announcement/i }).click();
await page.getByLabel("Title").fill(`QA announcement ${stamp}`);
await page.getByLabel("Body").fill("Published by the closure click-through to verify the member fan-out.");
await page.getByRole("button", { name: "Publish", exact: true }).click();
await page.waitForLoadState("networkidle");
await shot(page, "03-club-announcement-published");

// Courts: claim/create one.
log("Club Admin: create court");
await page.goto(`${CLUB}/courts/new`);
await page.getByLabel("Name").fill(`QA Court ${stamp}`);
await page.getByLabel("Address").fill("1 QA Lane, Richmond");
await page.getByRole("button", { name: "Create court" }).click();
await page.waitForLoadState("networkidle");
await shot(page, "04-club-court-created");

// Disputes + Reports + Members: visual evidence.
await page.goto(`${CLUB}/disputes`);
await page.waitForLoadState("networkidle");
await shot(page, "05-club-disputes");

await page.goto(`${CLUB}/reports`);
await page.waitForLoadState("networkidle");
await shot(page, "06-club-reports");

await page.goto(`${CLUB}/members`);
await page.waitForLoadState("networkidle");
await shot(page, "07-club-members");

// ---------------------------------------------------------- PLATFORM ADMIN
log("Platform Admin: login");
await page.goto(`${PLATFORM}/login`);
await page.getByLabel("Email").fill("review@drift.local");
await page.getByLabel("Password").fill("DriftReview2026");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(`${PLATFORM}/`);
await page.waitForLoadState("networkidle");
await shot(page, "08-platform-overview");

// Seed one OPEN player report via the API so triage has something to chew.
log("Platform Admin: seed an OPEN player report via API");
const login = await fetch("http://localhost:3009/platform-admin/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "review@drift.local",
    password: "DriftReview2026",
  }),
}).then((r) => r.json());
const users = await fetch("http://localhost:3009/platform-admin/users?take=50", {
  headers: { Authorization: `Bearer ${login.accessToken}` },
}).then((r) => r.json());
const reporter = users.users.find((u) => u.email === "owner@drift.test");
const reported = users.users.find((u) => u.email !== "owner@drift.test");
if (reporter && reported) {
  // Report seeding needs a *player* token — /safety/* is a player surface.
  const playerLogin = await fetch("http://localhost:3009/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@drift.test", password: "Password123!" }),
  }).then((r) => r.json());
  await fetch("http://localhost:3009/safety/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${playerLogin.accessToken}`,
    },
    body: JSON.stringify({
      reportedUserId: reported.id,
      reason: "SPAM",
      notes: `QA triage seed ${stamp}`,
    }),
  });
}

// Users: search, suspend, verify, restore.
log("Platform Admin: suspend → restore cycle");
await page.goto(`${PLATFORM}/users`);
await page.getByPlaceholder(/search/i).fill("owner@drift.test");
await page.waitForLoadState("networkidle");
await shot(page, "09-platform-users-search");
await page.getByRole("button", { name: "Suspend" }).first().click();
await page.waitForLoadState("networkidle");
await shot(page, "10-platform-user-suspended");
await page.getByRole("button", { name: "Restore" }).first().click();
await page.waitForLoadState("networkidle");
await shot(page, "11-platform-user-restored");

// Reports: triage the seeded one to RESOLVED.
log("Platform Admin: triage report");
await page.goto(`${PLATFORM}/reports`);
await page.waitForLoadState("networkidle");
await shot(page, "12-platform-reports-open");
const resolveBtn = page.getByRole("button", { name: "Resolve" }).first();
if (await resolveBtn.isVisible().catch(() => false)) {
  await resolveBtn.click();
  await page.waitForLoadState("networkidle");
}
await shot(page, "13-platform-report-resolved");

// News: create a source, then moderate a seeded PENDING story.
log("Platform Admin: news source + moderation");
await page.goto(`${PLATFORM}/news/sources`);
await page.getByPlaceholder(/e\.g\.|name/i).fill(`QA Source ${stamp}`);
await page.getByRole("button", { name: /add source/i }).click();
await page.waitForLoadState("networkidle");
await shot(page, "14-platform-source-created");

// Seed a PENDING story for the first source directly (no ingestion yet).
const sources = await fetch("http://localhost:3009/platform-admin/news/sources", {
  headers: { Authorization: `Bearer ${login.accessToken}` },
}).then((r) => r.json());
const src = sources.sources.find((s) => s.name === `QA Source ${stamp}`);
if (src) {
  execSync(
    `docker exec drift_tennis_postgres psql -U drift -d drift_tennis -c "INSERT INTO news_stories (id, \\"sourceId\\", headline, highlight, \\"originalUrl\\", \\"publicationDate\\", categories, topics, \\"moderationStatus\\") VALUES (gen_random_uuid(), '${src.id}', 'QA story ${stamp}', 'Seeded for the moderation click-through.', 'https://example.test/qa', now(), '{LATEST}', '{}', 'PENDING');"`,
  );
}
await page.goto(`${PLATFORM}/news/stories`);
await page.waitForLoadState("networkidle");
await shot(page, "15-platform-stories-pending");
const approve = page.getByRole("button", { name: "Approve" }).first();
if (await approve.isVisible().catch(() => false)) {
  await approve.click();
  await page.waitForLoadState("networkidle");
}
await shot(page, "16-platform-story-approved");

// Disputes queue + audit trail.
await page.goto(`${PLATFORM}/disputes`);
await page.waitForLoadState("networkidle");
await shot(page, "17-platform-disputes");

await page.goto(`${PLATFORM}/audit-logs`);
await page.waitForLoadState("networkidle");
await shot(page, "18-platform-audit-trail");

await browser.close();
log("DONE — evidence in qa-evidence/");
