"""
utils/match_structure.py
────────────────────────
Group a session's rally spans into points and games.

Why this is small
-----------------
Most of the work was already done by Phase 3. `utils/rally_segmenter.py` finds passages of play
in a long clip, and **a passage of play is a point** — a rally is exactly the unit that ends when
someone fails to return. So point detection is not new machinery; it is a renaming of something
that already exists, plus the part that genuinely is new: grouping points into games.

The signal for a game boundary
------------------------------
Nothing in the video says "game". What the video has is the length of the pause between points,
and tennis makes those pauses structurally different:

| pause | what happens | typical length |
|---|---|---|
| between points in a game | players return to the baseline, server collects a ball | seconds |
| between games | players change ends or at least walk to the other side to serve | noticeably longer |
| changeover (every odd game) | players sit down | ~90s by rule |

So a long gap is evidence of a game boundary and a very long gap is evidence of a changeover.
That is the whole inference, and it is an inference from *pacing*, not from the score.

What this cannot do, stated plainly
-----------------------------------
**It does not know the score, and it cannot.** Reading the score needs either the broadcast
scoreboard (OCR on a graphic that does not exist in phone footage) or ball-in/ball-out
adjudication on every point (which needs line-accurate bounce positions on a court whose lines
`PHASE0_FINDINGS.md` found worn away or absent). So this reports *structure* — how many points,
grouped into probable games — and never a score. A "game" here means "a run of points with no
long pause in it", which correlates with a real game and is not the same thing.

Specific ways it will be wrong:

- A player who takes a long towel break mid-game splits one game into two.
- A quick changeover on a practice court merges two games into one.
- Practice sessions and drills have no game structure at all, and this will impose one anyway.
  That is why `looks_like_match_play` exists: it reports whether the pacing is even consistent
  with a match, so a caller can decline to present games for a basket-drill session.

Every threshold here is PROVISIONAL and derived from the rules of tennis and ordinary pacing,
not from measurement. There is no full-match footage in this repo — the longest clip is 19
seconds — so nothing below has been checked against a real match. `PROGRESS.md` records this as
unmet.
"""
from __future__ import annotations

from dataclasses import dataclass, field

# Gap between consecutive points, in seconds, above which a game boundary is inferred.
#
# PROVISIONAL, reasoned from the rules. The ITF allows 25 seconds between points within a game.
# A game boundary adds walking to the other side of the court to serve, so it runs longer than
# that. 30s sits just above the between-point allowance so that a slow but legal between-point
# pause is not read as a new game.
GAME_GAP_S = 30.0

# Above this, a changeover is likely: players sit down, and the rules allow 90 seconds. Set
# below 90 because the gap is measured between detected play, and the pre-pass loses a second or
# two at each boundary to its own sampling interval.
CHANGEOVER_GAP_S = 75.0

# Below this fraction of the session spent in play, the clip does not look like match play.
# A match is mostly pauses — real matches run around 20% ball-in-play — but a session that is
# 2% play is someone filming a court, and a session that is 80% play is a drill or a rally
# session with no point structure. Both ends are reported rather than corrected.
MIN_MATCH_PLAY_FRACTION = 0.05
MAX_MATCH_PLAY_FRACTION = 0.60


@dataclass(frozen=True)
class Point:
    """One rally, which is one point. A thin wrapper over a segmenter span."""

    index: int
    start_s: float
    end_s: float
    # Seconds of pause before this point began, or None for the first point in the clip.
    gap_before_s: float | None

    @property
    def duration_s(self) -> float:
        return self.end_s - self.start_s

    def as_dict(self) -> dict:
        return {
            "point": self.index,
            "start_s": round(self.start_s, 2),
            "end_s": round(self.end_s, 2),
            "duration_s": round(self.duration_s, 2),
            "gap_before_s": (None if self.gap_before_s is None
                             else round(self.gap_before_s, 2)),
        }


@dataclass
class Game:
    """A run of points with no game-length pause inside it."""

    index: int
    points: list[Point] = field(default_factory=list)
    # Why this game was closed: the pause that followed it, or the end of the clip.
    ended_by: str = "end_of_clip"

    @property
    def start_s(self) -> float:
        return self.points[0].start_s if self.points else 0.0

    @property
    def end_s(self) -> float:
        return self.points[-1].end_s if self.points else 0.0

    def as_dict(self) -> dict:
        return {
            "game": self.index,
            "points": len(self.points),
            "start_s": round(self.start_s, 2),
            "end_s": round(self.end_s, 2),
            "ended_by": self.ended_by,
            "point_indices": [p.index for p in self.points],
        }


