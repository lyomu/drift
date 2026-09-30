"""
trackers/racket_detector.py
───────────────────────────
Find the racket directly, instead of inferring where it must be from the body.

Why this is the one untried avenue
----------------------------------
Three forehand/backhand approaches have been built and rejected in this repo, and they
share a root cause. The signal that separates a forehand from a backhand is **where the
racket is**, and every rejected approach tried to recover that from pose:

| approach | result |
|---|---|
| hand-crafted geometry rule | 54% balanced (chance-ish on 2 classes) |
| trained pose classifier, THETIS | 76.3% |
| the same classifier, real broadcast images | **53.6%** |

MediaPipe drops the racket arm on 44-58% of backhands — it declines when the arm is
occluded, which is exactly when the answer matters. SAM 3D Body recovers that arm and made
things *worse*: on identical clips, balanced accuracy fell 85.5% → 66.4%, and isolating
features showed why — wrist-side accuracy collapsed to 51.8%, chance, while motion features
held. It infers the occluded arm from a body prior, which is anatomically plausible and
still a guess about where the racket is.

Detecting the racket does not guess. That is the entire argument for this module, and it is
an argument about the failure mode rather than a promise about accuracy.

What is measured, and what is explicitly not
--------------------------------------------
`eval/racket_coverage_at_contacts.py` measures **coverage**: on contact frames where pose
cannot decide forehand from backhand, is a racket found and attributable to the hitting
player? Coverage is answerable on the footage that exists.

Accuracy is not, and no number from this module should be read as one. There are 13
labelled events in `datasets/labels/`, on a broadcast clip, and `PHASE0_FINDINGS.md` plus
every negative result above say the same thing: a score on broadcast or THETIS footage has
already proven not to transfer to Drift's camera domain. Accuracy waits for labelled Drift
footage. Nothing here is wired into the pipeline.

Licensing
---------
RF-DETR is Apache-2.0 and its COCO checkpoints already carry a `tennis racket` class, so a
first signal needs no training at all and encumbers nothing. That matters: a racket detector
fine-tuned through `ultralytics` would be AGPL-3.0 weights and unshippable in a proprietary
service. See `../LICENSING.md` §1.
"""
from __future__ import annotations

import numpy as np

from .coco_labels import resolve_coco_class_id
from .detector_rfdetr import DEFAULT_CONFIDENCE, DEFAULT_SIZE, _load_model

# How far a racket's centre may sit from a player's box centre and still be called that
# player's racket, as a multiple of the player's box HEIGHT.
#
# PROVISIONAL, and from geometry rather than measurement — nothing in this repo has yet
# measured a racket-to-player distance against labels. The reasoning: a racket at full
# extension sits about an arm plus a racket from the body centre, roughly 1.1 m against a
# ~1.8 m player, so ~0.6 box heights. 1.2 is that doubled, to absorb foreshortening at
# ground-level camera angles (PHASE0_FINDINGS.md cause 5) and the fact that a box centre is
# not a body centre when a player is lunging.
#
# Scaling by box height rather than pixels is what makes it camera-independent: the same
# constant has to work on a 480px WhatsApp transfer and a 1080p broadcast frame.
# Re-derive it the moment there is labelled footage to derive it from.
MAX_RACKET_DISTANCE_BOX_HEIGHTS = 1.2


