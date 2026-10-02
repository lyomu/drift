"""
trackers/detector_rfdetr.py
───────────────────────────
Person detection via RF-DETR (Apache-2.0) + track ids via `supervision.ByteTrack` (MIT).

Why this exists
---------------
Not for accuracy. `UPSTREAM_README.md` §"What we tried that did not work" already measured
that a larger or newer detector buys nothing here: YOLOv8x finds 11-14 people per frame on
the reference clip and the pipeline needs 2, so the hard part is *selecting* the two
players, which is our own logic. Detection is saturated.

This exists because `ultralytics` is AGPL-3.0 and this pipeline is destined to run as a
network service, which is the one topology AGPL §13 speaks to directly. `LICENSING.md` §1
sets out the whole argument; the short version is that the AGPL obligation attaches to
weights too — "regardless of whether you train from scratch" — so *any* fine-tuning done
through ultralytics produces weights that cannot ship in a proprietary service. Replacing
it is therefore a prerequisite for training anything, not a cleanup task to do afterwards.

RF-DETR is Apache-2.0 and explicitly built for fine-tuning; `supervision` was already a
dependency and already ships ByteTrack, so the tracking half cost nothing but wiring.

What differs from the YOLO backend, and what deliberately does not
-----------------------------------------------------------------
ultralytics hands back detection and tracking from one `.track()` call. Here they are two
objects, which is the bulk of the work in this file. Everything downstream — player
selection, scoring, the stub cache — consumes `{track_id: bbox}` and cannot tell the
difference, which is the point.

**On the confidence threshold.** The default here is 0.25 because that is ultralytics'
predict/track default, i.e. the threshold every published number in this repo was actually
measured at. Note that `detection.player_confidence: 0.7` in `configs/config.yaml` is NOT
that threshold and never was: it is passed to `PlayerTracker.filter_by_confidence`, which
filters on box *size*, not confidence (see `main.py:1488`). Wiring 0.7 in here would have
made the two backends incomparable on their first run and looked like an RF-DETR
regression. Provisional in the sense that it is inherited, not calibrated — nothing in this
repo has yet measured person-detection recall against labels on either backend.

**Model size is a deliberate parameter, not a default to trust.** Nothing here has been
measured against a Drift clip, so DEFAULT_SIZE is a starting point, not a calibrated choice.
"""
from __future__ import annotations

import numpy as np

from .coco_labels import resolve_coco_class_id

# RF-DETR ships several checkpoints. Named here so a bad size fails with a list of what is
# available rather than an AttributeError from inside the package.
#
# `base` is kept selectable but is NOT the default: measured on rfdetr 1.11.0, RFDETRBase is
# deprecated since v1.7.0 and is removed in v2.0.0. Nano, Small, Medium and Large carry no
# deprecation. Keeping `base` reachable matters for reproducing anything measured on it;
# defaulting to it would have built a new feature on a class with a removal date.
MODEL_CLASSES = ("nano", "small", "medium", "base", "large")

# Default checkpoint. UNMEASURED — chosen because it is the non-deprecated size nearest the
# retired `base` in capacity, not because it was compared against anything. Detection is
# already saturated for this task (see the module docstring), so the size is unlikely to be
# what decides whether the swap works; `eval/player_detector_comparison.py` is where that
# question gets an answer rather than an assumption.
DEFAULT_SIZE = "medium"

# Ultralytics' predict/track default, adopted so the two backends are compared at the same
# operating point. See the module docstring — this is inherited, not calibrated.
DEFAULT_CONFIDENCE = 0.25


