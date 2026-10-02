"""
tests/test_rally_segmenter.py
─────────────────────────────
Tests for rally boundary detection.

What these actually guard
-------------------------
Two different things, and they need different instruments.

The **decision logic** — hysteresis, merging, padding, the minimum length — is where the
off-by-ones live, and it is pure: samples in, spans out. It is tested on synthesised `Sample`
lists with no video, no codec and no court model, which is why most of this file needs
nothing installed.

The **motion primitive** is tested on synthesised frames, and the tests that matter are the
two invariances it is built on: a camera that pans must not read as play, and a subject that
moves must. Those are the properties that decide whether the pre-pass works on a propped-up
phone, and they are checkable without footage.

What no test here can establish: whether the thresholds are right for real footage. There is
no multi-rally Drift footage on this machine. `tools/make_session_clip.py` and
`eval/rally_segmentation_accuracy.py` exist for that, and they say plainly that their sessions
are synthetic.
"""
import os
import sys

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.rally_segmenter import (
    MERGE_GAP_S,
    MIN_RALLY_S,
    PAD_S,
    PLAY_ENTER_DIFF,
    PLAY_EXIT_DIFF,
    RallySpan,
    Sample,
    SegmentationResult,
    _merge_and_pad,
    _spans_from_samples,
    describe,
    subject_motion,
)

FPS = 30.0
# One sample every 15 frames = 0.5 s at 30 fps, matching SAMPLE_INTERVAL_S.
STRIDE = 15


def samples(motions, *, court_ok=True, stride=STRIDE):
    """Synthesise a sample run from a list of motion values."""
    return [
        Sample(frame_index=i * stride, time_s=i * stride / FPS,
               court_ok=court_ok if isinstance(court_ok, bool) else court_ok[i],
               court_support=0.5, motion=m)
        for i, m in enumerate(motions)
    ]


def spans_of(motions, **kwargs):
    return _spans_from_samples(samples(motions, **kwargs), FPS)


# ── the thresholds themselves ──────────────────────────────────────────────────

def test_exit_threshold_sits_below_the_enter_threshold():
    """
    The premise of the hysteresis. If these were equal the segmenter would flap at every
    still moment mid-rally — the ball at the top of its arc, a player waiting to receive —
    and cut one rally into several.
    """
    assert PLAY_EXIT_DIFF < PLAY_ENTER_DIFF


# ── span construction ──────────────────────────────────────────────────────────

def test_no_samples_gives_no_spans():
    assert _spans_from_samples([], FPS) == []


def test_sustained_motion_is_one_span():
    found = spans_of([0.0, 8.0, 8.0, 8.0, 0.2])
    assert len(found) == 1
    assert found[0].start_frame == 1 * STRIDE
    assert found[0].end_frame == 4 * STRIDE


def test_motion_below_the_enter_threshold_never_starts_a_span():
    """Between the two thresholds is not enough to BEGIN play, only to continue it."""
    between = (PLAY_ENTER_DIFF + PLAY_EXIT_DIFF) / 2
    assert spans_of([0.0, between, between, between]) == []


def test_hysteresis_holds_a_span_through_a_still_moment():
    """
    The reason there are two thresholds. A dip between them mid-rally is a lull, not a
    boundary, and a single-threshold version would report two rallies here.
    """
    between = (PLAY_ENTER_DIFF + PLAY_EXIT_DIFF) / 2
    found = spans_of([0.0, 8.0, between, 8.0, 0.1])
    assert len(found) == 1, "a lull between the thresholds split the rally"
    assert found[0].frames == 3 * STRIDE


def test_motion_below_the_exit_threshold_ends_the_span():
    found = spans_of([0.0, 8.0, 8.0, PLAY_EXIT_DIFF - 0.1, 8.0, 8.0])
    assert len(found) == 2


def test_a_span_ends_at_the_first_idle_sample():
    """
    The boundary is the first sample that was NOT play, not the last one that was. Ending at
    the last playing sample would truncate up to a full sample interval of real tennis, and
    the padding is there to cover seek uncertainty rather than to repair this.
    """
    found = spans_of([0.0, 8.0, 8.0, 0.0])
    assert found[0].end_frame == 3 * STRIDE


def test_play_continuing_to_the_end_closes_at_the_last_sample_looked_at():
    """
    A clip ending mid-rally must not claim frames past what was examined. The header's frame
    count is not always honest, and a span reaching beyond the last real sample would hand
    the pipeline a cut that runs off the end of the file.
    """
    found = spans_of([0.0, 8.0, 8.0, 8.0])
    assert found[0].end_frame == 3 * STRIDE


