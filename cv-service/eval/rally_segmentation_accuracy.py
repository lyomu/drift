"""
eval/rally_segmentation_accuracy.py
───────────────────────────────────
Does the pre-pass find the rallies that are actually there?

What is scored
--------------
A detected span is matched to a true rally when their overlap is at least `--min-iou` of
their union. From that matching come the three numbers that matter, and they fail in
different ways, which is why none of them is reported alone:

| number | what a bad value means |
|---|---|
| **recall** | rallies were missed entirely — play the segmenter never noticed |
| **precision** | spans were invented — idle stretches called rallies, which costs GPU time |
| **boundary error** | rallies were found but mis-cut, which silently truncates the tennis |

Boundary error is reported signed as well as absolute. The sign is the useful part: a
consistently *late* start means padding is too small and the first contact is being clipped,
which produces a rally whose speeds cannot be reconstructed. That is a specific, fixable
diagnosis, and an absolute error alone hides it.

Splits and merges are counted separately from precision and recall, because they are a
different defect with a different fix. Two detected spans matching one rally means the
hysteresis let go mid-rally; one span matching two rallies means `MERGE_GAP_S` is too long.
Rolling either into "precision" would send someone to tune the wrong constant.

The caveat that governs every number this prints
-----------------------------------------------
**The only sessions available today are synthetic.** `tools/make_session_clip.py` assembles
real rally clips with synthesised idle gaps, so the ground truth is exact but the idle
stretches are not real idle footage — a frozen gap has literally zero residual motion, where
a real court between rallies has people walking across it. So this measures whether the
mechanism works, and it cannot measure whether `PLAY_ENTER_DIFF` and `PLAY_EXIT_DIFF` are set
correctly for footage a phone actually produces.

Run it with `--gap-kind noise` sessions too. If the score falls apart between frozen and
noisy gaps, the exit threshold is sitting on the noise floor, and that is worth knowing now
rather than after the first real session is filmed.

Usage
-----
    python tools/make_session_clip.py --out output/videos/session.mp4
    python eval/rally_segmentation_accuracy.py --video output/videos/session.mp4

    # motion only, no court model — much faster, and the static-camera case
    python eval/rally_segmentation_accuracy.py --video output/videos/session.mp4 --no-court
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.rally_segmenter import PAD_S, describe, segment_session


def iou(a: tuple[int, int], b: tuple[int, int]) -> float:
    """Intersection over union of two half-open frame spans."""
    lo = max(a[0], b[0])
    hi = min(a[1], b[1])
    overlap = max(0, hi - lo)
    union = (a[1] - a[0]) + (b[1] - b[0]) - overlap
    return overlap / union if union > 0 else 0.0


def match(truth: list[tuple[int, int]], found: list[tuple[int, int]],
          min_iou: float) -> dict:
    """
    Greedy best-overlap matching between true rallies and detected spans.

    Greedy rather than optimal (Hungarian) on purpose: with a handful of well-separated
    rallies the two agree, and a greedy pass is inspectable by hand when a number looks
    wrong. If sessions ever get dense enough for the two to disagree, that disagreement is
    itself the finding.
    """
    pairs = sorted(
        ((iou(t, f), ti, fi)
         for ti, t in enumerate(truth)
         for fi, f in enumerate(found)),
        reverse=True,
    )

    truth_to_found: dict[int, int] = {}
    found_to_truth: dict[int, int] = {}
    for score, ti, fi in pairs:
        if score < min_iou:
            break
        if ti in truth_to_found or fi in found_to_truth:
            continue
        truth_to_found[ti] = fi
        found_to_truth[fi] = ti

    # Splits and merges, from the overlaps the matching did not consume. Counted on any
    # overlap at all rather than on min_iou: a rally cut in half produces two spans of ~0.5
    # IoU each, so an IoU floor would classify the split as two false positives and hide it.
    splits = 0
    for ti, t in enumerate(truth):
        overlapping = sum(1 for f in found if iou(t, f) > 0)
        if overlapping > 1:
            splits += 1
    merges = 0
    for fi, f in enumerate(found):
        overlapping = sum(1 for t in truth if iou(t, f) > 0)
        if overlapping > 1:
            merges += 1

    return {
        "matched": truth_to_found,
        "missed": [i for i in range(len(truth)) if i not in truth_to_found],
        "spurious": [i for i in range(len(found)) if i not in found_to_truth],
        "splits": splits,
        "merges": merges,
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Score rally segmentation against ground truth")
    p.add_argument("--video", required=True, help="session video built by make_session_clip")
    p.add_argument("--truth", default="", help="ground truth JSON (default: <video>.truth.json)")
    p.add_argument("--min-iou", type=float, default=0.5)
    p.add_argument("--no-court", action="store_true",
                   help="segment on motion alone, skipping the court model")
    args = p.parse_args()

    truth_path = args.truth or f"{args.video}.truth.json"
    if not os.path.exists(truth_path):
        print(f"error: no ground truth at {truth_path}. Build a session first:\n"
              f"  python tools/make_session_clip.py --out {args.video}", file=sys.stderr)
        return 2

    with open(truth_path, encoding="utf-8") as f:
        truth_doc = json.load(f)

    court = None
    if not args.no_court:
        try:
            from court_line_detector import CourtLineDetector

            import main as pipeline

            court = CourtLineDetector(pipeline.load_config("configs/config.yaml")
                                      ["models"]["court"])
        except Exception as exc:
            print(f"warning: court model unavailable ({exc}); motion only",
                  file=sys.stderr)

    started = time.perf_counter()
    result = segment_session(args.video, court_detector=court)
    elapsed = time.perf_counter() - started

    truth = [(r["start_frame"], r["end_frame"]) for r in truth_doc["rallies"]]
    found = [(s.start_frame, s.end_frame) for s in result.spans]
    m = match(truth, found, args.min_iou)

    print(describe(result))
    print()

    n_truth, n_found = len(truth), len(found)
    matched = len(m["matched"])
    recall = matched / n_truth if n_truth else 0.0
    precision = matched / n_found if n_found else 0.0

    print(f"{'rallies in the session':<32} {n_truth}")
    print(f"{'spans found':<32} {n_found}")
    print(f"{'matched (IoU >= ' + str(args.min_iou) + ')':<32} {matched}")
    print(f"{'recall':<32} {recall:.0%}")
    print(f"{'precision':<32} {precision:.0%}")
    print(f"{'missed rallies':<32} {len(m['missed'])}")
    print(f"{'spurious spans':<32} {len(m['spurious'])}")
    print(f"{'rallies split across spans':<32} {m['splits']}")
    print(f"{'spans merging several rallies':<32} {m['merges']}")

    if m["matched"]:
        starts, ends, ious = [], [], []
        for ti, fi in m["matched"].items():
            # Padding is subtracted before scoring the boundary. A padded span is SUPPOSED
            # to start early — that is what PAD_S is for — so leaving it in would report a
            # systematic error that is actually correct behaviour.
            pad = int(round(PAD_S * result.fps))
            starts.append((found[fi][0] + pad) - truth[ti][0])
            ends.append((found[fi][1] - pad) - truth[ti][1])
            ious.append(iou(truth[ti], found[fi]))

        def summarise(name: str, values: list[int]) -> None:
            mean = sum(values) / len(values)
            worst = max(values, key=abs)
            mean_abs = sum(abs(v) for v in values) / len(values)
            print(f"{name:<32} mean {mean:+.1f}f  |mean| {mean_abs:.1f}f  "
                  f"worst {worst:+d}f")

        print()
        print("Boundary error, padding removed. Positive = late.")
        summarise("start", starts)
        summarise("end", ends)
        print(f"{'mean IoU':<32} {sum(ious) / len(ious):.3f}")

    # The cost side of the decision, and the number that says whether the pre-pass is
    # actually cheap: it has to be a small fraction of the analysis it is deciding about.
    if elapsed > 0:
        print(f"\n{'pre-pass wall clock':<32} {elapsed:.1f}s for "
              f"{result.duration_s / 60:.1f} min of footage "
              f"({result.duration_s / elapsed:.0f}x real time)")

    if truth_doc.get("synthetic"):
        print(f"\nSYNTHETIC SESSION ({truth_doc.get('gap_kind')} gaps). "
              f"{truth_doc.get('caveat', '')}")
        print("This scores the mechanism. It is not evidence the thresholds suit real")
        print("footage, and no Drift session footage exists yet to check that against.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
