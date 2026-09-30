"""
tools/make_session_clip.py
──────────────────────────
Build a multi-rally session video out of real rally clips, with known boundaries.

Why this exists
---------------
Phase 3's acceptance criterion is *"a 10+ minute session video is correctly split into rally
segments without manual trimming"*. There is no such video anywhere in this repo — the two
available clips are 7 s and 19 s — and `PHASE0_FINDINGS.md` records that the re-filmed Drift
footage does not exist yet either. So the segmenter cannot be measured against real sessions
today.

What it *can* be measured against is a session assembled from real tennis, where the
boundaries are known because they were chosen. Concatenating real rally clips separated by
synthesised idle stretches gives ground truth by construction, which is the same trick this
repo already uses for the frame-rate measurement in `utils/fps_support.py`: resample a real
clip so the true answer is known, then check what the real code says about it.

What this measures and what it cannot
-------------------------------------
It measures the **mechanism**: does the pre-pass find the right number of spans, in the right
places, and do the merge, pad and minimum-length rules behave as designed. That is most of
where the off-by-ones live, and it is worth having before any footage arrives.

It does **not** measure whether the thresholds are right for real footage, and nothing
produced with this tool should be quoted as if it did. The idle stretches here are synthetic:

- A **frozen** gap repeats one frame, so its residual motion is exactly sensor-free zero. A
  real idle court has players walking, a ball rolling, trees moving and compression noise,
  all of which sit somewhere above zero. A frozen gap is therefore the *easy* case, and a
  segmenter that only works on it is not known to work at all.
- A **noise** gap adds Gaussian noise to a still frame, which is closer but still not the
  same shape as real idle footage.

Both are provided because the difference between them is informative: if `--gap-kind noise`
degrades the result badly, PLAY_EXIT_DIFF is sitting too close to the noise floor, and that
is worth knowing before a real session is ever filmed.

Usage
-----
    # A ~10-minute session from the two bundled clips, alternating with 20s gaps
    python tools/make_session_clip.py --out output/session.mp4 --repeats 12 --gap-s 20

    # Harder: noisy idle stretches instead of frozen ones
    python tools/make_session_clip.py --out output/session.mp4 --gap-kind noise

The ground truth is written alongside as `<out>.truth.json`, which
`eval/rally_segmentation_accuracy.py` reads.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import numpy as np

DEFAULT_SOURCES = ("input_videos/input_video_2.mp4", "input_videos/input_video.mp4")


def _read_frames(path: str, limit: int = 0) -> list[np.ndarray]:
    cap = cv2.VideoCapture(path)
    frames = []
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frames.append(frame)
            if limit and len(frames) >= limit:
                break
    finally:
        cap.release()
    return frames


def _gap_frames(reference: np.ndarray, count: int, kind: str,
                rng: np.random.Generator) -> list[np.ndarray]:
    """
    Frames representing a stretch with no play.

    `reference` is the last frame of the preceding rally rather than a black frame,
    deliberately: a cut to black is trivially detectable by any motion test, and would let
    the segmenter pass for the wrong reason. Holding the court view keeps the *court* signal
    passing throughout, so the boundary has to be found by motion alone — which is the case
    that matters for a static Drift camera pointed at one court for ten minutes.
    """
    if kind == "frozen":
        return [reference.copy() for _ in range(count)]

    if kind == "noise":
        out = []
        for _ in range(count):
            noise = rng.normal(0.0, 4.0, reference.shape)
            out.append(np.clip(reference.astype(np.float32) + noise, 0, 255)
                       .astype(np.uint8))
        return out

    raise ValueError(f"unknown gap kind {kind!r}; expected 'frozen' or 'noise'")


def build(
    out_path: str,
    sources: list[str],
    repeats: int,
    gap_s: float,
    gap_kind: str,
    fps: float = 0.0,
    seed: int = 0,
) -> dict:
    """
    Write the session video and return its ground truth.

    Returns:
        `{"video", "fps", "frame_count", "rallies": [{"start_frame", "end_frame", ...}]}`,
        where each rally span is **exact** — these are the frames that were written, not an
        estimate of them.
    """
    clips = []
    for path in sources:
        frames = _read_frames(path)
        if not frames:
            raise SystemExit(f"error: no frames read from {path}")
        clips.append((path, frames))

    probe = cv2.VideoCapture(sources[0])
    source_fps = float(probe.get(cv2.CAP_PROP_FPS) or 0.0)
    probe.release()
    fps = fps or source_fps or 30.0

    height, width = clips[0][1][0].shape[:2]
    gap_count = max(0, int(round(gap_s * fps)))
    rng = np.random.default_rng(seed)

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps,
                            (width, height))
    if not writer.isOpened():
        raise SystemExit(f"error: could not open {out_path} for writing")

    truth = []
    written = 0
    try:
        # Lead in with a gap, so the first rally does not begin at frame 0. A segmenter that
        # assumed the clip opens on play would pass a session that starts with one and this
        # is where that assumption shows up.
        if gap_count:
            for frame in _gap_frames(clips[0][1][0], gap_count, gap_kind, rng):
                writer.write(frame)
                written += 1

        for repeat in range(repeats):
            for path, frames in clips:
                resized = [
                    f if f.shape[:2] == (height, width)
                    else cv2.resize(f, (width, height))
                    for f in frames
                ]
                start = written
                for frame in resized:
                    writer.write(frame)
                    written += 1
                truth.append({
                    "source": os.path.basename(path),
                    "repeat": repeat,
                    "start_frame": start,
                    "end_frame": written,
                    "frames": written - start,
                    "start_s": round(start / fps, 2),
                    "end_s": round(written / fps, 2),
                })

                if gap_count:
                    for frame in _gap_frames(resized[-1], gap_count, gap_kind, rng):
                        writer.write(frame)
                        written += 1
    finally:
        writer.release()

    return {
        "video": out_path,
        "fps": fps,
        "frame_count": written,
        "duration_s": round(written / fps, 2),
        "gap_kind": gap_kind,
        "gap_s": gap_s,
        "rallies": truth,
        # Carried into the truth file so a result can never be read as evidence about real
        # footage, however far it travels from this docstring.
        "synthetic": True,
        "caveat": (
            "Assembled from real rally clips with synthesised idle gaps. Ground truth is "
            "exact by construction. This measures the segmenter's mechanism, NOT whether "
            "its thresholds suit real footage - the idle stretches here are not real idle "
            "footage. See tools/make_session_clip.py."
        ),
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Build a synthetic multi-rally session")
    p.add_argument("--out", default="output/videos/session_synthetic.mp4")
    p.add_argument("--sources", nargs="*", default=list(DEFAULT_SOURCES),
                   help="rally clips to concatenate, in order, repeated")
    p.add_argument("--repeats", type=int, default=3,
                   help="how many times to cycle through the sources")
    p.add_argument("--gap-s", type=float, default=20.0,
                   help="seconds of no-play between rallies")
    p.add_argument("--gap-kind", default="frozen", choices=("frozen", "noise"),
                   help="frozen repeats one frame; noise adds grain to it (harder)")
    p.add_argument("--fps", type=float, default=0.0,
                   help="output frame rate; 0 takes it from the first source")
    p.add_argument("--seed", type=int, default=0)
    args = p.parse_args()

    missing = [s for s in args.sources if not os.path.exists(s)]
    if missing:
        print(f"error: source clip(s) not found: {', '.join(missing)}", file=sys.stderr)
        return 2

    truth = build(args.out, args.sources, args.repeats, args.gap_s, args.gap_kind,
                  args.fps, args.seed)

    truth_path = f"{args.out}.truth.json"
    with open(truth_path, "w", encoding="utf-8") as f:
        json.dump(truth, f, indent=2)

    print(f"Wrote {truth['frame_count']} frames "
          f"({truth['duration_s'] / 60:.1f} min) to {args.out}")
    print(f"{len(truth['rallies'])} rallies, {args.gap_s:.0f}s {args.gap_kind} gaps")
    print(f"Ground truth -> {truth_path}")
    print("\nSYNTHETIC. Measures the segmenter's mechanism, not whether its thresholds")
    print("suit real footage. Do not quote a score from this as a Phase 3 result.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
