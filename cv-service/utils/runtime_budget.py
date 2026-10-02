"""
utils/runtime_budget.py
───────────────────────
Decide whether a clip fits a time budget BEFORE analysing it.

The acceptance criterion this serves
------------------------------------
`AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md` Phase 4: *"A full match processes within a defined
time budget, not just 'eventually finishes'."* The two halves of that sentence need different
things. "Eventually finishes" is what the pipeline already does. "Within a defined budget"
requires (a) a defined budget, and (b) knowing the cost before committing to it — otherwise the
only way to discover a clip was too expensive is to spend the time discovering it.

This is (b). It estimates cost from frame count and a measured per-frame rate, and answers
before any model runs.

Why not just make it faster
---------------------------
That was the other option and it is the more attractive one, so the reason it is not here
matters. The obvious lever is to process fewer frames — stride every other frame, halving the
cost. **That would silently change the results**, and by a measured amount:
`UPSTREAM_README.md` §"Frame rate" resamples the reference clip and reports events per second
against the sampling rate — 15 fps loses 43% of events, 60 fps produces 11 contacts against 35
bounces on a rally with roughly 14 of each. Every threshold in the event path is counted in
frames and the two largest classifier weights are pixels per frame, none of it normalised.

Striding *is* resampling. A "performance knob" that strides frames is the frame-rate failure
wearing a different name, and it would arrive with no warning attached to the numbers it moved.
Normalising the event path to seconds and metres is the real fix, and `UPSTREAM_README.md`
already lists it as post-launch work "because it would invalidate every number above in the
process".

So this module does the honest thing available today: it makes the cost visible and lets a
caller refuse, rather than making the pipeline cheaper by making it wrong.

The per-frame rate is measured, not assumed
-------------------------------------------
`DEFAULT_SECONDS_PER_FRAME` is calibrated from this project's own measurements and is specific
to one GPU. `eval/runtime_profile.py` re-measures it, and the estimate accepts an override so a
different machine is not stuck with this one's number.
"""
from __future__ import annotations

from dataclasses import dataclass

# Wall-clock seconds of analysis per frame of video.
#
# MEASURED, on an RTX 4060: a 60-frame run took 38 s end to end over HTTP, which is 0.63 s per
# frame. That figure includes fixed startup (interpreter, three model loads) amortised over only
# 60 frames, so it OVERSTATES the marginal cost of a long clip — which is the safe direction for
# a budget check, since it errs toward refusing rather than toward an overrun.
#
# The upstream measurement on a GTX 1050 Ti was 5 m 51 s for 570 frames, i.e. 0.62 s per frame,
# which is almost identical. Two different GPUs landing in the same place is suspicious of an
# I/O or per-frame Python bound rather than a GPU bound, and that is worth knowing before anyone
# buys a faster card to fix this. `eval/runtime_profile.py` is where that gets settled.
DEFAULT_SECONDS_PER_FRAME = 0.63

# Fixed cost per run, regardless of length: interpreter start, and loading the player, ball and
# court models. Measured at ~8 s for a one-shot CLI invocation (utils/precheck.py records the
# same figure for its own startup). Irrelevant on a long clip, dominant on a short one.
STARTUP_SECONDS = 8.0

# Default ceiling for one analysis request. Matches the frame budget policy in
# configs/config.yaml (5400 frames at the rate above is ~57 minutes), expressed in time rather
# than frames so a caller can reason about it without knowing the frame rate.
DEFAULT_BUDGET_SECONDS = 3600.0

VERDICT_FITS = "fits"
VERDICT_TIGHT = "tight"
VERDICT_EXCEEDS = "exceeds"

# Within this fraction of the budget, report `tight` rather than `fits`. An estimate built on a
# single per-frame constant should not claim precision it does not have, and a clip estimated at
# 98% of budget will sometimes overrun.
TIGHT_MARGIN = 0.8


@dataclass(frozen=True)
class RuntimeEstimate:
    """What a clip will cost, and whether that is acceptable."""

    frames: int
    seconds_per_frame: float
    estimated_seconds: float
    budget_seconds: float
    verdict: str
    reason: str

    @property
    def fits(self) -> bool:
        return self.verdict != VERDICT_EXCEEDS

    def as_dict(self) -> dict:
        return {
            "frames": int(self.frames),
            "seconds_per_frame": round(float(self.seconds_per_frame), 3),
            "estimated_seconds": round(float(self.estimated_seconds), 1),
            "estimated_minutes": round(float(self.estimated_seconds) / 60.0, 1),
            "budget_seconds": round(float(self.budget_seconds), 1),
            "verdict": self.verdict,
            "reason": self.reason,
            # The estimate rests on one constant measured on one machine. Saying so travels with
            # the number, because a refusal a user cannot question is worse than a slow run.
            "provisional": True,
        }


