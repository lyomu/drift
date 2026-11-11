"""
tools/real_clips_phase0.py
──────────────────────────
Phase 0 re-run on a folder of real clips: the precheck verdict plus one pass of the real
pipeline (main.py) per clip, collecting the numbers the go/no-go needs: court line
support and gate, ball detection rate, player selection, and any crash.

Same settings as the 2026-09-29 run (--fast, fresh detection) so the two are comparable,
with --max-frames raised to 300 (10 s at 30 fps).

    python tools/real_clips_phase0.py data/real_clips
    python tools/real_clips_phase0.py data/real_clips --report-only

Results go to <folder>/phase0_results.json, next to the clips (gitignored).
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_precheck(clip: Path) -> dict:
    r = subprocess.run([sys.executable, "cli.py", "precheck", str(clip), "--json"],
                       cwd=ROOT, capture_output=True, text=True, timeout=900)
    if r.returncode not in (0, 1) or not r.stdout.strip().startswith("{"):
        start = r.stdout.find("{")
        if start < 0:
            return {"error": (r.stderr or r.stdout)[-800:]}
        return json.loads(r.stdout[start:])
    return json.loads(r.stdout[r.stdout.find("{"):])


def run_analyze(clip: Path, max_frames: int) -> dict:
    before = set(glob.glob(str(ROOT / "output/stats/summary_*.json")))
    started = time.time()
    r = subprocess.run(
        [sys.executable, "main.py", "--input", str(clip),
         "--output", f"output/videos/real_{clip.stem}.avi",
         "--config", "configs/config.yaml",
         "--max-frames", str(max_frames), "--fast", "--no-stubs"],
        cwd=ROOT, capture_output=True, text=True, timeout=3600,
    )
    elapsed = round(time.time() - started, 1)
    if r.returncode != 0:
        return {"crashed": True, "elapsed_s": elapsed, "stderr_tail": r.stderr[-1500:]}
    new = set(glob.glob(str(ROOT / "output/stats/summary_*.json"))) - before
    if not new:
        return {"crashed": False, "no_summary": True, "elapsed_s": elapsed,
                "stdout_tail": r.stdout[-1500:], "stderr_tail": r.stderr[-1500:]}
    with open(max(new), encoding="utf-8") as f:
        return {"crashed": False, "elapsed_s": elapsed, "summary": json.load(f)}


def report(results: dict) -> None:
    print("| Clip | Precheck | Court line support | Court gate | Ball detected | Players | Notes |")
    print("|---|---|---|---|---|---|---|")
    passed = 0
    for clip, res in results.items():
        pre = res.get("precheck", {})
        verdict = pre.get("verdict", pre.get("status", "?"))
        a = res.get("analyze", {})
        if a.get("crashed"):
            last = a["stderr_tail"].strip().splitlines()[-1:] or ["?"]
            print(f"| {clip} | {verdict} | - | CRASH | - | - | {last[0][:90]} |")
            continue
        s = a.get("summary", {})
        sup = s.get("court_line_support")
        gate = "PASS" if s.get("court_calibrated") else "FAIL"
        passed += gate == "PASS"
        ball = s.get("ball", {})
        cov = ball.get("raw_coverage", ball.get("coverage"))
        ball_txt = f"{cov:.0%}" if isinstance(cov, (int, float)) else "-"
        sel = s.get("player_selection", {}).get("status", "-")
        print(f"| {clip} | {verdict} | {sup} | {gate} | {ball_txt} | {sel} | |")
    print(f"\nCourt gate: {passed}/{len(results)} passed.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--max-frames", type=int, default=300)
    ap.add_argument("--report-only", action="store_true")
    args = ap.parse_args()

    folder = Path(args.folder).resolve()
    out = folder / "phase0_results.json"
    if args.report_only:
        report(json.loads(out.read_text(encoding="utf-8")))
        return 0

    results = {}
    for clip in sorted(folder.glob("*.mp4")):
        print(f"--- {clip.stem}", flush=True)
        results[clip.stem] = {"precheck": run_precheck(clip),
                              "analyze": run_analyze(clip, args.max_frames)}
        out.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    report(results)
    return 0


if __name__ == "__main__":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    sys.exit(main())
