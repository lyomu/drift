"""
eval/runtime_profile.py
───────────────────────
Where does the time actually go, and is the per-frame constant right?

Why this is worth measuring rather than reasoning about
-------------------------------------------------------
`utils/runtime_budget.py` estimates cost from one constant, 0.63 s per frame, and that constant
carries a suspicious coincidence worth resolving:

| hardware | measurement | per frame |
|---|---|---|
| GTX 1050 Ti (upstream) | 5 m 51 s for 570 frames | 0.62 s |
| RTX 4060 (this project) | 38 s for 60 frames | 0.63 s |

Those cards are separated by about six years and a large multiple of compute, and they land
within 2% of each other. That is not what a GPU-bound workload looks like. If the real bound is
per-frame Python, image decode, or host-device copies, then buying a faster card fixes nothing —
and Phase 4's runtime problem has a different solution than "get better hardware".

This script splits the run by stage so that question has an answer. It reports wall clock for
each of the expensive stages separately, plus the fixed startup cost, so a per-frame marginal
rate can be separated from a constant.

What it does not do
-------------------
It does not change the pipeline and it does not try to make it faster. Frame striding is the
obvious lever and it is not a lever: see `utils/runtime_budget.py` on why striding is the
frame-rate failure under another name, with the measured event-count damage.

Usage
-----
    python eval/runtime_profile.py --video input_videos/input_video_2.mp4
    python eval/runtime_profile.py --video input_videos/input_video_2.mp4 --max-frames 60
    python eval/runtime_profile.py --full-match-arithmetic
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from contextlib import contextmanager

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.runtime_budget import (
    DEFAULT_SECONDS_PER_FRAME,
    describe_full_match,
    estimate_runtime,
)


@contextmanager
def timed(label: str, into: dict):
    started = time.perf_counter()
    try:
        yield
    finally:
        into[label] = time.perf_counter() - started


def profile(video_path: str, max_frames: int) -> dict:
    """
    Time each expensive stage separately.

    Model loads are timed apart from inference deliberately. A load is a fixed cost paid once
    per process and is why `api.py` keeps the court model resident between requests; inference is
    the marginal cost that scales with the clip. Reporting them together is what makes a
    60-frame benchmark overstate the marginal rate, which is the flaw in the constant this is
    checking.
    """
    stages: dict[str, float] = {}

    with timed("import_torch_and_cv", stages):
        import cv2  # noqa: F401
        import torch  # noqa: F401

    from court_line_detector import CourtLineDetector
    from trackers import PlayerTracker
    from trackers.tracknet_ball_tracker import TrackNetBallTracker
    from utils import read_video

    import main as pipeline
    cfg = pipeline.load_config("configs/config.yaml")

    with timed("read_video", stages):
        frames = read_video(video_path)
    if max_frames:
        frames = frames[:max_frames]
    if not frames:
        return {}

    with timed("load_player_model", stages):
        player_tracker = PlayerTracker.from_config(cfg)
    with timed("load_ball_model", stages):
        ball_tracker = TrackNetBallTracker(model_path=cfg["models"]["tracknet"])
    with timed("load_court_model", stages):
        court = CourtLineDetector(cfg["models"]["court"])

    with timed("player_detection", stages):
        player_tracker.detect_frames(frames, save_stub=False)
    with timed("ball_detection", stages):
        ball_tracker.detect_frames(frames)
    with timed("court_keypoints_first_frame", stages):
        court.predict(frames[0])

    n = len(frames)
    loads = sum(v for k, v in stages.items() if k.startswith("load_"))
    imports = stages.get("import_torch_and_cv", 0.0)
    inference = (stages.get("player_detection", 0.0)
                 + stages.get("ball_detection", 0.0))

    return {
        "video": os.path.basename(video_path),
        "frames": n,
        "stages_seconds": {k: round(v, 2) for k, v in stages.items()},
        "fixed_cost_seconds": round(imports + loads, 2),
        "inference_seconds": round(inference, 2),
        # The number that matters: marginal cost per frame, with fixed costs removed. This is
        # what a long clip actually pays, and what the budget constant should be.
        "marginal_seconds_per_frame": round(inference / n, 4) if n else None,
        "naive_seconds_per_frame": round(sum(stages.values()) / n, 4) if n else None,
        "budget_constant": DEFAULT_SECONDS_PER_FRAME,
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Profile pipeline runtime by stage")
    p.add_argument("--video", default="input_videos/input_video_2.mp4")
    p.add_argument("--max-frames", type=int, default=0)
    p.add_argument("--full-match-arithmetic", action="store_true",
                   help="print the full-match cost estimate and exit, running no models")
    p.add_argument("--json", default="", help="also write the result here")
    args = p.parse_args()

    if args.full_match_arithmetic:
        result = describe_full_match()
        print(json.dumps(result, indent=2))
        return 0

    if not os.path.exists(args.video):
        print(f"error: no such file: {args.video}", file=sys.stderr)
        return 2

    result = profile(args.video, args.max_frames)
    if not result:
        print("No frames read.", file=sys.stderr)
        return 1

    print(f"\n{result['video']}  {result['frames']} frames\n")
    width = max(len(k) for k in result["stages_seconds"])
    for stage, seconds in result["stages_seconds"].items():
        print(f"  {stage:<{width}}  {seconds:>8.2f}s")

    print(f"\n  {'fixed (imports + model loads)':<34} {result['fixed_cost_seconds']:>8.2f}s")
    print(f"  {'inference (scales with frames)':<34} {result['inference_seconds']:>8.2f}s")
    print(f"\n  {'marginal s/frame':<34} {result['marginal_seconds_per_frame']}")
    print(f"  {'naive s/frame (fixed included)':<34} {result['naive_seconds_per_frame']}")
    print(f"  {'budget constant in use':<34} {result['budget_constant']}")

    marginal = result["marginal_seconds_per_frame"]
    if marginal:
        drift = (marginal - DEFAULT_SECONDS_PER_FRAME) / DEFAULT_SECONDS_PER_FRAME
        print(f"\n  Budget constant is {'high' if drift < 0 else 'low'} by "
              f"{abs(drift):.0%} against the marginal rate measured here.")
        est = estimate_runtime(int(90 * 60 * 30 * 0.2), seconds_per_frame=marginal)
        print(f"  At this rate, the play in a 90-minute match is "
              f"{est.estimated_seconds / 3600:.1f} hours.")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"\nWrote {args.json}")

    print("\nOne machine, one clip. The marginal rate is the figure worth carrying; the naive")
    print("rate folds in a fixed startup cost that a long clip amortises away.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
