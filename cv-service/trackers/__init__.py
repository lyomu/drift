from .player_tracker import PlayerTracker
from .ball_tracker import BallTracker
from .tracknet_ball_tracker import TrackNetBallTracker

# Detection backends. Both are importable without their heavy dependency installed:
# `detector_rfdetr` imports `rfdetr` and `supervision` only when a model is actually built,
# so a machine that has not installed the permissive replacement yet still starts.
from .detector_yolo import YoloPersonDetector
from .detector_rfdetr import RfDetrPersonDetector

# Eval-only, not part of the pipeline. See the module docstring for why it is not wired in.
from .racket_detector import RacketDetector, racket_for_player

__all__ = [
    "PlayerTracker",
    "BallTracker",
    "TrackNetBallTracker",
    "YoloPersonDetector",
    "RfDetrPersonDetector",
    "RacketDetector",
    "racket_for_player",
]