def _load_model(size: str, **kwargs):
    """
    Instantiate an RF-DETR checkpoint by size name.

    The import is local so that importing this module — which `trackers/__init__.py` does
    at startup — does not require `rfdetr` to be installed. The YOLO path must keep
    working on a machine that has not installed the replacement yet.
    """
    if size not in MODEL_CLASSES:
        raise ValueError(
            f"Unknown RF-DETR size {size!r}. Available: {', '.join(MODEL_CLASSES)}"
        )
    try:
        import rfdetr  # type: ignore
    except ImportError as exc:
        raise ImportError(
            "rfdetr is not installed. `pip install rfdetr` (Apache-2.0), or set "
            "models.player_backend: yolo in configs/config.yaml to use the AGPL path."
        ) from exc

    class_name = f"RFDETR{size.capitalize()}"
    model_cls = getattr(rfdetr, class_name, None)
    if model_cls is None:
        available = sorted(n for n in dir(rfdetr) if n.startswith("RFDETR"))
        raise ImportError(
            f"{class_name} not found in the installed rfdetr "
            f"({rfdetr.__version__ if hasattr(rfdetr, '__version__') else 'unknown'}). "
            f"It exposes: {', '.join(available) or 'no RFDETR* classes'}"
        )
    return model_cls(**kwargs)


class RfDetrPersonDetector:
    """
    Person boxes with stable track ids, from a permissively licensed detector.

    One instance tracks one clip. ByteTrack holds Kalman state and an id counter across
    `detect_frame` calls, which is what makes ids stable within a clip and what makes
    reusing an instance across clips wrong — `reset()` exists for that.
    """

    name = "rfdetr"

    def __init__(
        self,
        size: str = DEFAULT_SIZE,
        confidence: float = DEFAULT_CONFIDENCE,
        person_class_id: int | None = None,
        model=None,
        tracker=None,
    ):
        """
        Args:
            size: which RF-DETR checkpoint, one of MODEL_CLASSES. See DEFAULT_SIZE.
            confidence: detection threshold. See the module docstring on why 0.25.
            person_class_id: override COCO class resolution. Only for a package that
                exposes no label map; resolution by name is correct under both COCO
                numbering schemes and is what runs otherwise. See `coco_labels`.
            model, tracker: injected for tests, which must not need weights or a GPU.
        """
        self.confidence = confidence
        self.model = model if model is not None else _load_model(size)
        self._person_class_id = person_class_id
        self._tracker = tracker
        self._size = size

    @property
    def person_class_id(self) -> int:
        """
        Resolved lazily and cached: the resolution imports `rfdetr`, and a test that
        injects a fake model should not have to have the real package installed.
        """
        if self._person_class_id is None:
            self._person_class_id = resolve_coco_class_id("person")
        return self._person_class_id

    @property
    def tracker(self):
        """ByteTrack, built on first use so `reset()` and construction share one path."""
        if self._tracker is None:
            import supervision as sv

            self._tracker = sv.ByteTrack()
        return self._tracker

    def reset(self) -> None:
        """
        Forget every track, so the next clip starts from id 1.

        Cheap here, unlike the YOLO backend: ByteTrack holds no weights, so this discards
        the tracker and keeps the loaded model.
        """
        self._tracker = None

    def detect_frame(self, frame) -> dict[int, list[float]]:
        """
        Args:
            frame: one BGR frame, as OpenCV reads it. Converted to RGB here — RF-DETR
                   expects RGB, and feeding it BGR is a silent accuracy loss rather than
                   an error, which is the kind of bug that shows up as "the permissive
                   detector is worse" three weeks later.

        Returns:
            `{track_id: [x1, y1, x2, y2]}` for people only, matching the YOLO backend's
            contract exactly — including dropping unconfirmed detections that ByteTrack
            has not yet assigned an id, because player selection scores tracks by id
            across frames and cannot use a detection without one.
        """
        rgb = frame[:, :, ::-1]
        detections = self.model.predict(rgb, threshold=self.confidence)

        people = detections[detections.class_id == self.person_class_id]
        tracked = self.tracker.update_with_detections(people)

        player_dict: dict[int, list[float]] = {}
        if tracked.tracker_id is None:
            return player_dict

        for bbox, track_id in zip(tracked.xyxy, tracked.tracker_id):
            if track_id is None:
                continue
            player_dict[int(track_id)] = [float(v) for v in np.asarray(bbox).tolist()]

        return player_dict
