"""
cli.py
──────
Console entry point for the `tennis-vision` command.

Subcommands are thin wrappers over the existing modules rather than reimplementations,
so there is exactly one code path per capability and the CLI cannot drift from what
`python main.py` does.

    tennis-vision analyze clip.mp4 -o output/run.avi
    tennis-vision session practice.mp4 --dry-run
    tennis-vision precheck clip.mp4
    tennis-vision download-models
    tennis-vision version
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

__version__ = "2.1.1"


def _cmd_analyze(argv: list[str]) -> int:
    """Run the full pipeline on one video."""
    parser = argparse.ArgumentParser(
        prog="tennis-vision analyze",
        description="Analyse a tennis video: ball, players, court, shots and stats.",
    )
    parser.add_argument("input", help="path to the input video")
    parser.add_argument("-o", "--output", default=None,
                        help="annotated output video path (default: from config)")
    parser.add_argument("-c", "--config", default="configs/config.yaml",
                        help="config YAML (use configs/dev.yaml to enable caching)")
    parser.add_argument("--no-stubs", action="store_true",
                        help="force fresh detection, ignoring any cached stubs")
    parser.add_argument("--max-frames", type=int, default=0, metavar="N",
                        help="process only the first N frames (0 = all) - quick check "
                             "on a long video before a full run")
    parser.add_argument("--fast", action="store_true",
                        help="single-frame court keypoints; faster, less camera-robust")
    parser.add_argument("--debug", action="store_true", help="verbose logging")
    args = parser.parse_args(argv)

    if not Path(args.input).exists():
        print(f"error: input video not found: {args.input}", file=sys.stderr)
        return 2

    # main.main() reads sys.argv, so hand it the flags it expects rather than
    # duplicating the pipeline here.
    forwarded = ["main.py", "--input", args.input, "--config", args.config]
    if args.output:
        forwarded += ["--output", args.output]
    if args.max_frames:
        forwarded += ["--max-frames", str(args.max_frames)]
    if args.no_stubs:
        forwarded.append("--no-stubs")
    if args.fast:
        forwarded.append("--fast")
    if args.debug:
        forwarded.append("--debug")

    import main as pipeline

    original_argv = sys.argv
    try:
        sys.argv = forwarded
        pipeline.main()
    finally:
        sys.argv = original_argv
    return 0


def _cmd_session(argv: list[str]) -> int:
    """
    Find the rallies in a long clip and analyse each one.

    Delegates to `session.py` rather than reimplementing its argument parsing, so the
    subcommand and `python session.py` cannot drift — the same rule the other subcommands
    follow.
    """
    import session

    return session.main(argv)


def _cmd_precheck(argv: list[str]) -> int:
    """Judge whether a clip is worth analysing, without analysing it."""
    parser = argparse.ArgumentParser(
        prog="tennis-vision precheck",
        description="Check a clip is usable before spending a full analysis on it.",
    )
    parser.add_argument("input", help="path to the video to check")
    parser.add_argument("-c", "--config", default="configs/config.yaml",
                        help="config YAML the court model path is read from")
    parser.add_argument("--quick", action="store_true",
                        help="header checks only - skips loading the court model, so it "
                             "cannot tell whether the court itself is detectable")
    parser.add_argument("--samples", type=int, default=12, metavar="N",
                        help="frames to sample for the court and camera checks")
    parser.add_argument("--json", action="store_true",
                        help="emit the result as JSON for another program to consume")
    args = parser.parse_args(argv)

    if not Path(args.input).exists():
        print(f"error: input video not found: {args.input}", file=sys.stderr)
        return 2

    # Resolved only when it will actually be used: reading the config imports the
    # pipeline, and --quick exists precisely to avoid paying for that.
    court_model = None
    if not args.quick:
        import main as pipeline

        court_model = pipeline.load_config(args.config)["models"]["court"]
        if not Path(court_model).exists():
            print(f"warning: court model not found at {court_model} - falling back to "
                  f"header checks only. Run 'tennis-vision download-models' for the "
                  f"full check.", file=sys.stderr)
            court_model = None

    from utils.precheck import REJECT, WARN, precheck as run_precheck

    result = run_precheck(args.input, court_model_path=court_model,
                          sample_count=args.samples)

    if args.json:
        import json

        print(json.dumps(result.as_dict(), indent=2))
    else:
        meta = result.metadata
        print()
        print(f"  {Path(args.input).name}")
        if meta["readable"]:
            # ASCII separator deliberately: the Windows console this runs on is not
            # reliably UTF-8, and a middot here renders as a replacement character.
            print(f"  {meta['width']}x{meta['height']}  |  {meta['fps']:.1f} fps  |  "
                  f"{meta['duration_s']:.1f}s")
        print()
        print(f"  VERDICT: {result.verdict.upper()}")
        if not result.court_checked:
            print("  (the court itself was NOT checked - this verdict cannot tell you "
                  "whether the court is detectable)")
        print()

        marks = {"pass": "ok  ", "warn": "warn", "reject": "STOP"}
        for f in result.findings:
            print(f"  [{marks[f.severity]}] {f.check}")
            print(f"           {f.message}")
        print()

    # Exit status is for scripting: a clip that can still be analysed, even with
    # caveats, is a success; only a refusal is a failure.
    return 1 if result.verdict == REJECT else 0


def _cmd_download_models(argv: list[str]) -> int:
    """Fetch model weights into models/."""
    argparse.ArgumentParser(
        prog="tennis-vision download-models",
        description="Download the model weights the pipeline needs.",
    ).parse_args(argv)

    sys.path.insert(0, str(Path(__file__).resolve().parent / "scripts"))
    import download_models

    return download_models.main()


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="tennis-vision",
        description="Measured, reproducible tennis video analysis from a single camera.",
        epilog="Run 'tennis-vision <command> --help' for command-specific options.",
    )
    parser.add_argument("command", nargs="?", default="help",
                        choices=["analyze", "session", "precheck", "download-models",
                                 "version", "help"],
                        help="what to do")
    args, rest = parser.parse_known_args()

    if args.command == "analyze":
        return _cmd_analyze(rest)
    if args.command == "session":
        return _cmd_session(rest)
    if args.command == "precheck":
        return _cmd_precheck(rest)
    if args.command == "download-models":
        return _cmd_download_models(rest)
    if args.command == "version":
        print(f"tennis-vision {__version__}")
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
