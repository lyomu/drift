"""
utils/player_selection.py
─────────────────────────
Narrows raw person detections to the two players, with stable ids 1 and 2.

Why this is shared rather than inline
-------------------------------------
main.py did this itself and the evals did not, so the evals fed every detected person
into the pipeline: on the reference clip that is fourteen people, and the "player" ids
reaching downstream logic included spectators and ball kids. That is invisible while
nothing depends on WHICH player was involved, and it stops being invisible the moment
something does. The rally grammar in utils.rally_decode depends on exactly that: its
strongest rule is that a player cannot hit twice in succession, and a spectator id
between two contacts by one player makes an impossible rally look legal.

So the eval was grading a worse input than the product ships, in a way that made a new
feature look harmful. The function lives here so that cannot drift apart again.
"""
from __future__ import annotations

# Re-exported names for the side keys in per_side_counts, so this module and
# utils/court_sides.py cannot disagree about which int means which end.
from .court_sides import FAR as FAR_SIDE, NEAR as NEAR_SIDE


def select_two_players(
    player_tracker,
    player_detections: list[dict],
    court_keypoints,
) -> tuple[list[dict], dict]:
    """
    Filter to the two players and renumber them 1 and 2.

    Args:
        player_tracker:    supplies `choose_and_filter_players` (the 6-criteria scoring).
        player_detections: per-frame {track_id: bbox} for every detected person.
        court_keypoints:   court keypoints used by the selection scoring.

    Returns:
        (detections, id_map). `detections` holds only the chosen players under ids 1 and
        2; `id_map` records the original track ids they came from, for logging.
    """
    return select_players(player_tracker, player_detections, court_keypoints, per_side=1)


def select_players(
    player_tracker,
    player_detections: list[dict],
    court_keypoints,
    per_side: int = 1,
) -> tuple[list[dict], dict]:
    """
    Filter to the players and renumber them 1..N.

    The N-player form. `per_side` is 1 for singles (2 players) and 2 for doubles (4), and is
    explicit rather than inferred — see `PlayerTracker.choose_and_filter_players` for why a
    person count cannot stand in for it.

    Numbering is by ORIGINAL TRACK ID order, which is arbitrary but stable within a run. It
    deliberately carries no meaning: player 1 is not "the near player" or "you". Anything that
    needs to know which end a player is at asks `utils.court_sides`, because that is a geometric
    question and this is just a renumbering.

    Args:
        per_side: expected players per side of the net.

    Returns:
        (detections, id_map). `detections` holds only the chosen players under ids 1..N;
        `id_map` records the original track ids, for logging.
    """
    chosen = player_tracker.choose_and_filter_players(
        player_detections, court_keypoints, per_side=per_side)

    # Build the id map from every frame, not frame 0: selection already narrowed this to
    # the chosen players, but a player can be absent from the opening frame (replay wipe,
    # off-screen at serve) and reading only frame 0 would silently drop them.
    chosen_ids = sorted({track_id for frame in chosen for track_id in frame})
    id_map = {orig: new for new, orig in enumerate(chosen_ids[:per_side * 2], start=1)}

    normalized = [
        {id_map[k]: v for k, v in frame.items() if k in id_map} for frame in chosen
    ]
    return normalized, id_map


# ── Was the selection any good? ────────────────────────────────────────────────

from dataclasses import dataclass

SELECTION_OK = "ok"
SELECTION_DEGRADED = "degraded"
SELECTION_FAILED = "failed"

# Below this share of frames, shot attribution starts failing: the rally grammar's
# same-player rule needs a player to exist at the contact frame, and a player who is
# absent cannot be credited with the shot. Not tuned, it is the level at which the
# downstream consumer breaks.
MIN_COVERAGE = 0.80

# A continuous absence longer than this share of the clip is a different failure from
# scattered misses with the same average: it is a stretch of the rally with nobody to
# attribute shots to.
MAX_GAP_FRACTION = 0.10


@dataclass(frozen=True)
class SelectionQuality:
    """Whether the two selected tracks could plausibly be the two players."""

    status: str
    reason: str
    coverage: tuple
    longest_gaps: tuple
    opposite_sides: bool
    people_detected: int
    # Per-side player counts, e.g. {FAR: 2, NEAR: 2} for a healthy doubles clip. Empty for a
    # singles assessment, where `opposite_sides` already carries the same information.
    per_side_counts: dict | None = None
    expected_per_side: int = 1

    @property
    def is_ok(self) -> bool:
        return self.status == SELECTION_OK

    def as_dict(self) -> dict:
        # Every value is coerced to a plain Python type. Bounding boxes and frame counts
        # arrive as numpy scalars, and json.dump does not serialise those: it writes the
        # file as far as the first one and then raises, leaving a truncated summary.
        payload = {
            "status": self.status,
            "players_on_opposite_sides": bool(self.opposite_sides),
            "people_detected": int(self.people_detected),
            # The N-player view. Added alongside the player_1_/player_2_ keys below rather
            # than replacing them: those keys are read by the mobile results screen and by
            # utils/session_aggregate.py, both already shipped, and breaking them to tidy up
            # a schema would be a regression in exchange for nothing.
            "players": [
                {
                    "player": i,
                    "coverage": round(float(cov), 3),
                    "longest_gap_frames": int(gap),
                }
                for i, (cov, gap) in enumerate(zip(self.coverage, self.longest_gaps), start=1)
            ],
            "expected_per_side": int(self.expected_per_side),
        }
        if self.per_side_counts:
            payload["players_per_side"] = {
                str(side): int(n) for side, n in self.per_side_counts.items()
            }
        for i, (cov, gap) in enumerate(zip(self.coverage, self.longest_gaps), start=1):
            if i > 2:
                break
            payload[f"player_{i}_coverage"] = round(float(cov), 3)
            payload[f"player_{i}_longest_gap_frames"] = int(gap)
        if self.status != SELECTION_OK:
            payload["warning"] = self.reason
        return payload


