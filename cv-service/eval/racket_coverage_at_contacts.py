"""
eval/racket_coverage_at_contacts.py
───────────────────────────────────
On the contacts where pose cannot decide forehand from backhand, is the racket visible?

The one question worth asking before building anything
-----------------------------------------------------
This repo has rejected three forehand/backhand approaches, and the diagnosis is consistent:
the answer lives in where the racket is, and pose loses that information exactly when it
matters. MediaPipe drops the occluded racket arm on 44-58% of backhands. SAM 3D Body recovers
it from a body prior and made the classifier *worse* — wrist-side accuracy fell to 51.8%,
chance, on identical clips — because an anatomically plausible guess about the arm is still a
guess about the racket.

`eval/pose_availability_at_contacts.py` measured the ceiling that follows: how often pose is
available at all. This measures the gap a detected racket could fill, which is a different and
sharper question, because pose being *available* is not the same as pose being *decisive*.
`classify_forehand_backhand` returns None on frames where it has landmarks but cannot read a
side — no wrist, a collapsed body axis, two wrists equidistant from the ball. Those frames are
invisible to the availability eval and they are precisely the ones a racket detector exists to
answer.

So the column that matters is `racket only`: contacts where pose declined and a racket was
found and attributed to the hitting player. That is the incremental coverage the untried
avenue buys. If it is near zero, the avenue is dead and no classifier will revive it — the
racket is not visible when pose fails either. If it is large, Phase 2 has somewhere to go.

What this is NOT
----------------
**This is not an accuracy measurement and no number here may be quoted as one.** It counts
whether a racket was found, not whether it was found in the right place, and it has no labels
to check that against: `datasets/labels/` holds 13 events on one broadcast clip. Accuracy
needs labelled Drift footage, which does not exist on this machine yet — and per
`PHASE0_FINDINGS.md` plus every negative result above, a score on broadcast or THETIS
footage has already proven not to transfer to Drift's camera domain. Coverage is what this
footage can honestly answer. It is a go/no-go on the approach, not evidence for a label.

A specific way this could read high and mean nothing: RF-DETR's COCO `tennis racket` class
firing on a forearm, a shadow, or the opponent's racket. `racket_for_player` gates on distance
to bound the third of those, and the `--dump-features` output exists so the boxes can be
looked at by eye with `tools/frame_strip.py` rather than trusted. Do that before believing a
high number.

Usage
-----
    python eval/racket_coverage_at_contacts.py
    python eval/racket_coverage_at_contacts.py --clips "input_videos/*.mp4"
    python eval/racket_coverage_at_contacts.py --dump-features output/racket_features.csv
"""
from __future__ import annotations

import argparse
import csv
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from court_line_detector import CourtLineDetector
from trackers import PlayerTracker, RacketDetector, racket_for_player
from trackers.detector_rfdetr import DEFAULT_SIZE
from trackers.tracknet_ball_tracker import TrackNetBallTracker
from utils import PoseEstimator, derive_shot_frames, read_video
from utils.bbox_utils import get_center_of_bbox, measure_distance_between_points
from utils.pose_shot_classifier import classify_forehand_backhand
from utils.racket_features import racket_features_at_contact

# Matches the pipeline's own call at main.py:989 — 2x the player box width. Mirrored rather
# than re-picked so that "pose decided" here means the same thing it means in production.
CONTACT_DISTANCE_BOX_WIDTHS = 2.0


def hitting_player(boxes: dict, ball_box):
    """
    The player who hit it: nearest box centre to the ball.

    Same rule and same helper as `eval/pose_availability_at_contacts.py`, so the two evals
    agree about whose pose and whose racket is being asked for. Returns the box, not the id,
    because that is all either caller needs.
    """
    if not boxes:
        return None
    if ball_box is None:
        return next(iter(boxes.values()))
    ball_centre = get_center_of_bbox(ball_box)
    pid = min(boxes, key=lambda p: measure_distance_between_points(
        ball_centre, get_center_of_bbox(boxes[p])))
    return boxes[pid]


def analyse(video_path: str, estimator: PoseEstimator, racket_detector: RacketDetector,
            max_frames: int, feature_rows: list) -> dict:
    frames = read_video(video_path)
    if max_frames:
        frames = frames[:max_frames]
    if len(frames) < 10:
        return {}

    ball_tracker = TrackNetBallTracker(model_path="models/tracknet.pt")
    interpolated = ball_tracker.interpolate_ball_positions(
        ball_tracker.detect_frames(frames)
    )
    # YOLO deliberately, not the RF-DETR backend: this eval is about the racket, and running
    # it on the detector whose numbers every other eval was produced on keeps the player boxes
    # out of the comparison. Whether the backends agree is a separate measurement, and it has
    # its own script (eval/player_detector_comparison.py).
    player_tracker = PlayerTracker(model_path="yolov8x")
    players = player_tracker.detect_frames(frames, save_stub=False)
    court = CourtLineDetector("models/keypoints_model_geoaug.pth")
    players = player_tracker.choose_and_filter_players(players, court.predict(frames[0]))

    shots, _bounces, _raw, _flips = derive_shot_frames(ball_tracker, interpolated, players)

    counts = {"contacts": 0, "pose_resolved": 0, "pose_decided": 0,
              "racket_found": 0, "racket_only": 0, "either": 0, "features": 0}

    for frame in shots:
        if frame >= len(frames):
            continue
        ball_box = interpolated[frame].get(1)
        box = hitting_player(players[frame], ball_box)
        if box is None:
            continue

        counts["contacts"] += 1

        landmarks = estimator.detect_in_bbox(frames[frame], box)
        if landmarks is not None:
            counts["pose_resolved"] += 1

        # "Decided", not "available". A pose that resolves but cannot read a side is a
        # failure for this purpose, and it is the failure the racket is meant to cover.
        pose_decided = False
        if landmarks is not None and ball_box is not None:
            decision = classify_forehand_backhand(
                landmarks,
                get_center_of_bbox(ball_box),
                max_contact_distance=CONTACT_DISTANCE_BOX_WIDTHS * (box[2] - box[0]),
            )
            pose_decided = decision is not None
        if pose_decided:
            counts["pose_decided"] += 1

        racket = racket_for_player(racket_detector.detect_frame(frames[frame]), box)
        if racket is not None:
            counts["racket_found"] += 1
            if not pose_decided:
                counts["racket_only"] += 1

        if pose_decided or racket is not None:
            counts["either"] += 1

        features = racket_features_at_contact(landmarks, racket)
        if features is not None:
            counts["features"] += 1
            feature_rows.append({
                "clip": os.path.basename(video_path),
                "frame": frame,
                "pose_decided": pose_decided,
                **features,
            })

    return {"clip": os.path.basename(video_path), **counts}


