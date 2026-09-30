"""
tests/test_detector_backends.py
───────────────────────────────
Tests for the swappable person-detection backend, and for the COCO class resolution it
depends on.

Why these tests and not accuracy tests
--------------------------------------
Whether RF-DETR detects people as well as YOLOv8x is a measurement on video, and it lives in
`eval/player_detector_comparison.py`. What can be tested without weights is the thing most
likely to be silently wrong: the *contract*. Both backends must return `{track_id: bbox}`
with the same exclusions, because ~200 lines of player-selection logic are written against
that shape and cannot tell which detector produced it.

The class-id tests are the sharpest ones here. COCO has two incompatible numbering schemes,
and a confusion between them produces a working detector for the wrong object — id 43 is
`tennis racket` in one and `knife` in the other, and neither raises. Every test below that
looks pedantic about names is guarding that.

No test in this file needs weights, a GPU, `rfdetr`, or `ultralytics`.
"""
import os
import sys

import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trackers import coco_labels
from trackers.coco_labels import KNOWN_SCHEMES, resolve_coco_class_id
from trackers.detector_rfdetr import RfDetrPersonDetector
from trackers.player_tracker import PlayerTracker

PERSON_ID = 1
RACKET_ID = 43


class FakeDetections:
    """
    The slice of `supervision.Detections` these backends actually use.

    Boolean-mask indexing, `.xyxy`, `.class_id`, `.confidence`, `.tracker_id`. Written out
    rather than importing supervision so the contract being relied on is visible here — if a
    future supervision release changes it, these tests keep passing and the eval fails, which
    is the right way round: this file is about our code.
    """

    def __init__(self, xyxy, class_id, confidence=None, tracker_id=None):
        self.xyxy = np.asarray(xyxy, dtype=float).reshape(-1, 4)
        self.class_id = np.asarray(class_id)
        self.confidence = None if confidence is None else np.asarray(confidence, dtype=float)
        self.tracker_id = tracker_id

    def __len__(self):
        return len(self.xyxy)

    def __getitem__(self, mask):
        mask = np.asarray(mask)
        return FakeDetections(
            self.xyxy[mask],
            self.class_id[mask],
            None if self.confidence is None else self.confidence[mask],
            None if self.tracker_id is None else np.asarray(self.tracker_id)[mask],
        )


class FakeModel:
    """Returns canned detections and records the array it was handed."""

    def __init__(self, detections):
        self.detections = detections
        self.last_image = None
        self.last_threshold = None

    def predict(self, image, threshold=None):
        self.last_image = image
        self.last_threshold = threshold
        return self.detections


class FakeTracker:
    """Assigns the track ids it was configured with, and counts how often it was used."""

    def __init__(self, tracker_ids):
        self.tracker_ids = tracker_ids
        self.calls = 0

    def update_with_detections(self, detections):
        self.calls += 1
        n = len(detections)
        ids = self.tracker_ids
        if ids is not None:
            ids = list(ids)[:n]
        return FakeDetections(detections.xyxy, detections.class_id,
                              detections.confidence, ids)


def make_detector(xyxy, class_id, tracker_ids, confidence=None):
    return RfDetrPersonDetector(
        person_class_id=PERSON_ID,
        model=FakeModel(FakeDetections(xyxy, class_id, confidence)),
        tracker=FakeTracker(tracker_ids),
    )


def frame(height=8, width=6):
    """A BGR frame whose three channels are distinguishable, so a swap is detectable."""
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:, :, 0] = 10   # B
    img[:, :, 1] = 20   # G
    img[:, :, 2] = 30   # R
    return img


# ── COCO class resolution ──────────────────────────────────────────────────────

def test_override_short_circuits_resolution(monkeypatch):
    """An explicit id a human chose must not be second-guessed, or consulted about."""
    monkeypatch.setattr(coco_labels, "_label_map", lambda: {99: "person"})
    assert resolve_coco_class_id("person", override=7) == 7


def test_resolves_by_name_from_the_installed_label_map(monkeypatch):
    monkeypatch.setattr(coco_labels, "_label_map",
                        lambda: {1: "person", 43: "tennis racket"})
    assert resolve_coco_class_id("tennis racket") == 43


def test_resolution_ignores_case_and_whitespace(monkeypatch):
    """The published maps are inconsistent about both, and a miss here is a wrong class."""
    monkeypatch.setattr(coco_labels, "_label_map", lambda: {43: " Tennis Racket "})
    assert resolve_coco_class_id("tennis racket") == 43


