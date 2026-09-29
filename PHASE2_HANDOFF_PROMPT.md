# Phase 2 handoff — stroke type classification

You are picking up the AI match-video-analysis feature at Phase 2. This document is
the context you need before doing anything.

Read these in order before you start:

1. `AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md` — the phase plan and exit criteria
2. `cv-service/PHASE0_FINDINGS.md` — why Phase 0 is not cleared
3. `cv-service/LICENSING.md` — three blockers, none of them optional
4. `cv-service/UPSTREAM_README.md` §Limitations and §"What did not work" — **the most
   important reading on this page**, explained below
5. `PROGRESS.md` — the phase-boundary log

---

## Read this before you plan anything

**Phase 2 has already been attempted, methodically, and it failed to transfer.**

The vendored upstream built exactly what the implementation plan proposes for Phase 2:
a forehand/backhand classifier trained on pose features from a temporal window around
contact. The methodology was sound — subject-grouped splits, repeated cross-validation.

| | balanced accuracy |
|---|---|
| Hand-crafted geometry rule (the baseline) | 54% |
| Trained pose classifier, on THETIS | **76.3%** |
| Same classifier, on real broadcast images | **53.6%** |

53.6% on a two-class problem is chance. The upstream author's own conclusion:
*"Everything about the training was methodologically sound and it would still have been
a regression in production. Kept, measured, not wired in."*

The weights are in `models/forehand_backhand_classifier.json`. The training script is
`eval/train_forehand_backhand.py`. The evaluation is `eval/forehand_backhand_on_thetis.py`.
It is all there, it all works, and it is deliberately not wired into the pipeline.

**Do not start by rebuilding this.** If your plan's first move is "train a pose
classifier on a temporal window", you are repeating a measured failure.

### Why it fails, which is the useful part

The signal that separates forehand from backhand is **where the racket is**. Pose-based
approaches lose that signal in one of two ways:

- **MediaPipe drops the racket arm on 44-58% of backhands.** It declines to guess when
  the arm is occluded, which is exactly when it matters.
- **SAM 3D Body recovers the arm and makes things worse.** It took coverage from 171 to
  200 clips and class balance from 55/45 to 100/100, and balanced accuracy fell from
  85.5% to 66.4% on *identical clips*. Isolating features shows why: wrist-side accuracy
  collapsed from 78.6% to 51.8% (chance) while motion features held. It infers the
  occluded arm from a body prior — anatomically plausible, and still a guess about where
  the racket is. The landmark mapping was verified against MediaPipe to within 1-3 px, so
  it is not an integration bug.

Upstream's conclusion is worth carrying: *"MediaPipe's refusal was a quality filter, not
only a loss. A model that always answers is not better than one that knows when to stay
quiet."*

### What has not been tried

**Racket detection.** The implementation plan lists it and nobody has built it. It
attacks the actual root cause: rather than inferring the racket's position from the body,
detect the racket directly and use its position and orientation at contact. This is the
one genuinely open avenue, and it is where Phase 2 effort should go first.

---

## Current state — and the gate you are behind

### Phase 0 is NOT cleared. This matters more than anything below.

Phase 0's job was to prove the CV foundation works on Drift's real camera domain. Its
exit criterion was: court detection passes the validity gate on ≥50% of sample clips.

**Result on the first batch of real footage: 0 of 10 passed.**

That result is confounded — the clips were WhatsApp-compressed to 480×864 portrait, which
is a filming and transfer problem, not evidence about the models. A re-shoot was pending
as of 2026-09-29 (landscape, static camera, original-quality transfer, best-marked court).
**Check whether those clips exist and have been scored before you assume anything.**

But one finding is independent of capture quality and bears directly on Phase 2:

> The courts in the first batch have their line markings worn away or absent. The
> worst-scoring clip is bare clay with no visible lines at all.

Every real-world measurement — speed, distance, court placement — is derived from a
homography fitted to painted court lines. Stroke type is the one Phase 2 output that does
**not** depend on the court fit, which is worth knowing: Phase 2 can proceed on clips
where Phase 1's measurements cannot.

### What exists and works

Phase 1 is complete except for model fine-tuning. Verified end to end on 2026-09-29:

| Piece | Where | State |
|---|---|---|
| Vendored pipeline | `cv-service/` | Tennis-Vision v2.1.1, MIT, runs clean |
| Pre-upload precheck | `cv-service/utils/precheck.py` | 74 ms header reject, ~1.6 s full |
| HTTP service | `cv-service/api.py` | `/health`, `/precheck`, `/analyze` |
| Upload + storage + job | `backend/src/video-analysis/`, `backend/src/storage/` | Local-disk driver; S3 slots in |
| Analysis queue | BullMQ, `video-analysis.processor.ts` | One at a time, matching one GPU |
| Mobile upload + results | `mobile/lib/features/video_analysis/` | Settings → Labs → "Analyse a clip" |

