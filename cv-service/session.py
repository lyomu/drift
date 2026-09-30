"""
session.py
──────────
Analyse a whole practice session: find the rallies, run each one, roll them up.

Why this is a separate entry point and not a flag on `main.py`
-------------------------------------------------------------
`main.py` analyses one continuous passage of play, and every number it produces assumes
that. Making it loop over segments internally would mean one process holding two very
different contracts, and the stage numbering ("[2/9] Player detection...") would start
lying. This orchestrates `main.py` instead, once per rally.

Each rally runs as a **subprocess**, for three reasons, all of which this repo has already
paid for:

1. `main.py:main()` reads `sys.argv`. Calling it in-process would mean mutating process
   globals per segment.
2. A CUDA fault kills the subprocess, not the session. `eval/heldout_segments.py` runs the
   pipeline the same way and records `crashed` per clip for exactly this reason.
3. Memory is released between rallies. A session is the case where a leak in any of three
   models compounds twenty times over.

The runtime problem, which is the real design constraint
-------------------------------------------------------
Measured: ~0.63 s/frame on an RTX 4060 (38 s for 60 frames, `PROGRESS.md`). A 10-minute
session at 30 fps is 18,000 frames, so analysing all of it is about 3 hours. Even after
segmentation, a session holding 20 rallies of 15 s is 9,000 frames — about 1.6 hours — on a
service that runs **one analysis at a time because it has one GPU**.

So a session cannot simply be analysed. It runs under a **frame budget**, and the honest
part is what happens at the edge: every span the segmenter found is reported, each with its
status, and the ones that did not fit say so. `segments_found` and `segments_analysed` travel
together in the output. The failure this avoids is a session summary over 8 rallies that
looks exactly like a session summary over all 20.

One span larger than the entire budget is the remaining edge case. It is analysed
**truncated** rather than skipped, with `truncated: true` and both frame counts recorded —
because a session that reports nothing at all is less useful than one that reports a partial
rally and says it is partial.

Usage
-----
    tennis-vision session input_videos/practice.mp4
    tennis-vision session practice.mp4 --frame-budget 3000 --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import yaml

from utils.rally_segmenter import (
    RallySpan,
    describe,
    cut_span,
    segment_session,
)
from utils.session_aggregate import (
    ANALYSED,
    FAILED,
    SKIPPED_BUDGET,
    aggregate_session,
)

# Frames of rally footage one session analysis may spend. 5,400 frames is ~3 minutes of
# play, which at the measured ~0.63 s/frame is about 55 minutes of GPU.
#
# PROVISIONAL, and it is a policy choice rather than a measurement: it trades how much of a
# session gets measured against how long one upload may occupy the only GPU. It belongs in
# config precisely so it can be raised on dedicated hardware without a code change.
DEFAULT_FRAME_BUDGET = 5400

# Per-segment pipeline timeout. Generous against a slow card; bounds a hung run rather than
# predicting a healthy one, matching the reasoning in the backend's own analysis timeout.
SEGMENT_TIMEOUT_S = 3600


def _segment_config(base_config: str, stats_dir: Path, workdir: Path) -> Path:
    """
    A per-segment config whose only job is to redirect the stats output.

    `main.py` writes `summary_<timestamp>.json` into `io.output_stats_dir`, and the
    timestamp is the only thing distinguishing runs. `eval/heldout_segments.py` recovers the
    new file by diffing a glob before and after, which races if anything else writes there
    and cannot tell two runs in the same second apart. Giving each segment its own directory
    makes the answer unambiguous instead.

    Config layering does the rest: `load_config` applies built-in defaults, then
    `configs/config.yaml`, then this file — so only the redirect is stated here and every
    real setting still comes from the base config.
    """
    path = workdir / "segment_config.yaml"
    overrides = {"io": {"output_stats_dir": str(stats_dir)}}
    if base_config and os.path.abspath(base_config) != os.path.abspath(
            "configs/config.yaml"):
        # An explicitly chosen config is layered in by main.py itself only when it IS the
        # requested file, so its contents are copied forward here rather than lost.
        with open(base_config, encoding="utf-8") as f:
            chosen = yaml.safe_load(f) or {}
        for section, values in chosen.items():
            if isinstance(values, dict):
                overrides.setdefault(section, {}).update(values)
            else:
                overrides[section] = values
        overrides["io"]["output_stats_dir"] = str(stats_dir)

    with open(path, "w", encoding="utf-8") as f:
        yaml.safe_dump(overrides, f)
    return path


def _read_summary(stats_dir: Path) -> dict | None:
    """The one summary in this segment's own stats directory, or None if it wrote none."""
    candidates = sorted(stats_dir.glob("summary_*.json"))
    if not candidates:
        return None
    # Last by name is last by timestamp, since the stamp is the filename. More than one
    # means the pipeline ran twice into the same directory, which should not happen — take
    # the newest rather than guessing, and the count is reported by the caller.
    with open(candidates[-1], encoding="utf-8") as f:
        return json.load(f)


