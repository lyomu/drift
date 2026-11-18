"""
tools/pose_fixtures.py
──────────────────────
Turn a clip into a Swing Check pose fixture: the same 13 joints the app's native bridge
returns (ML Kit on Android, Apple Vision on iOS), per frame, in upright-image pixels with
a 0..1 likelihood. The Dart side replays these through SwingAnalyzer
(mobile/test/features/swing_check/real_clips_calibration_test.dart).

Model: MediaPipe Pose Landmarker *full* (Apache-2.0), the same BlazePose family as
ML Kit's accurate pose model. Visibility is used as the likelihood, the closest match to
ML Kit's inFrameLikelihood.

Phone emulation: frames are sampled at --fps (default 15, the spec's target processing
rate) and frames with no person are dropped, exactly like the app's pose source.

The output holds landmarks only, no pixels, so it is anonymous and small enough to
commit as a test fixture.

    python tools/pose_fixtures.py data/real_clips/R04.mp4 \
        -o ../mobile/test/features/swing_check/fixtures/real/R04.json
    python tools/pose_fixtures.py data/real_clips --out-dir ../mobile/test/features/swing_check/fixtures/real
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

ROOT = Path(__file__).resolve().parent.parent
MODEL = ROOT / "models" / "pose_landmarker_full.task"

# Same order as the Dart PoseJoint enum; values are MediaPipe's 33-landmark indices.
JOINTS = [
    ("nose", 0),
    ("leftShoulder", 11), ("rightShoulder", 12),
    ("leftElbow", 13), ("rightElbow", 14),
    ("leftWrist", 15), ("rightWrist", 16),
    ("leftHip", 23), ("rightHip", 24),
    ("leftKnee", 25), ("rightKnee", 26),
    ("leftAnkle", 27), ("rightAnkle", 28),
]


def extract(clip: Path, fps: float) -> dict:
    cap = cv2.VideoCapture(str(clip))
    if not cap.isOpened():
        raise RuntimeError(f"cannot open {clip}")
    src_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    step = max(1, round(src_fps / fps))

    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(MODEL)),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    frames, sampled, idx = [], 0, 0
    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            if idx % step == 0:
                sampled += 1
                t_ms = int(round(idx * 1000 / src_fps))
                rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = landmarker.detect_for_video(image, t_ms)
                if result.pose_landmarks:
                    lm = result.pose_landmarks[0]
                    frames.append({
                        "t": t_ms,
                        "p": [[round(lm[i].x * w, 1), round(lm[i].y * h, 1),
                               round(float(lm[i].visibility or 0.0), 2)]
                              for _, i in JOINTS],
                    })
            idx += 1
    cap.release()
    return {
        "clip": clip.stem,
        "source": "mediapipe-pose-landmarker-full",
        "width": w,
        "height": h,
        "sampleFps": round(src_fps / step, 2),
        "framesSampled": sampled,
        "joints": [name for name, _ in JOINTS],
        "frames": frames,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("input", help="a clip, or a folder of .mp4 clips")
    ap.add_argument("-o", "--output", help="output JSON (single clip)")
    ap.add_argument("--out-dir", help="output folder (folder input)")
    ap.add_argument("--fps", type=float, default=15.0)
    args = ap.parse_args()

    src = Path(args.input)
    clips = sorted(src.glob("*.mp4")) if src.is_dir() else [src]
    for clip in clips:
        out = Path(args.output) if args.output else Path(args.out_dir) / f"{clip.stem}.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        data = extract(clip, args.fps)
        out.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        print(f"{clip.stem}: {len(data['frames'])}/{data['framesSampled']} frames with a pose "
              f"-> {out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