def test_missing_name_in_an_available_map_raises(monkeypatch):
    monkeypatch.setattr(coco_labels, "_label_map", lambda: {1: "person"})
    with pytest.raises(LookupError, match="tennis racket"):
        resolve_coco_class_id("tennis racket")


def test_no_label_map_raises_rather_than_guessing(monkeypatch):
    """
    The one behaviour this module must not have is picking a number when it does not know.

    A wrong class id yields a detector that reports detections at a plausible rate, of the
    wrong object, and raises nothing. The error message has to carry the candidates so the
    caller can choose deliberately.
    """
    monkeypatch.setattr(coco_labels, "_label_map", lambda: None)
    with pytest.raises(LookupError) as exc:
        resolve_coco_class_id("tennis racket")
    message = str(exc.value)
    assert "43" in message and "38" in message
    assert "override" in message


def test_the_two_coco_schemes_disagree_so_names_are_the_only_safe_key():
    """
    A guard on the premise of the whole module. If these ever agree, name resolution stops
    being load-bearing — and if they disagree, as they do, a hardcoded int is a coin flip.
    """
    ids = [scheme["tennis racket"] for scheme in KNOWN_SCHEMES.values()]
    assert len(set(ids)) == len(ids), "schemes agreed; re-read coco_labels' premise"


# ── PlayerTracker: the detector seam ───────────────────────────────────────────

def test_player_tracker_delegates_to_the_injected_detector():
    class Detector:
        name = "fake"

        def detect_frame(self, f):
            return {3: [1.0, 2.0, 3.0, 4.0]}

    tracker = PlayerTracker(detector=Detector())
    assert tracker.detect_frame(frame()) == {3: [1.0, 2.0, 3.0, 4.0]}


def test_player_tracker_needs_a_detector_or_a_model_path():
    """
    Constructing with neither used to mean "build YOLO from None", which fails deep inside
    ultralytics. Failing here names both ways out instead.
    """
    with pytest.raises(ValueError, match="model_path"):
        PlayerTracker()


def test_from_config_defaults_to_yolo(monkeypatch):
    """
    Deliberately still the AGPL path. Every measured number in this repo was produced on it,
    so a silent flip would re-baseline all of them at once.
    """
    built = {}

    class FakeYolo:
        name = "yolo"

        def __init__(self, model_path):
            built["model_path"] = model_path

    monkeypatch.setattr("trackers.detector_yolo.YoloPersonDetector", FakeYolo)
    tracker = PlayerTracker.from_config({"models": {"player": "yolov8x"}})
    assert isinstance(tracker.detector, FakeYolo)
    assert built["model_path"] == "yolov8x"


def test_from_config_selects_rfdetr_and_passes_the_size(monkeypatch):
    built = {}

    class FakeRfDetr:
        name = "rfdetr"

        def __init__(self, size):
            built["size"] = size

    monkeypatch.setattr("trackers.detector_rfdetr.RfDetrPersonDetector", FakeRfDetr)
    tracker = PlayerTracker.from_config(
        {"models": {"player_backend": "rfdetr", "player_rfdetr_size": "small"}}
    )
    assert isinstance(tracker.detector, FakeRfDetr)
    assert built["size"] == "small"


def test_from_config_rejects_an_unknown_backend():
    """A typo in config must not fall back to a detector the run then gets attributed to."""
    with pytest.raises(ValueError, match="player_backend"):
        PlayerTracker.from_config({"models": {"player_backend": "yolov9"}})


def test_from_config_backend_name_is_case_insensitive(monkeypatch):
    class FakeYolo:
        name = "yolo"

        def __init__(self, model_path):
            pass

    monkeypatch.setattr("trackers.detector_yolo.YoloPersonDetector", FakeYolo)
    tracker = PlayerTracker.from_config({"models": {"player_backend": "YOLO"}})
    assert isinstance(tracker.detector, FakeYolo)


# ── RF-DETR backend contract ───────────────────────────────────────────────────

def test_rfdetr_returns_track_id_to_bbox():
    detector = make_detector([[0, 0, 10, 20]], [PERSON_ID], [5])
    assert detector.detect_frame(frame()) == {5: [0.0, 0.0, 10.0, 20.0]}


def test_rfdetr_keeps_only_people():
    """
    A tennis racket, a ball and a chair are all detected by a COCO model and none of them is
    a player. Filtering by class is what keeps the racket out of the player list — and the
    racket detector exists precisely because that box is wanted somewhere else.
    """
    detector = make_detector(
        [[0, 0, 10, 20], [50, 50, 60, 60], [80, 80, 90, 95]],
        [PERSON_ID, RACKET_ID, PERSON_ID],
        [1, 2],
    )
    assert set(detector.detect_frame(frame())) == {1, 2}