def test_a_court_failure_ends_a_span_however_much_motion_there_is():
    """
    Motion alone is not play. A camera cut to a crowd shot moves a great deal, and the court
    gate is what rejects it — which is the case that refused 14 of 14 held-out windows.
    """
    court = [True, True, False, False]
    found = spans_of([0.0, 9.0, 9.0, 9.0], court_ok=court)
    assert len(found) == 1
    assert found[0].end_frame == 2 * STRIDE


def test_two_separated_bursts_are_two_spans():
    found = spans_of([0.0, 8.0, 8.0, 0.0, 0.0, 8.0, 8.0, 0.0])
    assert len(found) == 2


# ── merging, padding, minimum length ───────────────────────────────────────────

def raw_span(start_s, end_s, samples_n=10, motion=8.0):
    return RallySpan(start_frame=int(start_s * FPS), end_frame=int(end_s * FPS),
                     fps=FPS, samples=samples_n, mean_motion=motion,
                     mean_court_support=0.5)


def test_a_short_gap_is_absorbed():
    gap = MERGE_GAP_S / 2
    merged, _ = _merge_and_pad(
        [raw_span(0, 10), raw_span(10 + gap, 20)], FPS, frame_count=10_000)
    assert len(merged) == 1


def test_a_long_gap_is_a_real_boundary():
    gap = MERGE_GAP_S * 3
    merged, _ = _merge_and_pad(
        [raw_span(0, 10), raw_span(10 + gap, 20)], FPS, frame_count=10_000)
    assert len(merged) == 2


def test_merging_happens_before_the_length_filter():
    """
    Order of operations, and it changes the answer. Two halves of one rally, each under
    MIN_RALLY_S, separated by a still moment: filtered first, both are dropped and the rally
    disappears. Merged first, they are one keepable rally.
    """
    half = MIN_RALLY_S * 0.6
    merged, rejected = _merge_and_pad(
        [raw_span(0, half), raw_span(half + MERGE_GAP_S / 2, half * 2 + MERGE_GAP_S / 2)],
        FPS, frame_count=10_000)
    assert len(merged) == 1, "two halves of one rally were dropped instead of joined"
    assert rejected == 0


def test_a_span_shorter_than_the_minimum_is_dropped_and_counted():
    merged, rejected = _merge_and_pad(
        [raw_span(0, MIN_RALLY_S * 0.5)], FPS, frame_count=10_000)
    assert merged == []
    assert rejected == 1


def test_padding_extends_a_span_both_ways():
    """
    Not cosmetic. Speed is distance over flight time and a flight is reconstructed BETWEEN
    events, so a span starting exactly on the first contact has nothing to reconstruct from.
    """
    pad = int(round(PAD_S * FPS))
    merged, _ = _merge_and_pad([raw_span(10, 20)], FPS, frame_count=10_000)
    assert merged[0].start_frame == int(10 * FPS) - pad
    assert merged[0].end_frame == int(20 * FPS) + pad


def test_padding_cannot_run_off_either_end_of_the_video():
    """A span padded past frame 0 or past the last frame is a cut that fails to read."""
    merged, _ = _merge_and_pad([raw_span(0, MIN_RALLY_S + 1)], FPS, frame_count=200)
    assert merged[0].start_frame == 0
    assert merged[0].end_frame <= 200


def test_padding_does_not_create_a_merge_the_gap_rule_refused():
    """
    Padding is applied AFTER merging for this reason. Two rallies a gap apart that the merge
    rule kept separate must stay separate even when both are padded toward each other.
    """
    gap = MERGE_GAP_S * 1.5
    merged, _ = _merge_and_pad(
        [raw_span(0, 10), raw_span(10 + gap, 20)], FPS, frame_count=10_000)
    assert len(merged) == 2


def test_merged_statistics_are_weighted_by_sample_count():
    """
    A two-sample fragment must not pull the mean as hard as a forty-sample rally. An
    unweighted mean of means is the same mistake the session aggregator exists to avoid,
    one level down.
    """
    merged, _ = _merge_and_pad(
        [raw_span(0, 10, samples_n=38, motion=10.0),
         raw_span(10 + MERGE_GAP_S / 2, 20, samples_n=2, motion=0.0)],
        FPS, frame_count=10_000)
    assert len(merged) == 1
    assert merged[0].mean_motion == pytest.approx(10.0 * 38 / 40)


# ── the span value object ──────────────────────────────────────────────────────

def test_span_reports_frames_and_seconds_consistently():
    span = raw_span(10, 20)
    assert span.frames == span.end_frame - span.start_frame
    assert span.duration_s == pytest.approx(10.0)
    assert span.start_s == pytest.approx(10.0)


