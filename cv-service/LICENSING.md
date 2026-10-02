# Licensing — what blocks a commercial launch

2026-09-29. Engineering assessment, not legal advice. Everything here needs a lawyer's
eye before launch; the point of this document is to say precisely what to ask them about
and to cost the alternatives.

Companion to `../AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md`. The code is MIT and that part
is genuinely fine. The problems are the model weights and one dependency.

## Summary

| Component | Terms | Verdict |
|---|---|---|
| Tennis-Vision code | MIT | OK |
| `ultralytics` / YOLOv8x — player detection | **AGPL-3.0** | **Blocker** |
| `tracknet.pt` — ball detection | **No licence at all** | **Blocker** |
| Court keypoints model | **Research use only** | **Blocker** |
| MediaPipe pose landmarker | Apache-2.0 | OK |
| `supervision`, `lapx`, `gdown` | MIT | OK |
| `opencv-python`, `mediapipe`, `huggingface-hub` | Apache-2.0 | OK |
| `torch`, `pandas`, `scipy` | BSD / Apache-2.0 | OK |

**`ultralytics` is the only AGPL dependency in the entire stack.** Everything else that
is not a model weight is permissively licensed. That is better news than it looks: the
dependency problem is one package, not a tangle.

## 1. `ultralytics` / YOLOv8x — AGPL-3.0

### What it actually requires

Ultralytics' own licensing page is explicit on two points that matter here:

- AGPL-3.0 covers **trained models**, "regardless of whether you train from scratch or
  use pretrained weights". Fine-tuning YOLOv8 on Drift footage in Phase 1 would produce
  AGPL weights, not proprietary ones.
- An Enterprise licence is named as required for "SaaS platforms, APIs, or cloud systems
  that use YOLO behind the scenes".

Drift's architecture is exactly that: users upload video, a backend calls a CV service,
results come back. Under AGPL-3.0 section 13, serving that over a network obliges us to
offer the complete corresponding source of the whole application to its users. That is
the blocker — not distribution of a binary, but running it as a service at all.

A caveat on scope: purely internal use with no network service does not trigger section
13 under the licence itself, whatever the vendor's marketing page prefers. Today's
evaluation use is fine. Launch is not.

### Option A — replace it (recommended)

The usage surface is small. All of it:

| File | Use | Notes |
|---|---|---|
| `trackers/player_tracker.py` | `YOLO(...)`, `.track()` | The real dependency |
| `trackers/ball_tracker.py` | `YOLO(...)`, `.predict()` | Fallback only — `use_tracknet: true` is the default |
| `yolo_inference.py` | demo script | Not part of the pipeline |

So one model plus one tracker call. Replacements, both permissive:

- **Detection — RF-DETR (Apache-2.0, Roboflow).** Real-time transformer detector, first
  real-time model past 60 mAP on COCO, explicitly designed for fine-tuning. Commercial
  use with no source obligation and no fee.
- **Tracking — `supervision.ByteTrack` (MIT).** `supervision` is *already a dependency*
  and already ships ByteTrack, so the tracking half costs nothing but wiring.

The current pipeline gets detection and tracking in one `.track()` call; splitting them
into detector plus tracker is the bulk of the work. Player-selection logic downstream
consumes boxes and track ids and should not care where they came from.

### Option B — buy the Enterprise licence

No public pricing: "tailored to each organization's size and specific use case", quote
on request, response promised within 24 hours. Worth requesting a quote in parallel with
Option A, because it is a single form and it bounds the decision. Note it is a recurring
commercial relationship rather than a one-off unblock.

**Recommendation: pursue Option A, request a quote for B as insurance.** A is a bounded
engineering task against one file; B is an unbounded and permanent cost.

## 2. `tracknet.pt` — ball detection

Worse than the README currently says.

`yastrebksv/TrackNet` has **no LICENSE file and no stated terms at all**. Absent a
licence, default copyright applies: all rights reserved. There is no grant to use, copy
or redistribute those weights — "research use only" overstates the permission we have,
because no permission was given. The repository also describes itself as an *unofficial*
implementation, so there is plausibly a further upstream rights holder in the original
TrackNet paper.

### Options

- **WASB (`nttcom/WASB-SBDT`, MIT).** BMVC 2023, from NTT, explicitly supports tennis,
  and benchmarks well. The *code* is MIT. The weights ship via Google Drive with no terms
  stated on the model-zoo page, and the tennis training set is not identified there — so
  this needs verifying before it counts as a fix, since that ambiguity is precisely what
  went wrong with TrackNet. **Action: confirm the weights' terms and the tennis dataset's
  provenance directly with the authors.**
- **Retrain on our own labelled footage.** A published architecture can be reimplemented;
  what is encumbered is someone else's weights and dataset. This is the durable answer.

## 3. Court keypoints model

Declared **research-use-only** on Hugging Face, and the provenance chain is the real
problem:

```
Coddieharsh/tennis-court-keypoints   research use only
  └── fine-tuned from yastrebksv/TennisCourtDetector      no licence stated
        └── trained on 8,841 images built from YouTube highlights   third-party footage
```

Each link is weaker than the one above it. The model card itself says the derivative is
"published on the same terms — research use only — and should not be assumed to carry any
broader grant". The dataset being assembled from YouTube highlights raises a rights
question about the training data independent of the weights.

Only real option: **retrain on our own labelled footage.**

## The convergence worth noticing

The licensing fix and the Phase 0 technical fix are the same piece of work.

`PHASE0_FINDINGS.md` found that the court model may not transfer to Drift's courts at all
— worn or absent line markings, on which every real-world measurement depends. The
remedy under discussion there was already to label our own footage and retrain.

That is also the remedy here for both encumbered weights. So:

> Labelling a corpus of Drift footage and retraining the court and ball models on it
> resolves the two weight-licensing blockers **and** the domain-transfer risk at once.

It does not resolve `ultralytics`, which is a dependency rather than a weight, and is
handled separately by Option A above.

This raises the value of the labelling work considerably — it is not a Phase 2 nicety, it
is the shared critical path — and it argues for starting the corpus as soon as there is
usable footage, rather than after a Phase 0 go/no-go.

## Recommended sequence

1. **Request an Ultralytics Enterprise quote.** One form, bounds the decision, costs
   nothing to start.
2. **Ask the WASB authors** to confirm the weights' licence and the tennis dataset's
   provenance. One email, and it decides whether ball detection has a shortcut.
3. **Prototype RF-DETR + `supervision.ByteTrack`** in `player_tracker.py` behind the
   existing config, so both paths can be compared on the same clips.
4. **Start the labelling corpus** once properly captured footage exists — it is the
   shared answer to the weights licensing and the domain-transfer risk.
5. **Legal review** before launch, not before prototyping. The questions to put to them:
   AGPL-3.0 section 13 exposure for our service topology; whether weights trained on
   scraped YouTube footage carry any usable grant; and what diligence is expected on a
   dependency with no stated licence.

Nothing here blocks continued internal evaluation. All of it blocks a public launch.