A real analysis returns in ~38 s for 60 frames on an RTX 4060. Tests: 722 backend, 597
mobile, 454 cv-service, all passing as of handoff.

### Branches

- `feat/cv-service-phase0` — all of the above, 7 commits, not yet merged
- `ci/website-job` — unrelated CI fix, 1 commit

Both sit on current `master`. Neither has a PR yet.

---

## Licensing — read `cv-service/LICENSING.md` before training anything

Three blockers for any public launch. They bear on Phase 2 directly because Phase 2
produces new model weights.

| Component | Terms | Note |
|---|---|---|
| `ultralytics` / YOLOv8x | **AGPL-3.0** | Covers models you train with it, "regardless of whether you train from scratch". Only AGPL dependency in the stack. |
| `tracknet.pt` | **No licence at all** | Default copyright: all rights reserved. |
| Court keypoints model | **Research use only** | Derived from an unlicensed model trained on YouTube-scraped images. |
| SAM 3D Body | **Meta SAM License, gated** | Relevant if you revisit pose. Off by default. |

**The trap for Phase 2:** if you fine-tune anything with `ultralytics`, the resulting
weights are AGPL. A racket detector trained that way cannot ship in a proprietary service
without an Enterprise licence. Use a permissively licensed detector instead — **RF-DETR
(Apache-2.0)** is the recommended replacement and pairs with `supervision` (MIT), which
is already a dependency and already ships ByteTrack.

---

## The thing that unblocks three problems at once

Phase 2 needs labelled Drift footage. So does the Phase 0 domain-transfer problem. So
does the licensing problem, because retraining on our own data is the only way to get
weights that are ours.

> **Labelling a corpus of real Drift footage is the shared critical path.** It is not a
> Phase 2 chore. It resolves stroke-type training data, the court/ball domain gap, and
> two of the three weight-licensing blockers.

Tooling already exists and you should use it rather than build another:

- `cv-service/tools/label_shots.py` — the labelling tool
- `cv-service/tools/LABELLING_GUIDE.md` — how to label consistently
- `cv-service/datasets/labels/` — where labels live (tracked; the video is not)
- `cv-service/tools/frame_strip.py` — contact sheets for reviewing a gap by eye

Note `label_shots.py` needs GUI OpenCV. If it fails with *"namedWindow ... not
implemented"*, `roboflow` has pulled in `opencv-python-headless` over the GUI build —
`cv-service/requirements.txt` documents the fix.

---

## Suggested first moves

1. **Establish whether Phase 0 cleared.** Look for re-filmed clips; run
   `tennis-vision precheck <clip>` over them and score the gate. If they still fail on a
   well-marked court filmed properly, that is a genuine no-go signal and Phase 2's
   priority should be reconsidered with the user before you build anything.
2. **Read the prior art properly** — `UPSTREAM_README.md` §Limitations, and run
   `eval/forehand_backhand_on_thetis.py` to see the numbers reproduce.
3. **Prototype racket detection** with a permissively licensed detector, since it is the
   untried path at the actual root cause.
4. **Start the labelling corpus** as soon as there is usable footage.
5. **Set the accuracy bar before training anything**, on held-out *Drift* footage, not
   THETIS. THETIS numbers have already proven not to transfer; a bar set against them
   would pass a classifier that is at chance in production.

## Conventions worth knowing

- `PROGRESS.md` is updated at **every phase boundary**, not at session end.
- Get a written plan approved before multi-file edits.
- Build the whole feature, then test in one pass — not build-test-build-test.
- `cv-service/DRIFT_CHANGES.md` logs every Drift change on top of the vendored upstream.
- `cv-service/README.md` claims a test count that `tests/test_packaging.py` asserts
  against the real collection. Add tests, update the number.
- The backend cannot use ESM-only npm packages — ts-jest cannot load them, and it breaks
  every e2e spec that imports `AppModule`. `@nestjs/bullmq` is pinned to 11.0.5 for this.
- The house style in `cv-service/` is heavy docstrings that state the *evidence* behind a
  threshold. If you add a calibrated constant, document what calibrated it, and say
  plainly when something is provisional.

## What not to do

- Do not ship a stroke-type label that has not cleared an explicit, pre-set bar on
  held-out Drift footage. The plan is unambiguous: below the bar, it stays unlabelled.
  An unreliable label shown with confidence is worse than no label.
- Do not rebuild the pose classifier without a reason that addresses why the existing one
  scores 53.6% on real footage.
- Do not fine-tune with `ultralytics` unless the Enterprise licence has been bought.
- Do not treat a THETIS score as evidence about Drift footage.
