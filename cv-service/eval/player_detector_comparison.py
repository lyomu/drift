"""
eval/player_detector_comparison.py
──────────────────────────────────
Can the permissive detector replace the AGPL one without changing the pipeline's answers?

Why this measurement and not accuracy
-------------------------------------
There is no labelled person-detection ground truth in this repo, so per-box recall cannot be
computed here and this script does not pretend to. It measures the thing the pipeline
actually consumes.

`UPSTREAM_README.md` records that detection is saturated for this task: YOLOv8x finds 11-14
people per frame on the reference clip and the pipeline needs 2. So the question is not "does
RF-DETR detect better", it is **"does player selection reach the same verdict"** — two
players, one per court half, with stable enough ids to be scored across the clip. If it does,
the AGPL dependency can go; if it does not, the reason will be visible in one of the columns
below rather than in a single accuracy number that hides which stage broke.

Why the swap has to happen anyway
---------------------------------
`ultralytics` is AGPL-3.0. Serving it over a network engages §13, and the obligation extends
to weights fine-tuned through it "regardless of whether you train from scratch" — so the
replacement is a prerequisite for training anything in Phase 2, not a tidy-up afterwards.
LICENSING.md §1 has the full argument.

What the columns mean
---------------------
| column | what it is | what a bad value means |
|---|---|---|
| `det/frame` | mean people detected per frame | far below the other backend: threshold or class-id problem, not a selection problem |
| `tracks` | distinct track ids over the clip | much higher: id churn, ByteTrack losing and re-acquiring people |
| `persist` | tracks clearing PlayerTracker.MIN_TRACK_PERSISTENCE | 0 means selection fell back to longest-lived and printed a warning |
| `chosen` | players selected; 2 is the healthy answer | 1 means only one court half had a qualifying track |
| `halves` | did the chosen players sit on opposite sides of the net | `no` is the failure that refuses shot counts and per-player stats downstream |
| `churn` | mean id changes per chosen player per 100 frames | high churn breaks cross-frame scoring even when `chosen` is 2 |
| `secs` | wall-clock detection time | RF-DETR is a different architecture; this is the cost side of the decision |

Usage
-----
    python eval/player_detector_comparison.py
    python eval/player_detector_comparison.py --clips "input_videos/*.mp4" --max-frames 150
    python eval/player_detector_comparison.py --backends yolo

Caveats that belong on any number this prints
---------------------------------------------
- **This is broadcast footage.** `PHASE0_FINDINGS.md` found 0 of 10 real Drift clips passing
  the court gate, and no re-filmed Drift footage exists on this machine yet. Agreement here
  says the swap is safe on the footage the repo's numbers were measured on. It says nothing
  about Drift's camera domain, and neither backend has been run there.
- **Stubs are never read or written.** Both backends are run fresh. Writing would poison a
  cache that the pipeline shares, and reading would compare a backend against itself.
"""
from __future__ import annotations

import argparse
import glob
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from court_line_detector import CourtLineDetector
from trackers import PlayerTracker, RfDetrPersonDetector, YoloPersonDetector
from trackers.detector_rfdetr import DEFAULT_SIZE
from utils import read_video

BACKENDS = ("yolo", "rfdetr")


def build_tracker(backend: str, rfdetr_size: str) -> PlayerTracker:
    if backend == "yolo":
        return PlayerTracker(detector=YoloPersonDetector("yolov8x"))
    if backend == "rfdetr":
        return PlayerTracker(detector=RfDetrPersonDetector(size=rfdetr_size))
    raise ValueError(f"Unknown backend {backend!r}. Expected one of {BACKENDS}.")


def id_churn(detections: list[dict], chosen_ids: list[int]) -> float:
    """
    Mean id appearances-and-disappearances per chosen player, per 100 frames.

    A track that is present, lost, then re-acquired under the SAME id counts its gap here.
    That is deliberate: player selection scores by id across frames, so a gap costs the same
    as churn whatever the id does, and a metric that only counted renumbering would call a
    flickering detector stable.
    """
    if not detections or not chosen_ids:
        return 0.0

    transitions = 0
    for track_id in chosen_ids:
        previous = False
        for frame_boxes in detections:
            present = track_id in frame_boxes
            if present != previous:
                transitions += 1
            previous = present

    return transitions / len(chosen_ids) / len(detections) * 100.0


