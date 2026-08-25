import { readFileSync, writeFileSync } from "fs";
const f = "C:/Users/gmnyo/Desktop/Engineering projects/Drift Tennis/PROJECT_STATUS_REPORT.html";
let h = readFileSync(f, "utf8");
h = h.split("'Built - Awaiting QA'").join("'Built / Partial'");
writeFileSync(f, h, "utf8");
console.log("legend updated");