def analyse_span(
    video_path: str,
    span: RallySpan,
    index: int,
    workdir: Path,
    base_config: str,
    max_frames: int = 0,
) -> dict:
    """
    Cut one span out and run the pipeline over it.

    Returns a segment record: always a `status`, and a `summary` when one was produced. It
    does not raise on a failed rally — one bad segment must not abandon the session, and a
    `failed` status with its reason is more useful downstream than an exception that loses
    the twelve rallies already measured.
    """
    seg_dir = workdir / f"segment_{index:03d}"
    stats_dir = seg_dir / "stats"
    stats_dir.mkdir(parents=True, exist_ok=True)

    clip = seg_dir / "rally.mp4"
    written = cut_span(video_path, span, str(clip))
    record: dict = {
        "index": index,
        "span": span.as_dict(),
        "frames_written": written,
    }

    if written == 0:
        record.update(status=FAILED,
                      reason="The rally could not be cut out of the source video.")
        return record

    config_path = _segment_config(base_config, stats_dir, seg_dir)
    command = [
        sys.executable, "main.py",
        "--input", str(clip),
        "--output", str(seg_dir / "rally.avi"),
        "--config", str(config_path),
    ]
    if max_frames:
        command += ["--max-frames", str(max_frames)]
        record["truncated"] = True
        record["truncated_to_frames"] = max_frames

    started = time.perf_counter()
    try:
        completed = subprocess.run(command, capture_output=True, text=True,
                                   timeout=SEGMENT_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        record.update(status=FAILED, elapsed_s=round(time.perf_counter() - started, 1),
                      reason=f"The rally took longer than {SEGMENT_TIMEOUT_S}s to analyse.")
        return record

    record["elapsed_s"] = round(time.perf_counter() - started, 1)

    if completed.returncode != 0:
        record.update(status=FAILED,
                      reason="The analysis of this rally failed.",
                      # Tail only. A full pipeline log per failed segment would swamp the
                      # session summary that a person actually reads.
                      stderr_tail=completed.stderr[-800:] if completed.stderr else "")
        return record

    summary = _read_summary(stats_dir)
    if summary is None:
        record.update(status=FAILED,
                      reason="The rally was analysed but produced no summary.")
        return record

    # Carried for the aggregator's player-speed weighting, which has no per-segment
    # denominator of its own in the summary. Prefixed to mark it as added here rather than
    # produced by the pipeline.
    summary["_frames"] = written
    record.update(status=ANALYSED, summary=summary)
    return record


def run_session(
    video_path: str,
    court_detector=None,
    frame_budget: int = DEFAULT_FRAME_BUDGET,
    base_config: str = "configs/config.yaml",
    workdir: str | None = None,
    keep_workdir: bool = False,
    progress=None,
) -> dict:
    """
    Segment a session, analyse what fits in the budget, and aggregate the result.

    Args:
        video_path: the session clip.
        court_detector: passed to the segmenter. Without it the pre-pass rests on motion
            alone and says so — see `utils/rally_segmenter.segment_session`.
        frame_budget: rally frames this session may spend. See DEFAULT_FRAME_BUDGET.
        base_config: the pipeline config each rally is analysed with.
        workdir: where cut rallies and per-segment output go. A temp directory by default,
            removed afterwards unless `keep_workdir`.
        progress: optional `callable(stage, done, total)`; `stage` is "segmenting" or
            "analysing".

    Returns:
        The session summary from `utils.session_aggregate.aggregate_session`, with the
        segmentation pre-pass's own result attached under `segmentation`.
    """
    own_workdir = workdir is None
    root = Path(workdir or tempfile.mkdtemp(prefix="session-"))
    root.mkdir(parents=True, exist_ok=True)

    try:
        segmentation = segment_session(
            video_path,
            court_detector=court_detector,
            progress=(lambda done, total: progress("segmenting", done, total))
            if progress else None,
        )

        records: list[dict] = []
        spent = 0
        analysed_any = False

        for index, span in enumerate(segmentation.spans):
            remaining = frame_budget - spent

            if remaining <= 0:
                records.append({
                    "index": index,
                    "span": span.as_dict(),
                    "status": SKIPPED_BUDGET,
                    "reason": (
                        f"This session's analysis budget of {frame_budget} frames was "
                        f"already spent on earlier rallies."
                    ),
                })
                continue

            # A span that does not fit is skipped whole — except the first, where skipping
            # would mean measuring nothing at all. That one is truncated and says so.
            max_frames = 0
            if span.frames > remaining:
                if analysed_any:
                    records.append({
                        "index": index,
                        "span": span.as_dict(),
                        "status": SKIPPED_BUDGET,
                        "reason": (
                            f"This rally is {span.frames} frames and only {remaining} "
                            f"remained in the session's analysis budget."
                        ),
                    })
                    continue
                max_frames = remaining

            if progress:
                progress("analysing", len(records) + 1, len(segmentation.spans))

            record = analyse_span(video_path, span, index, root, base_config,
                                  max_frames=max_frames)
            records.append(record)
            # Budget is charged for work actually done, so a failed rally does not consume
            # the session's allowance for rallies that might have succeeded.
            if record.get("status") == ANALYSED:
                analysed_any = True
                spent += record.get("frames_written", span.frames)

        session = aggregate_session(records)
        session["segmentation"] = segmentation.as_dict()
        session["frame_budget"] = frame_budget
        session["frames_analysed"] = spent
        session["source_video"] = os.path.basename(video_path)
        return session
    finally:
        if own_workdir and not keep_workdir:
            shutil.rmtree(root, ignore_errors=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="tennis-vision session",
        description="Find the rallies in a long clip and analyse each one.",
    )
    parser.add_argument("input", help="path to the session video")
    parser.add_argument("-o", "--output", default="", metavar="PATH",
                        help="write the session summary JSON here")
    parser.add_argument("--config", default="configs/config.yaml",
                        help="pipeline config each rally is analysed with")
    parser.add_argument("--frame-budget", type=int, default=0, metavar="N",
                        help=f"rally frames to spend (default from config, "
                             f"else {DEFAULT_FRAME_BUDGET})")
    parser.add_argument("--dry-run", action="store_true",
                        help="segment only: list the rallies found and analyse nothing")
    parser.add_argument("--no-court", action="store_true",
                        help="skip the court model in the pre-pass (motion only, faster)")
    parser.add_argument("--keep-workdir", action="store_true",
                        help="keep the cut rallies and per-segment output for inspection")
    args = parser.parse_args(argv)

    if not os.path.exists(args.input):
        print(f"error: no such file: {args.input}", file=sys.stderr)
        return 2

    court = None
    if not args.no_court:
        try:
            from court_line_detector import CourtLineDetector

            import main as pipeline

            cfg = pipeline.load_config(args.config)
            court = CourtLineDetector(cfg["models"]["court"])
        except Exception as exc:
            # A missing court model degrades the pre-pass rather than stopping it, and the
            # degradation is stated. Refusing to segment without a 95 MB model would make
            # the cheap path unavailable in exactly the case it exists for.
            print(f"warning: court model unavailable ({exc}); "
                  f"segmenting on motion alone", file=sys.stderr)

    if args.dry_run:
        result = segment_session(args.input, court_detector=court)
        print(describe(result))
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(result.as_dict(), f, indent=2)
            print(f"\nSegmentation JSON -> {args.output}")
        return 0

    budget = args.frame_budget
    if budget <= 0:
        try:
            import main as pipeline

            budget = int(pipeline.load_config(args.config)
                         .get("session", {})
                         .get("frame_budget", DEFAULT_FRAME_BUDGET))
        except Exception:
            budget = DEFAULT_FRAME_BUDGET

    def show(stage: str, done: int, total: int) -> None:
        print(f"\r  {stage}: {done}/{total}", end="", file=sys.stderr, flush=True)

    session = run_session(args.input, court_detector=court, frame_budget=budget,
                          base_config=args.config, keep_workdir=args.keep_workdir,
                          progress=show)
    print(file=sys.stderr)

    print(describe_session(session))

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(session, f, indent=2)
        print(f"\nSession JSON -> {args.output}")
    return 0


def describe_session(session: dict) -> str:
    """Human-readable session report, for the CLI and the logs."""
    lines = [
        "",
        f"Session: {session.get('source_video', '?')}",
        f"  rallies found:    {session.get('segments_found', 0)}",
        f"  rallies analysed: {session.get('segments_analysed', 0)}"
        f" ({session.get('frames_analysed', 0)} frames of a "
        f"{session.get('frame_budget', 0)}-frame budget)",
    ]
    if session.get("segments_skipped_budget"):
        lines.append(f"  skipped (budget): {session['segments_skipped_budget']}")
    if session.get("segments_failed"):
        lines.append(f"  failed:           {session['segments_failed']}")
    if session.get("segments_uncalibrated"):
        lines.append(f"  no court fit:     {session['segments_uncalibrated']}")

    totals = session.get("totals", {})
    if totals:
        lines.append("")
        lines.append("  Totals")
        for key, value in totals.items():
            lines.append(f"    {key:<28} {value}")

    if session.get("shot_types"):
        lines.append("")
        lines.append("  Shot types")
        for name, count in session["shot_types"].items():
            lines.append(f"    {name:<28} {count}")

    if session.get("warning"):
        lines.append("")
        lines.append(f"  NOTE: {session['warning']}")

    return "\n".join(lines)


if __name__ == "__main__":
    sys.exit(main())
