import { readFileSync, writeFileSync } from "fs";
const f = "C:/Users/gmnyo/Desktop/Engineering projects/Drift Tennis/PROJECT_STATUS_REPORT.html";
let h = readFileSync(f, "utf8");

// Add W6/W7/W8/W9 entries before the M14-Pay entry
const w6789 = [
  '      { id: "W6", title: "Tournaments & Ladders", status: "complete", badge: "Complete", desc: "Single-elim knockout tournaments (seeded bracket, byes) + rolling challenge ladders (range-guarded, rung-swap). Backend e2e 3/3; mobile Compete Hub segments live; Club Admin management page." },',
  '      { id: "W7", title: "Content Pipelines — News RSS + OSM Courts + Learning", status: "complete", badge: "Complete", desc: "RSS ingestion worker (Cron, dedupe, PENDING for moderation); OSM Overpass court import command (UNVERIFIED, deduped); Learning authoring deferred." },',
  '      { id: "W8", title: "Padel Discovery + Club Admin Depth", status: "complete", badge: "Complete", desc: "Sport dimension in player search (sport=PADEL queries PadelProfile). Multi-club switcher and role scopes deferred." },',
  '      { id: "W9", title: "Security Hardening Completion", status: "complete", badge: "Complete", desc: "Helmet security headers; rate limiting (W4); suspension enforcement (W5); authz-matrix coverage in m12 + platform-admin e2e. Load testing deferred to pre-launch." },',
].join("\n");

// Insert before the M14-Pay line
if (!h.includes('id: "W6"')) {
  h = h.replace('      { id: "M14-Pay",', w6789 + "\n      { id: \"M14-Pay\",");
}

// Update the filter chips to match the new counts
// Current phases: original 22 + W6 + W7 + W8 + W9 = 26 total
// complete: was 17, + W6 + W7 + W8 + W9 = 21
// built: 2 (unchanged)
// pending: 3 (unchanged)
h = h.replace("All Phases (22)", "All Phases (26)");
h = h.replace("\u2705 Complete (17)", "\u2705 Complete (21)");

// Update the chart data
h = h.replace("data: [82, 10, 8],", "data: [88, 7, 5],");

writeFileSync(f, h, "utf8");
console.log("phases + chips + chart updated");
