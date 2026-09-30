"""
trackers/coco_labels.py
───────────────────────
Resolve a COCO class id by NAME, rather than hardcoding an integer.

Why this module exists at all
----------------------------
COCO ships two incompatible numbering schemes for the same 80 categories, and detector
packages disagree about which one they emit:

| scheme | `person` | `tennis racket` | used by |
|---|---|---|---|
| 91 "category ids" (the original annotations, with gaps) | 1 | 43 | COCO JSON, several DETR ports |
| 80 contiguous indices (gaps removed) | 0 | 38 | ultralytics, torchvision |

A hardcoded `43` is therefore right in one package and silently wrong in the other — and
wrong in the worst possible way, because id 38 in the 91-scheme is `kite` and id 43 in the
80-scheme is `knife`. Neither raises. Both would produce a "racket detector" that reports
detections, at a plausible rate, of the wrong object.

So this resolves by name against whatever label map the installed package actually exposes.
That is correct under either scheme without having to know which one is in play.

When it cannot resolve
----------------------
It raises, and says which candidates it would have guessed between. Guessing is the one
thing this module must not do: a wrong-but-working class id is indistinguishable from a
working detector until someone looks at the boxes by eye, which is exactly the class of
error this project's negative results are full of.
"""
from __future__ import annotations

# Fallbacks, stated so the error message can be specific. NOT used for detection —
# they exist so a failure can tell the caller what to check.
KNOWN_SCHEMES = {
    "coco-91-category-ids": {"person": 1, "tennis racket": 43},
    "coco-80-contiguous": {"person": 0, "tennis racket": 38},
}


# Where `rfdetr` has kept its COCO map, newest location first. It moved: `rfdetr.util` was
# REMOVED in v1.9.0 (the package installs an import hook that raises a migration hint rather
# than a bare ModuleNotFoundError), and the map did not move to `rfdetr.utilities` with the
# rest of `util` — it lives under `assets`. Both are tried so this works either side of that
# release rather than pinning us to one.
_LABEL_MAP_MODULES = (
    "rfdetr.assets.coco_classes",   # v1.9.0+, verified on 1.11.0
    "rfdetr.util.coco_classes",     # pre-v1.9.0
)


def _label_map() -> dict[int, str] | None:
    """
    The installed detector's own id → name mapping, or None if it exposes none.

    Imports are local and optional because this module is imported by tests that have no
    detector installed, and because the YOLO backend does not need it (ultralytics carries
    names on the result object instead).

    **Measured on rfdetr 1.11.0:** the map is a dict of 80 entries keyed by 91-scheme COCO
    category ids — `{1: 'person', ..., 43: 'tennis racket'}`. Note what that combination
    means: 80 classes, but NOT the 80-contiguous numbering. Anyone who had reasoned "80
    entries, so index 38 is the racket" would have been reading `kite`. This is exactly the
    confusion the module exists to make impossible, and it is real rather than theoretical.
    """
    import importlib

    COCO_CLASSES = None
    for module_name in _LABEL_MAP_MODULES:
        try:
            COCO_CLASSES = importlib.import_module(module_name).COCO_CLASSES
            break
        except Exception:
            continue
    if COCO_CLASSES is None:
        return None

    if isinstance(COCO_CLASSES, dict):
        return {int(cid): str(name) for cid, name in COCO_CLASSES.items()}
    try:
        return {int(i): str(name) for i, name in enumerate(COCO_CLASSES)}
    except TypeError:
        return None


def resolve_coco_class_id(name: str, *, override: int | None = None) -> int:
    """
    The class id the installed detector uses for `name`.

    Args:
        name: COCO category name, e.g. "person" or "tennis racket". Matched
              case-insensitively and with surrounding whitespace ignored, because the
              published maps are inconsistent about both.
        override: skip resolution and return this. For the case where the installed
              package exposes no map but its scheme is known from its documentation —
              an explicit number a human chose, which is a different thing from this
              module picking one.

    Raises:
        LookupError: no map available, or the name is not in it. The message names the
              candidate ids under both schemes so the caller can pass `override`.
    """
    if override is not None:
        return int(override)

    wanted = name.strip().lower()
    mapping = _label_map()

    if mapping:
        for cid, cname in mapping.items():
            if str(cname).strip().lower() == wanted:
                return cid
        raise LookupError(
            f"{name!r} is not in the installed detector's COCO label map "
            f"({len(mapping)} entries). Pass override= with the correct id."
        )

    candidates = {
        scheme: ids[wanted] for scheme, ids in KNOWN_SCHEMES.items() if wanted in ids
    }
    raise LookupError(
        "No COCO label map available from the installed detector "
        "(rfdetr.util.coco_classes could not be imported). "
        f"Candidates for {name!r}: {candidates or 'unknown'}. "
        "Pass override= with the id the detector actually emits — do not assume, the "
        "two COCO schemes disagree and neither raises when confused."
    )
