from .video_utils import read_video, save_video, stub_path_for_video, stub_matches_frames
from .bbox_utils import get_center_of_bbox, measure_distance_between_points, get_foot_position, get_closest_keypoint_index, get_height_of_bbox, measure_xy_distance
from .conversions import convert_pixel_distance_to_meters, convert_meters_to_pixel_distance
from .player_stats_drawer_utils import draw_player_stats
from .shot_classifier import ShotClassifier, draw_shot_classifications
from .ball_state import (
    classify_floor_level,
    classify_contact_vs_bounce,
    FLOOR_LEVEL,
    IN_FLIGHT,
    CONTACT,
    BOUNCE,
)
from .kalman_smoother import (
    PositionKalmanFilter,
    smooth_trajectories,
    peak_speed_kmh_near_frame,
)
from .player_selection import assess_selection, select_players, select_two_players
from .pose_estimator import PoseEstimator
from .pose_shot_classifier import classify_forehand_backhand, FOREHAND, BACKHAND
from .hit_bounce_classifier import (
    compute_event_features,
    striking_player,
    classify_hit_or_bounce,
    classify_reversals_by_trajectory,
    detect_xvelocity_candidates,
    merge_nearby_candidates,
    derive_shot_frames,
)
# Court sides. `striking_side` lives here rather than in hit_bounce_classifier because it
# answers a different question from `striking_player` — which END struck the ball, not who.
# Conflating them was a real bug; see utils/court_sides.py.
from .court_sides import FAR, NEAR, court_side, group_players_by_side, striking_side
from .ui_layout_manager import UILayoutManager, create_layout_for_frame
from .court_validity import (
    assess_court_fit,
    assess_court_fit_detail,
    line_support_score,
    MIN_LINE_SUPPORT,
)
from .precheck import (
    precheck,
    probe_metadata,
    sample_frames,
    Finding,
    PrecheckResult,
    PASS,
    WARN,
    REJECT,
)
# Session segmentation and aggregation (Phase 3). Imported here for the same reason as the
# rest: `from utils import ...` is the convention the pipeline and every eval script use.
#
# `rally_segmenter` imports `precheck` above it for MIN_DURATION_S — the segmenter and the
# upload gate must agree about what is too short to be a rally, so the floor is shared rather
# than restated.
from .rally_segmenter import (
    segment_session,
    subject_motion,
    cut_span,
    RallySpan,
    SegmentationResult,
)
from .session_aggregate import (
    aggregate_session,
    session_totals_match_parts,
    is_calibrated,
)
# Doubles and full-match support (Phase 4). match_structure reads the Phase 3 segmenter's spans
# as points; runtime_budget answers "will this fit" before any model runs.
from .match_structure import analyse_structure, group_into_games, points_from_spans
from .runtime_budget import estimate_runtime, frames_within_budget