def main():
    p = argparse.ArgumentParser(
        description="Racket coverage at contacts, against pose's own coverage")
    p.add_argument("--clips", default="input_videos/*.mp4")
    p.add_argument("--max-frames", type=int, default=0)
    p.add_argument("--rfdetr-size", default=DEFAULT_SIZE)
    p.add_argument("--confidence", type=float, default=None,
                   help="racket detection threshold; default is the detector's own")
    p.add_argument("--dump-features", default="",
                   help="CSV path for the per-contact feature rows, to inspect by eye")
    args = p.parse_args()

    paths = sorted(glob.glob(args.clips))
    if not paths:
        print(f"No clips matched {args.clips}")
        sys.exit(1)

    estimator = PoseEstimator()
    if not estimator.available:
        print("Pose model unavailable. Run: tennis-vision download-models")
        sys.exit(1)

    kwargs = {"size": args.rfdetr_size}
    if args.confidence is not None:
        kwargs["confidence"] = args.confidence
    try:
        racket_detector = RacketDetector(**kwargs)
    except (ImportError, LookupError) as exc:
        # Both are setup states rather than results, and the LookupError case is the one
        # worth not papering over: it means the COCO class could not be resolved by name, and
        # guessing the id would produce a detector for `knife` or `kite` that reports
        # plausible-looking coverage. See trackers/coco_labels.py.
        print(f"Racket detector unavailable: {exc}")
        estimator.close()
        sys.exit(1)

    feature_rows: list[dict] = []
    rows = [r for path in paths
            if (r := analyse(path, estimator, racket_detector, args.max_frames, feature_rows))]
    estimator.close()

    if not rows:
        print("Nothing measured.")
        sys.exit(1)

    header = (f"\n{'clip':<24} {'contacts':>9} {'pose ok':>8} {'pose decided':>13} "
              f"{'racket':>7} {'racket only':>12} {'either':>7} {'features':>9}")
    print(header)
    print("-" * (len(header) - 1))

    totals = {k: 0 for k in
              ("contacts", "pose_resolved", "pose_decided", "racket_found",
               "racket_only", "either", "features")}
    for r in rows:
        for k in totals:
            totals[k] += r[k]
        print(f"{r['clip']:<24} {r['contacts']:>9} {r['pose_resolved']:>8} "
              f"{r['pose_decided']:>13} {r['racket_found']:>7} {r['racket_only']:>12} "
              f"{r['either']:>7} {r['features']:>9}")

    print("-" * (len(header) - 1))
    n = totals["contacts"]
    print(f"{'TOTAL':<24} {n:>9} {totals['pose_resolved']:>8} "
          f"{totals['pose_decided']:>13} {totals['racket_found']:>7} "
          f"{totals['racket_only']:>12} {totals['either']:>7} {totals['features']:>9}")
    if n:
        print(f"{'':<24} {'':>9} {totals['pose_resolved']/n:>7.0%} "
              f"{totals['pose_decided']/n:>12.0%} {totals['racket_found']/n:>6.0%} "
              f"{totals['racket_only']/n:>11.0%} {totals['either']/n:>6.0%} "
              f"{totals['features']/n:>8.0%}")

    if args.dump_features and feature_rows:
        os.makedirs(os.path.dirname(args.dump_features) or ".", exist_ok=True)
        with open(args.dump_features, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(feature_rows[0].keys()))
            writer.writeheader()
            writer.writerows(feature_rows)
        print(f"\nWrote {len(feature_rows)} feature rows to {args.dump_features}")

    print("\n`racket only` is the measurement: contacts pose could not decide, where a racket")
    print("was found and attributed to the hitting player. Near zero means the avenue is dead")
    print("- the racket is not visible when pose fails either. Large means Phase 2 has a path.")
    print("\nCOVERAGE, NOT ACCURACY. Nothing here says the box was in the right place; there")
    print("are 13 labelled events in this repo, all broadcast. Inspect the boxes by eye with")
    print("tools/frame_strip.py before believing a high number, and do not quote any of this")
    print("as evidence about Drift footage - see PHASE0_FINDINGS.md.")


if __name__ == "__main__":
    main()
