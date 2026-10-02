"""
utils/rally_segmenter.py
────────────────────────
Find the rallies inside a long clip, cheaply, without decoding it all.

The problem this solves
-----------------------
`UPSTREAM_README.md` §"Supported inputs" is blunt: the pipeline assumes one uninterrupted
view of one rally, and a clip spanning anything else is refused whole. The held-out
benchmark measured exactly that — fourteen fixed-length windows cut from a broadcast, all
fourteen refused, because an arbitrary window contains the end of a point, a crowd
reaction, a replay and the next serve. Trimmed to the rally inside them, five of five had
a valid court and valid player selection.

So the tennis was always analysable and the *cutting* was the missing step. This module is
that step.

Why it cannot simply reuse the existing segment finder
-----------------------------------------------------
`eval/heldout_segments.py:find_court_segment` already locates a court-valid run, and it
does two things that do not survive session length:

1. It reads every frame into a list. A 10-minute session at 1280x720 is roughly 50 GB in
   RAM. This module holds **at most three frames at once** and seeks rather than decodes.
2. It returns only the single longest run. A session has many rallies, and returning the
   longest one would silently discard the rest.

Why the signal is not ball motion
---------------------------------
`AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md` proposes a pre-pass on "ball and player motion".
Ball motion is the wrong primary signal here, on two measured grounds:

- **It is not available.** `PHASE0_FINDINGS.md` measured ball detection at 0-25% of frames
  across ten real Drift clips. A gate that needs the ball would refuse a whole session on
  footage where the pipeline's own numbers show the ball is mostly not found.
- **It costs the thing we are trying to avoid.** TrackNet is half the pipeline's runtime,
  which is ~0.63 s/frame on an RTX 4060. Running it over a session to decide what to run it
  over defeats the purpose.

So the signal is two cheap things, both already trusted elsewhere in this repo:

| signal | what it rejects | reused from |
|---|---|---|
| **court validity** | camera cuts, replays, crowd shots, the camera pointed elsewhere | `utils/court_validity.py`, same 0.22 calibration the pipeline and precheck use |
| **residual subject motion** | the gaps between rallies — players walking, collecting balls, standing | a complement to `utils/precheck.py:_global_shift` |

Residual motion deserves a note, because it is the inverse of an existing measurement.
`precheck._global_shift` downscales to 128 px *specifically so players become smudges* and
the background dominates — that makes it a camera-motion test. Here the question is the
opposite one, so this compensates for the camera shift that function measures and then
measures what is left over, at a working width where a player is several pixels rather than
one. Camera motion and subject motion are complementary, and the same primitive separates
them in both directions.

Player detection is deliberately *not* in the pre-pass. It costs a model pass per sample,
which is proportional to session length. `verify_players` applies it to candidate spans
only, so its cost is proportional to how much play was found instead.

Every threshold here is provisional
-----------------------------------
There is no multi-rally Drift footage on this machine, and none anywhere in this repo — the
two available clips are 7 s and 19 s of broadcast. The thresholds below are reasoned from
the physical structure of a practice session and from constants already calibrated for other
purposes. They are marked `provisional` in the output they produce, and
`tools/make_session_clip.py` plus `eval/rally_segmentation_accuracy.py` exist so they can be
re-derived against ground truth the moment a real session arrives. Nothing in this module
should be read as measured.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import cv2
import numpy as np

from utils.court_validity import MIN_LINE_SUPPORT, line_support_score
from utils.precheck import MIN_DURATION_S

# ── sampling ──────────────────────────────────────────────────────────────────

# Seconds between samples. A rally is seconds long and the shortest thing worth keeping is
# MIN_DURATION_S (3.0 s), so sampling twice a second cannot miss a keepable rally while
# costing ~1200 samples on a 10-minute session rather than 18,000 frames.
#
# PROVISIONAL. It trades boundary precision for cost: a boundary can only be located to
# within one sample interval, which PAD_S then absorbs.
SAMPLE_INTERVAL_S = 0.5

# Width frames are downscaled to before differencing. Deliberately larger than
# precheck's _MOTION_WORK_WIDTH of 128: that value exists to make players vanish, and this
# measurement needs them to survive. At 320 px a player at broadcast distance is a few
# pixels across — enough to register, small enough that sensor noise and compression
# blocking do not.
#
# PROVISIONAL, and untested below 480 px source width, which is what a WhatsApp transfer
# produces (PHASE0_FINDINGS.md cause 4).
MOTION_WORK_WIDTH = 320

# ── play detection ────────────────────────────────────────────────────────────

# Mean absolute frame-to-frame difference, on the 0-255 grey scale, after camera
# compensation. Two thresholds, not one, and the gap between them is the point:
#
#   - above ENTER  → play has started
#   - below EXIT   → play has stopped
#   - in between   → whatever was happening continues
#
# A single threshold flaps. Mid-rally there are genuinely still moments — the ball in the
# air at the top of its arc, a player waiting to receive — and a single threshold cuts the
# rally in half at each of them. Hysteresis is the standard instrument for that and it is
# what MERGE_GAP_S would otherwise have to paper over.
#
# PROVISIONAL, both of them. Reasoned, not measured: idle footage of a static camera on a
# court is dominated by compression noise, which sits near zero, while two people moving
# across frame moves several percent of the pixels by a visible amount. The gap is set wide
# because being wrong about the exact value costs less than flapping.
PLAY_ENTER_DIFF = 3.0
PLAY_EXIT_DIFF = 1.5

# Gaps shorter than this between two play spans are absorbed rather than treated as a
# boundary. A player fetching a ball from the net and serving again is one rally's worth of
# context; a player walking to the bench for a drink is not.
#
# PROVISIONAL. 2.0 s is short enough not to glue two real rallies together at practice pace
# and long enough to cover a bad bounce or a stray ball.
MERGE_GAP_S = 2.0

# Seconds of context added either side of a detected span before it is analysed.
#
# This is not cosmetic. Every speed in the pipeline is distance over flight time, and a
# flight needs frames *before* the first contact to establish the incoming velocity —
# `trajectory_3d.py` reconstructs between events, so a span that starts exactly on a contact
# has nothing to reconstruct from. Padding also absorbs the boundary uncertainty that
# SAMPLE_INTERVAL_S introduces.
#
# PROVISIONAL. 1.0 s is ~30 frames at the supported rate, comfortably more than the
# 2.4-frame mean event-timing offset the speed measurements already live with.
PAD_S = 1.0

# A span shorter than this is not a rally. Reuses the precheck's own floor rather than
# inventing a second one, so the segmenter and the upload gate cannot disagree about what is
# too short to measure.
MIN_RALLY_S = MIN_DURATION_S


@dataclass(frozen=True)
class Sample:
    """One probe of the video. Kept so a segmentation decision can be explained."""

    frame_index: int
    time_s: float
    court_ok: bool
    court_support: float
    motion: float


@dataclass(frozen=True)
class RallySpan:
    """
    One candidate rally, in frames, half-open: `[start_frame, end_frame)`.

    Half-open because that is what `cv2` reading and Python slicing both do, and a segment
    boundary that means different things in two places is how an off-by-one becomes a
    silently truncated rally.
    """

    start_frame: int
    end_frame: int
    fps: float
    samples: int = 0
    mean_motion: float = 0.0
    mean_court_support: float = 0.0

    @property
    def frames(self) -> int:
        return self.end_frame - self.start_frame

    @property
    def duration_s(self) -> float:
        return self.frames / self.fps if self.fps > 0 else 0.0

    @property
    def start_s(self) -> float:
        return self.start_frame / self.fps if self.fps > 0 else 0.0

    @property
    def end_s(self) -> float:
        return self.end_frame / self.fps if self.fps > 0 else 0.0

    def as_dict(self) -> dict:
        return {
            "start_frame": self.start_frame,
            "end_frame": self.end_frame,
            "frames": self.frames,
            "start_s": round(self.start_s, 2),
            "end_s": round(self.end_s, 2),
            "duration_s": round(self.duration_s, 2),
            "samples": self.samples,
            "mean_motion": round(self.mean_motion, 3),
            "mean_court_support": round(self.mean_court_support, 3),
            "provisional": True,
        }


@dataclass
class SegmentationResult:
    """Everything the pre-pass concluded, including what it looked at to conclude it."""

    video: str
    fps: float
    frame_count: int
    duration_s: float
    spans: list[RallySpan] = field(default_factory=list)
    samples: list[Sample] = field(default_factory=list)
    court_checked: bool = False
    rejected_short: int = 0

    def as_dict(self) -> dict:
        return {
            "video": self.video,
            "fps": self.fps,
            "frame_count": self.frame_count,
            "duration_s": round(self.duration_s, 2),
            # Named `spans_found`, not `rallies`. These are candidates from a cheap motion
            # and court test; calling them rallies would claim the pre-pass knows tennis
            # was happening, which it does not.
            "spans_found": len(self.spans),
            "spans": [s.as_dict() for s in self.spans],
            "court_checked": self.court_checked,
            "spans_rejected_too_short": self.rejected_short,
            "play_of_session": round(
                sum(s.duration_s for s in self.spans) / self.duration_s, 3
            ) if self.duration_s > 0 else 0.0,
            "thresholds": {
                "sample_interval_s": SAMPLE_INTERVAL_S,
                "play_enter_diff": PLAY_ENTER_DIFF,
                "play_exit_diff": PLAY_EXIT_DIFF,
                "merge_gap_s": MERGE_GAP_S,
                "pad_s": PAD_S,
                "min_rally_s": MIN_RALLY_S,
                "min_line_support": MIN_LINE_SUPPORT,
                "provisional": True,
            },
        }


def _grey(frame: np.ndarray, width: int = MOTION_WORK_WIDTH) -> np.ndarray:
    ratio = width / frame.shape[1]
    size = (width, max(8, int(frame.shape[0] * ratio)))
    return cv2.cvtColor(cv2.resize(frame, size), cv2.COLOR_BGR2GRAY).astype(np.float32)


def subject_motion(previous: np.ndarray, current: np.ndarray) -> float:
    """
    How much moved between two frames that is *not* the camera moving.

    The camera shift is measured first and shifted out, so a drifting handheld phone does not
    read as continuous play. `precheck._global_shift` returns the shift's magnitude as a
    fraction of frame width, which is what its own threshold needs; here the direction is
    needed too, so phase correlation is run again at this module's working width. That is a
    second correlation rather than a refactor of the precheck, deliberately: the precheck's
    numbers are calibrated at 128 px and changing what it computes to share code here would
    move a threshold that real footage was measured against.

    Returns:
        Mean absolute difference on the 0-255 grey scale. Scale-free with respect to
        resolution, because both frames are resampled to the same working width first.
    """
    ga, gb = _grey(previous), _grey(current)
    if ga.shape != gb.shape:
        return 0.0

    # `cv2.phaseCorrelate` applies the Hanning window to its inputs IN PLACE. Copies are
    # therefore not defensive style, they are required: differencing the windowed arrays
    # compares two images whose taper is fixed in frame coordinates, so shifting one to
    # compensate for the camera misaligns the taper and leaves a residual proportional to
    # image contrast. Measured on a pure translation of a textured frame, where the true
    # answer is zero: 3.15 with the windowed arrays against 0.00 with pristine ones — above
    # PLAY_ENTER_DIFF, so a drifting camera read as continuous play.
    window = cv2.createHanningWindow((ga.shape[1], ga.shape[0]), cv2.CV_32F)
    (dx, dy), _response = cv2.phaseCorrelate(ga.copy(), gb.copy(), window)

    # Integer roll rather than a warp: sub-pixel accuracy is not needed to decide whether
    # two people are moving, and warping would interpolate, which smooths exactly the
    # high-frequency difference being measured.
    shifted = np.roll(gb, (-int(round(dy)), -int(round(dx))), axis=(0, 1))

    # Discard a border the width of the shift. Rolling wraps, so the wrapped strip is
    # unrelated content and would read as motion — the larger the camera drift, the larger
    # the false reading, which is the wrong direction for this to fail in.
    border = int(min(max(abs(dx), abs(dy)) + 1, min(ga.shape) // 4))
    if border:
        ga = ga[border:-border, border:-border]
        shifted = shifted[border:-border, border:-border]
    if ga.size == 0:
        return 0.0

    return float(np.mean(np.abs(ga - shifted)))


def _spans_from_samples(samples: list[Sample], fps: float) -> list[RallySpan]:
    """
    Turn per-sample play/no-play into spans, with hysteresis.

    Split out from the video reading so it can be tested on synthetic samples without a
    video, a codec or a court model — which is most of what `tests/test_rally_segmenter.py`
    does, since the decision logic is where the off-by-ones live.
    """
    spans: list[RallySpan] = []
    in_play = False
    current: list[Sample] = []

    def close(end_frame: int) -> None:
        if not current:
            return
        spans.append(RallySpan(
            start_frame=current[0].frame_index,
            end_frame=end_frame,
            fps=fps,
            samples=len(current),
            mean_motion=sum(s.motion for s in current) / len(current),
            mean_court_support=sum(s.court_support for s in current) / len(current),
        ))

    for sample in samples:
        playing = sample.court_ok and (
            sample.motion >= PLAY_ENTER_DIFF if not in_play
            else sample.motion > PLAY_EXIT_DIFF
        )

        if playing and not in_play:
            in_play = True
            current = [sample]
        elif playing:
            current.append(sample)
        elif in_play:
            close(sample.frame_index)
            in_play = False
            current = []

    if in_play and current:
        # The clip ended mid-play. The last sample's frame is the last thing actually
        # looked at, so the span ends there rather than at a frame count that may be a
        # header's optimistic guess.
        close(current[-1].frame_index)

    return spans


def _merge_and_pad(spans: list[RallySpan], fps: float, frame_count: int) -> tuple[list[RallySpan], int]:
    """
    Absorb short gaps, pad for context, drop what is too short to be a rally.

    Order matters and is deliberate: merge BEFORE the length filter, so two halves of one
    rally separated by a still moment are joined and kept rather than dropped separately;
    pad AFTER merging, so padding never causes a merge that the gap rule rejected.
    """
    if not spans:
        return [], 0

    merge_gap_frames = MERGE_GAP_S * fps
    merged: list[RallySpan] = [spans[0]]
    for span in spans[1:]:
        last = merged[-1]
        if span.start_frame - last.end_frame <= merge_gap_frames:
            total = last.samples + span.samples
            merged[-1] = RallySpan(
                start_frame=last.start_frame,
                end_frame=span.end_frame,
                fps=fps,
                samples=total,
                # Weighted by sample count, so merging does not let a two-sample fragment
                # pull the mean as hard as a forty-sample rally.
                mean_motion=(last.mean_motion * last.samples
                             + span.mean_motion * span.samples) / total,
                mean_court_support=(last.mean_court_support * last.samples
                                    + span.mean_court_support * span.samples) / total,
            )
        else:
            merged.append(span)

    pad = int(round(PAD_S * fps))
    out: list[RallySpan] = []
    rejected = 0
    for span in merged:
        if span.duration_s < MIN_RALLY_S:
            rejected += 1
            continue
        out.append(RallySpan(
            start_frame=max(0, span.start_frame - pad),
            end_frame=min(frame_count, span.end_frame + pad) if frame_count > 0
            else span.end_frame + pad,
            fps=fps,
            samples=span.samples,
            mean_motion=span.mean_motion,
            mean_court_support=span.mean_court_support,
        ))

    return out, rejected


def segment_session(
    video_path: str,
    court_detector=None,
    sample_interval_s: float = SAMPLE_INTERVAL_S,
    progress=None,
) -> SegmentationResult:
    """
    Locate the rallies in a clip of any length.

    Args:
        video_path: the clip. Never fully decoded — frames are seeked to, and at most three
            are held at once.
        court_detector: anything with `.predict(frame) -> keypoints`, normally a
            `CourtLineDetector`. **Optional, and its absence is not silent**: without it
            `court_checked` is False and the court signal is treated as passing, so spans
            come from motion alone. That is the honest degradation — on a static Drift camera
            the court does not change, so motion is the discriminator anyway, and refusing to
            run without a 95 MB model would make the pre-pass unusable in the cheap case it
            exists for.
        sample_interval_s: seconds between probes. See SAMPLE_INTERVAL_S.
        progress: optional `callable(samples_done, samples_total)` for a long session.

    Returns:
        A `SegmentationResult`. An unreadable or empty video gives a result with no spans
        rather than raising — the caller is an upload path, and "nothing found" is an answer
        it can show a person.
    """
    cap = cv2.VideoCapture(video_path)
    try:
        if not cap.isOpened():
            return SegmentationResult(video=video_path, fps=0.0, frame_count=0,
                                      duration_s=0.0)

        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        # A header that does not report a frame rate cannot be sampled in seconds. 30 is
        # assumed and recorded rather than guessed at silently; every threshold here is in
        # seconds, so the assumption is visible in the output's `fps`.
        if fps <= 0:
            fps = 30.0
        duration_s = frame_count / fps if frame_count > 0 else 0.0

        stride = max(1, int(round(sample_interval_s * fps)))
        indices = list(range(0, frame_count, stride)) if frame_count > 0 else []

        samples: list[Sample] = []
        previous: np.ndarray | None = None

        for n, idx in enumerate(indices):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ok, frame = cap.read()
            if not ok:
                # Seeking past a truncated file, or a codec that lied about its length.
                # Stop rather than treat the tail as idle, which would end the last span
                # early on footage that may simply not be there.
                break

            support = 0.0
            court_ok = True
            if court_detector is not None:
                keypoints = court_detector.predict(frame)
                support = float(line_support_score(frame, keypoints))
                court_ok = support >= MIN_LINE_SUPPORT

            motion = subject_motion(previous, frame) if previous is not None else 0.0
            samples.append(Sample(frame_index=idx, time_s=idx / fps,
                                  court_ok=court_ok, court_support=support,
                                  motion=motion))
            previous = frame

            if progress is not None:
                progress(n + 1, len(indices))

        raw = _spans_from_samples(samples, fps)
        spans, rejected = _merge_and_pad(raw, fps, frame_count)

        return SegmentationResult(
            video=video_path,
            fps=fps,
            frame_count=frame_count,
            duration_s=duration_s,
            spans=spans,
            samples=samples,
            court_checked=court_detector is not None,
            rejected_short=rejected,
        )
    finally:
        cap.release()


def cut_span(video_path: str, span: RallySpan, out_path: str) -> int:
    """
    Write one span out as its own video file, and return how many frames were written.

    A file rather than an in-memory array, for the same reason `eval/heldout_segments.py`
    does it: the pipeline is invoked as a subprocess per segment, so a CUDA fault kills one
    rally rather than the session, and `main.py` reads `sys.argv` and cannot safely be
    called in-process anyway.
    """
    cap = cv2.VideoCapture(video_path)
    try:
        if not cap.isOpened():
            return 0
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0) or span.fps or 30.0
        width, height = int(cap.get(3)), int(cap.get(4))
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(span.start_frame))

        writer = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"),
                                 fps, (width, height))
        try:
            written = 0
            for _ in range(span.frames):
                ok, frame = cap.read()
                if not ok:
                    break
                writer.write(frame)
                written += 1
            return written
        finally:
            writer.release()
    finally:
        cap.release()


def describe(result: SegmentationResult) -> str:
    """One human-readable line per span, for the CLI and the logs."""
    if not result.spans:
        return ("No passages of play were found. Either the camera never showed a "
                "playable court, or nothing moved enough to look like a rally.")

    lines = [
        f"{len(result.spans)} passage(s) of play in "
        f"{result.duration_s / 60:.1f} min of footage "
        f"({result.as_dict()['play_of_session']:.0%} of the clip):"
    ]
    for n, span in enumerate(result.spans, 1):
        lines.append(
            f"  {n:>3}. {span.start_s:7.1f}s -> {span.end_s:7.1f}s "
            f"({span.duration_s:5.1f}s, {span.frames:5d} frames, "
            f"motion {span.mean_motion:.2f})"
        )
    if result.rejected_short:
        lines.append(f"  ({result.rejected_short} passage(s) dropped as shorter than "
                     f"{MIN_RALLY_S:.0f}s)")
    if not result.court_checked:
        lines.append("  NOTE: no court model was supplied, so these spans rest on motion "
                     "alone and no court view was verified.")
    return "\n".join(lines)


__all__ = [
    "MERGE_GAP_S", "MIN_RALLY_S", "MOTION_WORK_WIDTH", "PAD_S",
    "PLAY_ENTER_DIFF", "PLAY_EXIT_DIFF", "SAMPLE_INTERVAL_S",
    "RallySpan", "Sample", "SegmentationResult",
    "cut_span", "describe", "segment_session", "subject_motion",
]