def assess_selection(
    selected: list[dict],
    net_y: float,
    people_detected: int,
    expected_per_side: int = 1,
) -> SelectionQuality:
    """
    Judge a completed selection without any ground truth.

    Why this exists
    ---------------
    The court-validity gate stops a clip whose COURT was fitted to the crowd. Nothing
    stopped a clip whose PLAYERS were. Measured across the nine evaluation clips
    (eval/player_selection_sanity.py), input_video_11 passes the court gate comfortably
    at 0.327 line support and still selects two tracks that sit on the same side of the
    net, one of them present for 40% of frames with a 199-frame hole in the middle. The
    pipeline reported confident numbers on it.

    The check needs no labels because the sport supplies the constraint: singles is
    played across the net, so two tracks on the same half cannot both be players. That is
    the same kind of reasoning the rally grammar and the court gate already use.

    This is a sanity check, not an accuracy measurement. Precision, recall, IDF1 and ID
    switches need labelled boxes that do not exist for this footage.

    Args:
        selected:        per-frame {1|2: bbox}, the output of select_two_players.
        net_y:           image y of the net line, midway between the two baselines.
        people_detected: how many distinct tracks the detector found, for context.
    """
    total = len(selected) or 1
    coverage, gaps, medians = [], [], []

    # Whatever ids are actually present, not a hardcoded (1, 2). A doubles clip has four, and a
    # clip where selection found only three players must be assessed on the three it found
    # rather than raising on a missing key.
    present_ids = sorted({pid for frame in selected for pid in frame}) or [1, 2]
    for pid in present_ids:
        present = [pid in frame for frame in selected]
        coverage.append(sum(present) / total)

        worst = run = 0
        for is_present in present:
            run = 0 if is_present else run + 1
            worst = max(worst, run)
        gaps.append(worst)

        feet = sorted(frame[pid][3] for frame in selected if pid in frame)
        medians.append(feet[len(feet) // 2] if feet else None)

    # Which side of the net each player's median foot position sits on. Counting sides rather
    # than unpacking a pair is what makes this work for doubles: the constraint tennis supplies
    # is that play happens ACROSS the net, so each side should hold `expected_per_side` players
    # whether that is one or two.
    # bool() at construction, not at comparison. Foot positions arrive as numpy scalars, so
    # `m > net_y` is a numpy.bool_ — and `numpy.bool_(True) is True` is False, because it is
    # not the Python singleton. The identity checks below silently counted zero players per
    # side until an existing test caught it. This is the same numpy leak the as_dict comment
    # warns about, reached by a different route.
    sides = [None if m is None else bool(m > net_y) for m in medians]
    near_count = sum(1 for s_ in sides if s_ is True)
    far_count = sum(1 for s_ in sides if s_ is False)

    # bool(), not the bare comparison. Bounding boxes arrive as numpy scalars, so this
    # expression evaluates to numpy.bool_, which json.dump cannot serialise: the summary
    # was written as far as this key and then truncated mid-file.
    opposite = bool(near_count > 0 and far_count > 0)

    problems = []
    if not opposite:
        problems.append(
            "every selected track sits on the same side of the net, so at least one of "
            "them is not a player. Tennis is played across the net, so this is not a "
            "close call"
        )
    elif expected_per_side > 1 and (near_count != expected_per_side
                                    or far_count != expected_per_side):
        # Doubles-specific and deliberately not fatal. Three tracked players on a doubles clip
        # means one partner was missed, which under-counts that team's shots — the same failure
        # mode as a coverage gap, and reported the same way rather than as a refusal.
        problems.append(
            f"expected {expected_per_side} players per side but found {far_count} and "
            f"{near_count}, so at least one player is untracked and their shots cannot be "
            f"attributed"
        )
    for pid, (cov, gap) in enumerate(zip(coverage, gaps), start=1):
        if cov < MIN_COVERAGE:
            problems.append(f"player {pid} is present on only {cov:.0%} of frames")
        if gap > total * MAX_GAP_FRACTION:
            problems.append(f"player {pid} is missing for {gap} consecutive frames")

    if not problems:
        status = SELECTION_OK
        reason = (f"{len(present_ids)} players, opposite sides, tracked throughout"
                  if expected_per_side > 1
                  else "two players, opposite sides, tracked throughout")
    elif not opposite:
        # The decisive one. Everything downstream that names a player is wrong.
        status = SELECTION_FAILED
        reason = ("Player selection failed: " + "; ".join(problems)
                  + ". Shot counts, per-player statistics and shot attribution from this "
                    "run are not measurements.")
    else:
        status = SELECTION_DEGRADED
        reason = ("Player tracking is incomplete: " + "; ".join(problems)
                  + ". Shots played during those stretches cannot be attributed, so the "
                    "per-player counts are an under-count.")

    return SelectionQuality(
        status=status, reason=reason,
        coverage=tuple(coverage), longest_gaps=tuple(gaps),
        opposite_sides=opposite, people_detected=people_detected,
        per_side_counts=({FAR_SIDE: far_count, NEAR_SIDE: near_count}
                         if expected_per_side > 1 else None),
        expected_per_side=expected_per_side,
    )