def estimate_runtime(
    frames: int,
    budget_seconds: float = DEFAULT_BUDGET_SECONDS,
    seconds_per_frame: float = DEFAULT_SECONDS_PER_FRAME,
    startup_seconds: float = STARTUP_SECONDS,
) -> RuntimeEstimate:
    """
    How long analysing `frames` frames will take, and whether it fits.

    Args:
        frames: frame count to be analysed — the frames actually processed, so for a session
            this is the sum of the rally spans rather than the whole video.
        budget_seconds: ceiling. See DEFAULT_BUDGET_SECONDS.
        seconds_per_frame: override the measured rate for a different machine.
        startup_seconds: fixed per-run cost.

    Returns:
        A `RuntimeEstimate`. Note `verdict == "exceeds"` is advice, not enforcement: this module
        decides nothing on its own, because whether to spend two hours on a clip is a policy
        question that belongs to the caller who knows whose GPU it is.
    """
    frames = max(0, int(frames))
    estimated = startup_seconds + frames * seconds_per_frame

    if frames == 0:
        return RuntimeEstimate(
            frames=0, seconds_per_frame=seconds_per_frame, estimated_seconds=0.0,
            budget_seconds=budget_seconds, verdict=VERDICT_FITS,
            reason="Nothing to analyse.",
        )

    if estimated > budget_seconds:
        verdict = VERDICT_EXCEEDS
        reason = (
            f"Analysing {frames} frames is estimated at {estimated / 60:.0f} minutes, over the "
            f"{budget_seconds / 60:.0f}-minute budget. Analysing part of it and saying which "
            f"part is better than starting something that will not finish in time."
        )
    elif estimated > budget_seconds * TIGHT_MARGIN:
        verdict = VERDICT_TIGHT
        reason = (
            f"Analysing {frames} frames is estimated at {estimated / 60:.0f} minutes, close to "
            f"the {budget_seconds / 60:.0f}-minute budget. The estimate comes from a single "
            f"per-frame constant, so this may overrun."
        )
    else:
        verdict = VERDICT_FITS
        reason = (f"Estimated {estimated / 60:.1f} minutes for {frames} frames, within the "
                  f"{budget_seconds / 60:.0f}-minute budget.")

    return RuntimeEstimate(
        frames=frames, seconds_per_frame=seconds_per_frame,
        estimated_seconds=estimated, budget_seconds=budget_seconds,
        verdict=verdict, reason=reason,
    )


def frames_within_budget(
    budget_seconds: float = DEFAULT_BUDGET_SECONDS,
    seconds_per_frame: float = DEFAULT_SECONDS_PER_FRAME,
    startup_seconds: float = STARTUP_SECONDS,
) -> int:
    """
    The inverse: how many frames fit in a budget.

    This is what turns a time budget into the frame budget `session.py` already enforces, so the
    two are the same policy expressed in different units rather than two numbers that can drift
    apart.
    """
    usable = budget_seconds - startup_seconds
    if usable <= 0 or seconds_per_frame <= 0:
        return 0
    return int(usable / seconds_per_frame)


def describe_full_match(
    minutes: float = 90.0,
    fps: float = 30.0,
    play_fraction: float = 0.2,
    seconds_per_frame: float = DEFAULT_SECONDS_PER_FRAME,
) -> dict:
    """
    The arithmetic Phase 4 asks for, on a typical full match.

    Exists because "a full match at current processing speeds is impractical" is a claim the plan
    makes, and a claim like that is worth being able to reproduce rather than repeat. Defaults
    describe a 90-minute match at 30 fps with roughly a fifth of it ball-in-play, which is the
    commonly cited figure for real tennis.

    Returns the estimate for both the whole video and the play-only subset, because segmentation
    (Phase 3) is what makes the difference between the two — and the point of the comparison is
    that segmentation helps by a factor of five and the result is still hours.
    """
    total_frames = int(minutes * 60 * fps)
    play_frames = int(total_frames * play_fraction)

    whole = estimate_runtime(total_frames, seconds_per_frame=seconds_per_frame,
                             budget_seconds=DEFAULT_BUDGET_SECONDS)
    play_only = estimate_runtime(play_frames, seconds_per_frame=seconds_per_frame,
                                 budget_seconds=DEFAULT_BUDGET_SECONDS)

    return {
        "match_minutes": minutes,
        "fps": fps,
        "play_fraction": play_fraction,
        "whole_video": whole.as_dict(),
        "play_only": play_only.as_dict(),
        "conclusion": (
            f"A {minutes:.0f}-minute match is {total_frames} frames, about "
            f"{whole.estimated_seconds / 3600:.1f} hours analysed end to end. Segmenting to the "
            f"~{play_fraction:.0%} that is play brings it to about "
            f"{play_only.estimated_seconds / 3600:.1f} hours, which is still far past any "
            f"interactive budget on one GPU. Full-match analysis needs the event path normalised "
            f"to seconds and metres first, so frames can be processed at a lower rate without "
            f"changing the event counts - see the module docstring on why striding is not a "
            f"shortcut."
        ),
    }
