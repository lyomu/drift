# Tennis ML dataset shortlist (2026-11-10)

Licence, image count, classes and update date below come from the Roboflow API (project metadata),
checked 2026-11-10. The licence is the **uploader's claim**; Roboflow does not verify they own the images.
Still UNVERIFIED for every row: camera angle / footage type and label quality. Someone must open
sample images before training. Target: phone video, any angle, tennis only, commercial use.

Rule: CC BY 4.0 and MIT are OK with attribution. Any NC / research-only licence is excluded.

## EXCLUDED (non-commercial)
| Dataset | Licence |
|---|---|
| worspace01/tenniscourtkeypoint | BY-NC-SA 4.0 |
| ss802/tennis_ball_detector-e9mgh | BY-NC-SA 4.0 |

## Court (keypoints)
| Dataset (universe.roboflow.com/...) | Type | Licence | Images | Classes | Updated |
|---|---|---|---|---|---|
| hotmintsauce/court-key-points | keypoint | CC BY 4.0 | 572 | court lines, net sides | 2024-10 |
| computer-vision-projects-h73wd/tennis-court-detection-pnnwf | keypoint | MIT | 200 | court | 2024-08 |
| val-aospz/court-keypoint | keypoint | CC BY 4.0 | 99 | court_kpts | 2024-04 |
| zainab-workspace-otyvb/court_point_detection | box | CC BY 4.0 | 655 | CORNERS | 2023-09 |
| sb-9qgz6/tennis-court-keypoints-ey2bo | box (regions) | CC BY 4.0 | 989 | 8 court regions | 2024-09 |
| roboten/tennis-vhrs9 | box | CC BY 4.0 | 818 | court, net, player | 2023-08 |
| datamentors/court-keypoints-uwjr0 | keypoint | CC BY 4.0 | 2 | too small, skip | 2026-01 |

Notes: sb-9qgz6 has 0 versions listed, so it may not be exportable until a version is generated.
Total usable court data is only about 1.5-2k images, so plan to add our own phone frames.

## Ball
| Dataset | Licence | Images | Classes | Updated |
|---|---|---|---|---|
| mlaimcv/tennis-kbgit | CC BY 4.0 | 1195 | ball, player, referee | 2025-02 |
| tennis-8bruw/tennis-detect-9j9tx | CC BY 4.0 | 1160 | ball, player1, player2 | 2024-06 |
| epuresearchspace/detect_tennisball | CC BY 4.0 | 1096 | tennis_ball | 2024-09 |
| dzineongyaltsen/tenniscv | CC BY 4.0 | 694 | ball (broadcast, 3 surfaces) | 2024-11 |
| viren-dhanwani/tennis-ball-detection | CC BY 4.0 | 578 | tennis ball | 2026-01 |
| ahmad-workspace/tennis-ball-detection-hpv6q | CC BY 4.0 | 577 | tennis-ball | 2023-06 |
| gani-moli-s-yym2m/tennis_ball_detection-t5wnx | CC BY 4.0 | 184 | players, ball, court | 2024-11 |
| tennisws/tennisballdetection-o34pg | CC BY 4.0 | 137 | ball | 2025-10 |

Note: objdetectionboundingbox/tennis-ball-detection-hyeva has the same 578 images as viren-dhanwani
(likely a copy); do not count both. Combined unique ball images: roughly 4-5k. Single-frame
detectors are weak for blurry phone video; plan a multi-frame tracker and use these for init/validation.

## Players / rackets
| Dataset | Licence | Images | Classes | Updated |
|---|---|---|---|---|
| university-zjdmp/racket-detection-d51wu | CC BY 4.0 | 894 | racket (class "0") | 2023-12 |
| hyundong-song/tennis-racket-4ahvr | CC BY 4.0 | 473 | tennis racket | 2023-11 |
| basile/tennis-i3t8x | CC BY 4.0 | 407 | Racket, Head | 2025-02 |
| base-workspace/tennis-players-detection | CC BY 4.0 | 205 | Player1/2 | 2024-08 |
| ttest-ezbls/racket_player_detect | CC BY 4.0 | 185 | Player, Racket | 2023-08 |

Players: use a pretrained COCO person detector first; fine-tuning on these is optional.

## Pose / strokes
| Dataset | Licence | Images | Classes | Updated |
|---|---|---|---|---|
| keroro/tennis-sw5e1 | CC BY 4.0 | 2000 | keypoints: Serve, Backhand, Forehand, Ready_Position | 2025-12 |
| loong/tennis_points | CC BY 4.0 | 602 | keypoints (class "0") | 2024-08 |
| licenta-ntbhr/tennis-pose-estimation | CC BY 4.0 | 0 | empty, skip | 2024-11 |

keroro/tennis is the most promising: 2000 images with stroke-phase labels. Verify whether the
labels are per-image stroke types with player keypoints, and what angles the images show.
Research datasets (THETIS, TenniSet, 3DTennisDS) still have no confirmed usable licence.

## Gaps (own data needed)
- Phone-angle court frames, especially side and elevated angles.
- Stroke classification over time (sequences), not single images.
- Any footage from varied angles for validation.

## Registry (fill in as datasets are actually used for training)
| Dataset | URL | Licence | Date checked | Used for | Attribution text |
|---|---|---|---|---|---|
