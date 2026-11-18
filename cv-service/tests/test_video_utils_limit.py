from unittest.mock import Mock

from utils import video_utils


def test_read_video_stops_decoding_at_frame_limit(monkeypatch):
    capture = Mock()
    capture.read.side_effect = [(True, i) for i in range(4)]
    monkeypatch.setattr(video_utils.cv2, "VideoCapture", lambda _path: capture)

    assert video_utils.read_video("clip.mp4", max_frames=3) == [0, 1, 2]
    assert capture.read.call_count == 3
    capture.release.assert_called_once()
