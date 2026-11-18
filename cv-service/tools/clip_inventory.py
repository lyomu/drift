"""
tools/clip_inventory.py
───────────────────────
Technical inventory of a folder of clips: resolution, orientation, fps, duration, codec,
bitrate, and whether the clip looks messaging-app compressed (480-576 px on the short
side is the tell for WhatsApp / TikTok re-encodes).

Metadata only, via ffprobe. It never decodes frames, so it is safe to run on any folder.
The camera angle, court marking and strokes are judged by eye and added to the report
by hand (docs/ml/real-clips-inventory.md).

    python tools/clip_inventory.py data/real_clips            # markdown table
    python tools/clip_inventory.py data/real_clips --json     # machine-readable
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}
COMPRESSED_SHORT_SIDE = 600  # WhatsApp sends at 480 px, TikTok saves at 576 px


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries",
         "stream=codec_name,width,height,r_frame_rate,bit_rate:"
         "stream_side_data=rotation:format=duration,bit_rate",
         "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    data = json.loads(out.stdout)
    s = data["streams"][0]
    rotation = 0
    for sd in s.get("side_data_list", []) or []:
        if "rotation" in sd:
            rotation = int(sd["rotation"])
    w, h = int(s["width"]), int(s["height"])
    if abs(rotation) in (90, 270):
        w, h = h, w
    fps = float(Fraction(s["r_frame_rate"]))
    bitrate = s.get("bit_rate") or data["format"].get("bit_rate")
    short = min(w, h)
    return {
        "clip": path.stem,
        "width": w,
        "height": h,
        "orientation": "portrait" if h > w else "landscape",
        "fps": round(fps, 2),
        "duration_s": round(float(data["format"]["duration"]), 1),
        "codec": s["codec_name"],
        "bitrate_kbps": round(int(bitrate) / 1000) if bitrate else None,
        "compressed": short <= COMPRESSED_SHORT_SIDE,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("folder")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    clips = sorted(p for p in Path(args.folder).iterdir() if p.suffix.lower() in VIDEO_EXT)
    if not clips:
        print(f"no video files in {args.folder}", file=sys.stderr)
        return 1
    rows = [probe(p) for p in clips]

    if args.json:
        print(json.dumps(rows, indent=2))
        return 0

    print("| Clip | Resolution | Orientation | fps | Duration | Codec | Bitrate | Compressed |")
    print("|---|---|---|---|---|---|---|---|")
    for r in rows:
        print(f"| {r['clip']} | {r['width']}x{r['height']} | {r['orientation']} | {r['fps']:g} "
              f"| {r['duration_s']} s | {r['codec']} | {r['bitrate_kbps']} kbps "
              f"| {'yes' if r['compressed'] else 'no'} |")
    total = sum(r["duration_s"] for r in rows)
    print(f"\n{len(rows)} clips, {total:.0f} s total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
