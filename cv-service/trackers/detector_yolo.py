"""
trackers/detector_yolo.py
─────────────────────────
Person detection + tracking via ultralytics YOLO. The original path, unchanged.

This is `PlayerTracker.detect_frame` lifted out verbatim, not rewritten. It is the
reference behaviour every measured number in the README was produced against, so the
refactor that created this file had to be a move: any "improvement" made in passing would
invalidate the comparison the RF-DETR backend exists to be judged by.

**Licensing.** `ultralytics` is AGPL-3.0 and is the only AGPL dependency in the stack.
Serving it over a network obliges us to offer the whole application's source; fine-tuning
through it produces AGPL weights "regardless of whether you train from scratch". This
backend is therefore usable for internal evaluation and NOT for launch. See
`../LICENSING.md` §1 and `detector_rfdetr.py`, which is the permissive replacement.
"""
from __future__ import annotations


def _yolo():
    """
    Import ultralytics on demand.

    Deliberately lazy, and the reason is the point of the whole backend split: the endgame
    is uninstalling this package. A module-level import would mean `import trackers` fails
    the moment someone removes the AGPL dependency, which would make the final step of the
    licensing fix look like a broken build.
    """
    from ultralytics import YOLO
    return YOLO


class YoloPersonDetector:
    """
    Detection and tracking in one call, which is how ultralytics packages it.

    `.track(persist=True)` keeps tracker state on the model object between calls, so a
    single instance must be used for exactly one clip. Reusing it across clips continues
    the previous clip's track ids into the new one — see `reset()`.
    """

    name = "yolo"

    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = _yolo()(model_path)

    def reset(self) -> None:
        """
        Drop tracker state so the next clip starts from track id 1.

        ultralytics keeps the tracker on the predictor, which is created lazily on the
        first `.track()` call and persists after it. Rebuilding the model is the only
        documented way to clear it; it costs a weight load, which is why this is explicit
        rather than automatic per clip.
        """
        self.model = _yolo()(self.model_path)

    def detect_frame(self, frame) -> dict[int, list[float]]:
        """
        Args:
            frame: one BGR frame, as OpenCV reads it.

        Returns:
            `{track_id: [x1, y1, x2, y2]}` for people only. Absent ids are dropped
            rather than invented, for the reason given inline.
        """
        results = self.model.track(frame, persist=True)[0]
        id_name_dict = results.names

        player_dict = {}
        for box in results.boxes:
            object_cls_id = box.cls.tolist()[0]
            if id_name_dict[object_cls_id] != "person":
                continue
            # ByteTrack returns detections it has not yet confirmed into a track with
            # id=None. Player selection scores candidates by ID across frames, so a
            # detection with no stable ID is unusable - skip it rather than invent one.
            if box.id is None:
                continue
            player_dict[int(box.id.tolist()[0])] = box.xyxy.tolist()[0]

        return player_dict
