import { readFileSync } from "fs";
const f = "C:/Users/gmnyo/Desktop/Engineering projects/Drift Tennis/PROJECT_STATUS_REPORT.html";
let h = readFileSync(f, "utf8");

// Check what needs fixing
const checks = [
  ["progress-percent 88", h.includes('progress-percent">88%')],
  ["progress-percent 92", h.includes('progress-percent">92%')],
  ["slide1 ~74", h.includes("~74% overall")],
  ["slide1 ~78", h.includes("~78% overall")],
  ["leagues old desc", h.includes("Circle-method round-robin")],
  ["width 88", h.includes("width: 88%")],
  ["width 92", h.includes("width: 92%")],
  ["width 30", h.includes("width: 30%")],
  ["width 35", h.includes("width: 35%")],
  ["progress-percent 30", h.includes('progress-percent">30%')],
  ["progress-percent 35", h.includes('progress-percent">35%')],
];
checks.forEach(([label, val]) => console.log(`${label}: ${val}`));