def test_span_output_declares_itself_provisional():
    """
    House style, and load-bearing here: nothing in this module has been calibrated against
    real footage, and a consumer reading these numbers should be told so by the numbers.
    """
    assert raw_span(0, 10).as_dict()["provisional"] is True


def test_segmentation_output_carries_the_thresholds_it_used():
    """
    A result that does not say what thresholds produced it cannot be compared with a result
    from after they moved — the same reasoning as `cvServiceVersion` on the job row.
    """
    result = SegmentationResult(video="x.mp4", fps=FPS, frame_count=3000,
                               duration_s=100.0, spans=[raw_span(10, 20)])
    payload = result.as_dict()
    assert payload["thresholds"]["provisional"] is True
    assert payload["thresholds"]["play_enter_diff"] == PLAY_ENTER_DIFF
    assert payload["spans_found"] == 1
    assert payload["play_of_session"] == pytest.approx(0.1)


def test_describe_says_when_no_court_was_checked():
    """
    A motion-only run is a weaker claim than a court-checked one, and the difference has to
    reach whoever reads the output rather than living in a boolean nobody prints.
    """
    result = SegmentationResult(video="x.mp4", fps=FPS, frame_count=3000,
                                duration_s=100.0, spans=[raw_span(10, 20)],
                                court_checked=False)
    assert "motion alone" in describe(result)


def test_describe_explains_an_empty_result():
    result = SegmentationResult(video="x.mp4", fps=FPS, frame_count=3000,
                                duration_s=100.0)
    assert "No passages of play" in describe(result)


# ── the motion primitive ───────────────────────────────────────────────────────

def textured_frame(width=320, height=180, seed=0):
    """
    A frame with fixed background texture.

    Texture is essential rather than decorative: phase correlation locks onto whatever
    dominates the image, so on a blank background it would lock onto a moving player and
    compensate the very motion being measured. A real court has texture, and so does this.
    """
    rng = np.random.default_rng(seed)
    grey = rng.integers(0, 255, (height, width), dtype=np.uint8)
    return np.dstack([grey, grey, grey])


def test_identical_frames_have_no_motion():
    frame = textured_frame()
    assert subject_motion(frame, frame.copy()) == pytest.approx(0.0, abs=1e-6)


def test_a_moving_subject_registers_as_play():
    """The signal the pre-pass depends on: someone moving in a still frame."""
    base = textured_frame()
    a, b = base.copy(), base.copy()
    a[60:120, 40:80] = 255
    b[60:120, 140:180] = 255
    assert subject_motion(a, b) > PLAY_ENTER_DIFF


def test_a_panning_camera_does_not_register_as_play():
    """
    The invariance that makes this usable on a hand-held or drifting phone. The whole
    background moving together is the camera, not the tennis, and `precheck.assess_camera_motion`
    already judges that separately — this must not double-count it as play.
    """
    base = textured_frame()
    panned = np.roll(base, 6, axis=1)
    assert subject_motion(base, panned) < PLAY_EXIT_DIFF


def test_motion_is_comparable_across_resolutions():
    """
    Both frames are resampled to one working width, so the same tennis filmed at 480p and
    1080p must score alike. Without this the thresholds would really be resolution settings —
    and PHASE0_FINDINGS.md has clips at 480x864 alongside 1280x720 samples.
    """
    small = textured_frame(width=320, height=180)
    small_moved = small.copy()
    small[60:120, 40:80] = 255
    small_moved[60:120, 140:180] = 255

    big = cv2.resize(small, (1280, 720), interpolation=cv2.INTER_NEAREST)
    big_moved = cv2.resize(small_moved, (1280, 720), interpolation=cv2.INTER_NEAREST)

    assert subject_motion(small, small_moved) == pytest.approx(
        subject_motion(big, big_moved), rel=0.5)


def test_a_changed_aspect_ratio_reports_no_motion_rather_than_raising():
    """
    A codec that changes frame geometry mid-file is rare and real. Returning 0 ends the
    current span, which is the conservative direction: it stops measuring rather than
    inventing a boundary-crossing rally out of two incomparable frames.

    Note it takes an ASPECT RATIO change, not a resolution change, to reach this: `_grey`
    normalises every frame to one working width, so 320x180 and 160x90 both arrive as
    320x180 and compare perfectly well. That is the scale invariance the test above relies
    on, and it is why this case is narrower than "the resolution changed".
    """
    assert subject_motion(textured_frame(320, 180), textured_frame(320, 240)) == 0.0