def opposite_halves(detections: list[dict], chosen_ids: list[int], frame_height: int) -> bool:
    """
    Did the chosen players end up on opposite sides of the net?

    Half is decided by a majority vote of each track's box centre over the frames it appears
    in, matching `PlayerTracker._choose_players_over_clip` rather than reading frame 0 — a
    player crossing the net mid-rally should not flip the answer. The net is taken as the
    image mid-line, which is the same approximation the pipeline's mini-court makes
    (`shot_classifier.net_y_position_relative: 0.5`) and is wrong for a tilted or
    off-centre camera. Stated because it is a real limitation of this column, not a
    measurement of the camera.
    """
    if len(chosen_ids) < 2:
        return False

    midline = frame_height / 2.0
    votes = []
    for track_id in chosen_ids:
        bottom = seen = 0
        for frame_boxes in detections:
            box = frame_boxes.get(track_id)
            if box is None:
                continue
            seen += 1
            if (box[1] + box[3]) / 2.0 > midline:
                bottom += 1
        if not seen:
            return False
        votes.append(bottom * 2 >= seen)

    return len(set(votes)) > 1


def analyse(video_path: str, backend: str, rfdetr_size: str, max_frames: int) -> dict:
    frames = read_video(video_path)
    if max_frames:
        frames = frames[:max_frames]
    if len(frames) < 10:
        return {}

    tracker = build_tracker(backend, rfdetr_size)

    started = time.perf_counter()
    # No stub either way: save_stub=False because a comparison must not write into a cache
    # the pipeline shares, read_from_stub defaulting off because loading would compare a
    # backend against whatever ran last.
    detections = tracker.detect_frames(frames, save_stub=False)
    elapsed = time.perf_counter() - started

    court = CourtLineDetector("models/keypoints_model_geoaug.pth")
    keypoints = court.predict(frames[0])
    chosen_ids = tracker._choose_players_over_clip(detections, keypoints)

    all_ids = {track_id for frame_boxes in detections for track_id in frame_boxes}
    min_frames = max(1, int(len(detections) * PlayerTracker.MIN_TRACK_PERSISTENCE))
    counts: dict[int, int] = {}
    for frame_boxes in detections:
        for track_id in frame_boxes:
            counts[track_id] = counts.get(track_id, 0) + 1
    persisting = sum(1 for n in counts.values() if n >= min_frames)

    return {
        "clip": os.path.basename(video_path),
        "backend": backend,
        "frames": len(frames),
        "det_per_frame": sum(len(f) for f in detections) / len(detections),
        "tracks": len(all_ids),
        "persist": persisting,
        "chosen": len(chosen_ids),
        "halves": opposite_halves(detections, chosen_ids, frames[0].shape[0]),
        "churn": id_churn(detections, chosen_ids),
        "secs": elapsed,
    }


def main():
    p = argparse.ArgumentParser(description="Compare player detection backends")
    p.add_argument("--clips", default="input_videos/*.mp4")
    p.add_argument("--backends", default=",".join(BACKENDS),
                   help=f"comma-separated subset of {BACKENDS}")
    p.add_argument("--rfdetr-size", default=DEFAULT_SIZE)
    p.add_argument("--max-frames", type=int, default=0,
                   help="truncate each clip; 0 means the whole clip")
    args = p.parse_args()

    paths = sorted(glob.glob(args.clips))
    if not paths:
        print(f"No clips matched {args.clips}")
        sys.exit(1)

    backends = [b.strip() for b in args.backends.split(",") if b.strip()]
    for backend in backends:
        if backend not in BACKENDS:
            print(f"Unknown backend {backend!r}. Expected one of {BACKENDS}.")
            sys.exit(1)

    rows = []
    for path in paths:
        for backend in backends:
            try:
                row = analyse(path, backend, args.rfdetr_size, args.max_frames)
            except ImportError as exc:
                # A missing permissive detector is a setup state, not a result. Say so and
                # keep going, so the YOLO column is still printed.
                print(f"  [{backend}] unavailable: {exc}")
                continue
            if row:
                rows.append(row)

    if not rows:
        print("Nothing measured.")
        sys.exit(1)

    header = (f"\n{'clip':<24} {'backend':<8} {'frames':>6} {'det/frame':>10} "
              f"{'tracks':>7} {'persist':>8} {'chosen':>7} {'halves':>7} "
              f"{'churn':>7} {'secs':>7}")
    print(header)
    print("-" * (len(header) - 1))
    for r in rows:
        print(f"{r['clip']:<24} {r['backend']:<8} {r['frames']:>6} "
              f"{r['det_per_frame']:>10.1f} {r['tracks']:>7} {r['persist']:>8} "
              f"{r['chosen']:>7} {'yes' if r['halves'] else 'no':>7} "
              f"{r['churn']:>7.1f} {r['secs']:>7.1f}")

    print("\nThe column that decides the swap is `halves`: two players on opposite sides of")
    print("the net is what the pipeline needs, and what it refuses shot counts without.")
    print("`det/frame` differing is expected and mostly irrelevant — detection is saturated")
    print("for this task (UPSTREAM_README.md), so more boxes is not better.")
    print("\nBroadcast footage only. No re-filmed Drift clips exist on this machine yet, so")
    print("agreement here does NOT transfer to Drift's camera domain — see PHASE0_FINDINGS.md.")


if __name__ == "__main__":
    main()