def test_rfdetr_skips_detections_with_no_track_id():
    """
    ByteTrack returns unconfirmed detections without an id. Player selection scores tracks by
    id across frames, so a detection without one is unusable — dropped, never invented. This
    matches the YOLO backend, where `box.id is None` is skipped for the same reason.
    """
    detector = make_detector([[0, 0, 10, 20], [30, 30, 40, 50]],
                             [PERSON_ID, PERSON_ID], [7, None])
    assert detector.detect_frame(frame()) == {7: [0.0, 0.0, 10.0, 20.0]}


def test_rfdetr_returns_empty_when_the_tracker_assigns_no_ids():
    """
    ByteTrack hands back `tracker_id=None` (not an array of Nones) on a frame where it
    confirmed nothing. Iterating that would raise, so it is checked before the loop.
    """
    detector = make_detector([[0, 0, 10, 20]], [PERSON_ID], None)
    assert detector.detect_frame(frame()) == {}


def test_rfdetr_is_given_rgb_not_bgr():
    """
    OpenCV reads BGR and RF-DETR expects RGB. Feeding it BGR costs accuracy silently rather
    than raising, which is exactly how the permissive backend would end up looking worse than
    the one it replaces for a reason that has nothing to do with the model.
    """
    detector = make_detector([[0, 0, 10, 20]], [PERSON_ID], [1])
    bgr = frame()
    detector.detect_frame(bgr)

    handed = detector.model.last_image
    assert handed[0, 0, 0] == bgr[0, 0, 2], "red channel did not arrive first"
    assert handed[0, 0, 2] == bgr[0, 0, 0], "blue channel did not arrive last"


def test_rfdetr_passes_its_confidence_as_the_threshold():
    detector = RfDetrPersonDetector(
        confidence=0.42,
        person_class_id=PERSON_ID,
        model=FakeModel(FakeDetections([[0, 0, 10, 20]], [PERSON_ID])),
        tracker=FakeTracker([1]),
    )
    detector.detect_frame(frame())
    assert detector.model.last_threshold == 0.42


def test_rfdetr_default_confidence_matches_ultralytics():
    """
    0.25 is ultralytics' predict/track default, i.e. the operating point every published
    number in this repo was measured at. Note this is NOT config's `player_confidence: 0.7`,
    which goes to a size filter (main.py:1488) and never was a detection threshold. Wiring
    0.7 in here would have made the two backends incomparable on their first run.
    """
    from trackers.detector_rfdetr import DEFAULT_CONFIDENCE
    assert DEFAULT_CONFIDENCE == 0.25


def test_rfdetr_reset_discards_tracker_state():
    """
    One instance tracks one clip. ByteTrack holds an id counter and Kalman state, so reusing
    an instance across clips continues the previous clip's ids into the next one.
    """
    detector = make_detector([[0, 0, 10, 20]], [PERSON_ID], [1])
    original = detector.tracker
    detector.reset()
    assert detector._tracker is None
    assert detector.tracker is not original


def test_rfdetr_rejects_an_unknown_model_size():
    """Fails with the list of sizes, rather than an AttributeError from inside the package."""
    from trackers.detector_rfdetr import MODEL_CLASSES, _load_model
    with pytest.raises(ValueError) as exc:
        _load_model("enormous")
    for size in MODEL_CLASSES:
        assert size in str(exc.value)


def test_both_backends_expose_the_same_contract():
    """
    The seam itself. `PlayerTracker` calls exactly `detect_frame`, and `main.py` reads
    `.name` for the log line and the stub key — so a backend missing either is a broken
    attribution, not a crash.
    """
    from trackers.detector_yolo import YoloPersonDetector

    for backend in (YoloPersonDetector, RfDetrPersonDetector):
        assert isinstance(getattr(backend, "name", None), str)
        assert callable(getattr(backend, "detect_frame", None))
        assert callable(getattr(backend, "reset", None))


def test_yolo_backend_does_not_import_ultralytics_at_module_scope():
    """
    The endgame of the licensing work is uninstalling ultralytics. A module-level import would
    make `import trackers` fail at that moment, which would look like a broken build rather
    than the intended final step.
    """
    import trackers.detector_yolo as module

    source = open(module.__file__, encoding="utf-8").read()
    for line in source.splitlines():
        if line.startswith(("import ", "from ")):
            assert "ultralytics" not in line, f"module-scope ultralytics import: {line!r}"