class RacketDetector:
    """
    Per-frame racket boxes from RF-DETR's COCO `tennis racket` class.

    No tracking, deliberately. A racket is occluded, motion-blurred and self-similar to a
    forearm at contact, so a tracker's constant-velocity prior would happily coast through
    the frames where the detector declines — inventing a racket position at precisely the
    moment the honest answer is "not visible". That is the SAM 3D Body failure restated, and
    this module exists because of it. Each frame answers for itself or says nothing.
    """

    def __init__(
        self,
        size: str = DEFAULT_SIZE,
        confidence: float = DEFAULT_CONFIDENCE,
        racket_class_id: int | None = None,
        model=None,
    ):
        """
        Args:
            size: RF-DETR checkpoint size, as in `RfDetrPersonDetector`.
            confidence: detection threshold, inherited from the person detector's default
                rather than calibrated. A racket is small, thin and blurred at contact, so
                this is the parameter most likely to need lowering — and the eval reports
                coverage precisely so that a change to it is visible as a number.
            racket_class_id: override COCO class resolution. See `coco_labels` on why
                resolving by name matters more here than usual: id 43 is `tennis racket`
                under one COCO scheme and `knife` under the other, and neither raises.
            model: an already-loaded RF-DETR. Pass the person detector's model to avoid a
                second copy of the weights on the GPU; injected by tests to avoid weights
                entirely.
        """
        self.confidence = confidence
        self.model = model if model is not None else _load_model(size)
        self._racket_class_id = racket_class_id

    @property
    def racket_class_id(self) -> int:
        """Resolved lazily and cached, for the reason given in `RfDetrPersonDetector`."""
        if self._racket_class_id is None:
            self._racket_class_id = resolve_coco_class_id("tennis racket")
        return self._racket_class_id

    def detect_frame(self, frame) -> list[dict]:
        """
        Args:
            frame: one BGR frame, as OpenCV reads it. Converted to RGB — see
                   `RfDetrPersonDetector.detect_frame` on why that conversion is load-bearing.

        Returns:
            A list of `{"bbox": [x1, y1, x2, y2], "confidence": float}`, most confident
            first. Empty when no racket is found, which is a real answer and the one this
            module is built to be able to give.
        """
        rgb = frame[:, :, ::-1]
        detections = self.model.predict(rgb, threshold=self.confidence)
        rackets = detections[detections.class_id == self.racket_class_id]

        out = []
        confidences = (
            rackets.confidence
            if rackets.confidence is not None
            else [None] * len(rackets.xyxy)
        )
        for bbox, conf in zip(rackets.xyxy, confidences):
            out.append({
                "bbox": [float(v) for v in np.asarray(bbox).tolist()],
                "confidence": float(conf) if conf is not None else None,
            })

        out.sort(key=lambda d: (d["confidence"] is not None, d["confidence"] or 0.0),
                 reverse=True)
        return out

    def detect_frames(self, frames) -> list[list[dict]]:
        """One entry per frame, in frame order. No stub cache: this is eval-only code."""
        return [self.detect_frame(frame) for frame in frames]


def _centre(bbox) -> tuple[float, float]:
    """
    Box centre as floats.

    Not `utils.get_center_of_bbox`, which casts to int — a deliberate difference. The
    racket-side sign this feeds is a comparison against a body midline, and rounding both
    sides of a near-midline comparison to whole pixels is how a weak signal becomes a
    biased one.
    """
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


def racket_for_player(
    rackets: list[dict],
    player_bbox,
    max_distance_box_heights: float = MAX_RACKET_DISTANCE_BOX_HEIGHTS,
) -> dict | None:
    """
    Which of this frame's rackets belongs to this player, if any.

    Nearest centre wins, subject to a distance gate. Returning None matters as much as
    returning a box: in a doubles frame, or with a racket bag courtside, the nearest racket
    to a player may be nobody's. An ungated nearest-neighbour always answers, and this
    project's own negative results are a catalogue of what always-answering costs.

    Args:
        rackets: this frame's detections, from `RacketDetector.detect_frame`.
        player_bbox: `[x1, y1, x2, y2]` for the player in question.
        max_distance_box_heights: the gate. See MAX_RACKET_DISTANCE_BOX_HEIGHTS — it is
            provisional and derived from body proportions, not from labels.

    Returns:
        The winning detection dict with an added `distance_px`, or None.
    """
    if not rackets or player_bbox is None:
        return None

    px1, py1, px2, py2 = player_bbox
    box_height = abs(py2 - py1)
    if box_height <= 0:
        return None   # a degenerate player box cannot scale a distance gate

    pcx, pcy = _centre(player_bbox)
    limit = max_distance_box_heights * box_height

    best = None
    for racket in rackets:
        rcx, rcy = _centre(racket["bbox"])
        distance = ((rcx - pcx) ** 2 + (rcy - pcy) ** 2) ** 0.5
        if distance > limit:
            continue
        if best is None or distance < best["distance_px"]:
            best = {**racket, "distance_px": distance}

    return best