def points_from_spans(spans) -> list[Point]:
    """
    Turn segmenter spans into points, recording the pause before each.

    Args:
        spans: `RallySpan` objects from `utils.rally_segmenter`, in clip order.

    The gap is measured from the END of the previous span to the START of this one, which is the
    pause a viewer would see. Note that spans are PADDED by the segmenter (`PAD_S`), so a
    measured gap is shorter than the true pause by twice that padding — the thresholds here are
    therefore compared against a slightly pessimistic number, which biases toward *fewer*
    inferred game boundaries. Stated because the bias has a direction.
    """
    points: list[Point] = []
    previous_end: float | None = None
    for i, span in enumerate(spans or [], start=1):
        gap = None if previous_end is None else max(0.0, span.start_s - previous_end)
        points.append(Point(index=i, start_s=span.start_s, end_s=span.end_s,
                            gap_before_s=gap))
        previous_end = span.end_s
    return points


def group_into_games(
    points: list[Point],
    game_gap_s: float = GAME_GAP_S,
    changeover_gap_s: float = CHANGEOVER_GAP_S,
) -> list[Game]:
    """
    Split points into games wherever the pause between them is game-length.

    The pause BEFORE a point closes the previous game, rather than the pause after a point
    opening a new one. Those sound equivalent and are not: the first point of the clip has no
    pause before it and must still start a game, and the last point must not open an empty one.
    """
    games: list[Game] = []
    current = Game(index=1)

    for point in points:
        gap = point.gap_before_s
        if current.points and gap is not None and gap >= game_gap_s:
            current.ended_by = ("changeover" if gap >= changeover_gap_s
                                else "game_break")
            games.append(current)
            current = Game(index=len(games) + 1)
        current.points.append(point)

    if current.points:
        games.append(current)
    return games


def looks_like_match_play(points: list[Point], duration_s: float) -> tuple[bool, str]:
    """
    Whether this clip's pacing is even consistent with match play.

    Exists so a caller can decline to present a game breakdown for footage that has no games in
    it. A basket drill is continuous hitting with no point structure; a session of cooperative
    rallying has rallies but no serves, no pauses of game length, and no games. Imposing a game
    count on either would be inventing structure from nothing, which is the failure this whole
    module is most likely to produce.

    Returns:
        (verdict, reason). The reason is written to be shown to a person.
    """
    if not points:
        return False, "No passages of play were found, so there is no structure to read."
    if duration_s <= 0:
        return False, "The clip's length could not be read."

    play_fraction = sum(p.duration_s for p in points) / duration_s
    long_gaps = sum(1 for p in points if (p.gap_before_s or 0) >= GAME_GAP_S)

    if play_fraction > MAX_MATCH_PLAY_FRACTION:
        return False, (
            f"{play_fraction:.0%} of this clip is continuous play, which is far more than a "
            f"match (a real match is mostly pauses). This looks like drilling or a rally "
            f"session, so points are reported without game structure."
        )
    if play_fraction < MIN_MATCH_PLAY_FRACTION:
        return False, (
            f"Only {play_fraction:.0%} of this clip contains play, so most of it is not "
            f"tennis. Points are reported, but any game structure read from this would be "
            f"guesswork."
        )
    if len(points) > 1 and long_gaps == 0:
        return False, (
            "No pause between points was long enough to look like a game break, so these "
            "points are reported as one continuous passage rather than split into games."
        )
    return True, (
        f"{len(points)} points with {long_gaps} game-length pause(s), which is consistent "
        f"with match play."
    )


def analyse_structure(spans, duration_s: float) -> dict:
    """
    Points, games, and an honest statement of what the grouping means.

    Args:
        spans: `RallySpan` objects from the segmenter.
        duration_s: the clip's length.

    Returns:
        A dict for the session summary. `games` is present only when the pacing is consistent
        with match play — an empty games list and a reason is a real answer, and is the right
        one for a drill session.
    """
    points = points_from_spans(spans)
    is_match, reason = looks_like_match_play(points, duration_s)
    games = group_into_games(points) if is_match else []

    return {
        "points": len(points),
        "point_detail": [p.as_dict() for p in points],
        "looks_like_match_play": is_match,
        "structure_note": reason,
        "games": len(games),
        "game_detail": [g.as_dict() for g in games],
        # The caveat travels with the numbers, because a "games" count is the single most
        # quotable and least verified thing this module produces.
        "caveat": (
            "Games are inferred from how long the pauses between points are, not from the "
            "score - nothing here reads a scoreboard or judges a ball in or out. A 'game' "
            "means a run of points with no long pause in it, which correlates with a real "
            "game without being one. No full-match footage exists to check this against."
        ),
        "thresholds": {
            "game_gap_s": GAME_GAP_S,
            "changeover_gap_s": CHANGEOVER_GAP_S,
            "provisional": True,
        },
    }


__all__ = [
    "CHANGEOVER_GAP_S", "GAME_GAP_S", "Game", "Point",
    "analyse_structure", "group_into_games", "looks_like_match_play",
    "points_from_spans",
]
