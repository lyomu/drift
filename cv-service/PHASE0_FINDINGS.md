# Phase 0 — first run against real Drift-domain footage

2026-09-29. Companion to `../AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md` (Phase 0).

## Result

**0 of 10 clips passed the court-validity gate.** The exit criterion was ≥50%.

Run as `tennis-vision analyze <clip> --max-frames 150 --fast` against 10 clips supplied
by the user (WhatsApp transfer, 480×864 portrait, ~29.6 fps). One further file was a
0-byte failed transfer and was skipped.

| # | Clip | Ball detected | Court line support | Gate (≥0.22) |
|---|---|---|---|---|
| 1 | 16.26.04 | 37/150 (24.7%) | 0.140 | FAIL |
| 2 | 16.28.37 | 11/150 (7.3%) | 0.038 | FAIL |
| 3 | 16.29.25 | 8/150 (5.3%) | 0.136 | FAIL |
| 4 | 16.30.00 | 0/150 (0%) | 0.078 | FAIL (crashed, see below) |
| 5 | 16.30.59 | 16/150 (10.7%) | 0.022 | FAIL |
| 6 | 16.33.44 | 16/150 (10.7%) | 0.209 | FAIL |
| 7 | 16.46.52 | 23/150 (15.3%) | 0.196 | FAIL |
| 8 | vcyv 16.46.51 | 15/150 (10.0%) | 0.178 | FAIL |
| 9 | huvub9 16.46.52 | 7/150 (4.7%) | 0.207 | FAIL |
| 10 | hgyh 16.33.44 | 2/150 (1.3%) | 0.173 | FAIL |

Player selection failed on **all 10** — the pipeline never found two players on opposite
sides of the net, so shot counts and per-player stats were refused on every clip too.

## Why — from inspecting actual frames

Ranked by how much they matter, and crucially by whether re-filming can fix them.

### Not fixable by better filming

1. **The courts' line markings are worn away or absent.** Clip 2 (support 0.038, the
   worst score) is a bare red-clay court with essentially no visible painted lines at
   all. Clips 6/7 are a cracked hard court with faint, patchy lines. Every court-detection
   model — including the geo-augmented one vendored here — locks onto painted white lines
   to fit the homography. On an unmarked court there is nothing to lock onto, and no
   amount of resolution or framing changes that.
2. **Players on the same side of the net.** Several clips show warm-up/practice with both
   people on one side, which the singles "one player per side" assumption rejects outright.

### Fixable by re-filming — these confound the result

3. **Portrait framing wastes ~60-70% of the pixels.** Sky and trees fill the top third,
   empty foreground court fills the bottom half. The actual band of play occupies roughly
   a third of frame height.
4. **WhatsApp compression to 480px wide.** Compounds (3): after discarding sky and
   foreground, the court band is only ~480×250 effective pixels, so a tennis ball is 1-3
   px across. This is the direct cause of the 0-25% ball detection rates.
5. **Ground-level camera.** Severe foreshortening of the far court; the models were built
   and measured on elevated broadcast-style angles.
6. **Heavy dappled tree shadow** across the playing surface, breaking up what little line
   contrast exists.

## Verdict

**Not yet a defensible go/no-go.** The experiment is confounded: causes 3-6 are filming
and transfer artefacts, not evidence about the models. Re-running on properly captured
footage is the decisive test and is cheap to do.

But cause 1 is a genuine product signal, independent of filming: if Drift's users play on
courts with worn or absent markings, a homography-from-painted-lines approach cannot
produce measurements there, and no fine-tuning fixes a court with no lines. Several clips
scored 0.196-0.209 against a 0.22 threshold, i.e. near misses, which suggests properly
captured footage of a *well-marked* court may well clear the bar.

## Next test — isolate the one variable that matters

Re-film 3-5 clips, changing only the capture:

- **Landscape**, not portrait.
- **Static camera** — propped or tripod, not handheld, no panning.
- **Elevated if possible** — fence-top height beats ground level.
- **Transfer at original quality** — USB, Google Drive or WhatsApp "Document" mode, *not*
  a normal WhatsApp video send, which downscales to 480px.
- **On the best-marked court available**, and with players on opposite sides of the net.

If a well-marked court, properly filmed, still fails the gate → strong no-go, or Phase 1
fine-tuning scope grows substantially. If it passes → the constraint is court quality, and
the product question becomes which courts Drift can support, which is answerable with a
pre-upload check rather than more CV work.

## Incidental bug

Clip 4 crashed rather than exiting cleanly:
`ValueError: cannot convert float NaN to integer` at `utils/bbox_utils.py:3`, reached via
`utils/serve_detector.py:110`. It occurs when shot frames are inferred but ball detections
are all NaN (0% detection). The validity gate had already refused the clip, so no wrong
number was reported — but the pipeline should refuse gracefully instead of raising. Worth
fixing when we start modifying this code in Phase 1; not fixed now, as Phase 0 is a
read-only spike.

---

# Phase 0 re-run — owner-supplied group clips (2026-11-11)

9 clips (R01–R09, consent confirmed by the owner, videos gitignored in `data/real_clips/`). Full inventory
and per-clip table: `../docs/ml/real-clips-inventory.md`. Run with `tools/real_clips_phase0.py`
(`--fast --no-stubs`, first 300 frames).

## Result

**Court gate: 1 of 9 passed, and that one (R02, 0.240) is an empty, well-marked clay court with nobody
playing. 0 of 8 clips with play passed.** Ball detected on 3–58% of frames (median 15%). Player selection
failed on all 9. The precheck rejected all 9 on headers alone (portrait, under 960 px wide). No crashes.

## Why

Same capture as September: TikTok exports forwarded over WhatsApp, so portrait and 480–576 px wide, and
mostly ground-level, handheld or edited (cuts every 1–2.5 s in R01, R04, R08). R04 scored 0.000 because its
cuts keep changing the view. R06 (0.211) and R09 (0.202) were near misses on faint lines, as in September.

## Verdict

**Still not a go/no-go on the models, but two things are now firmer:**

1. **Portrait, messaging-app footage doesn't work, and the app is right to refuse it.** Across both runs that
   is 0 of 18 clips with play, on 9 different courts. The precheck's portrait and resolution refusals are
   the correct product behaviour, not over-caution.
2. **A well-marked court clears the gate even at 480 px portrait** (R02, 0.240). That supports September's
   reading: line quality plus capture are the constraint, and properly filmed footage of a well-marked court
   should pass.

The decisive test is unchanged and still cheap: 3–5 landscape, static, full-resolution clips of a rally on a
well-marked court, sent as files rather than as WhatsApp videos. Any player in the group can film them. It
doesn't need the owner.
