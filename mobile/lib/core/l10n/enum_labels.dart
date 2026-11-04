import 'package:intl/intl.dart';

import 'l10n.dart';

/// Translated labels for backend enum values that several features show.
/// Unknown values fall back to the raw value, so a new enum case renders as
/// something rather than nothing.

/// Skill pillars (`FOREHAND`, `NET_PLAY`, …) — assessment, ratings, learning.
String pillarLabel(AppLocalizations l, String pillar) => switch (pillar) {
  'FOREHAND' => l.pillarForehand,
  'BACKHAND' => l.pillarBackhand,
  'SERVE' => l.pillarServe,
  'RETURN' => l.pillarReturn,
  'NET_PLAY' => l.pillarNetPlay,
  'VOLLEY' => l.pillarVolley,
  'MOVEMENT' => l.pillarMovement,
  'MATCH_PLAY' => l.pillarMatchPlay,
  'FOOTWORK' => l.pillarFootwork,
  'FITNESS' => l.pillarFitness,
  'MENTAL' => l.pillarMental,
  'TACTICS' => l.pillarTactics,
  'COMPETITION_EXPERIENCE' => l.pillarCompetitionExperience,
  _ => pillar,
};

/// Goal focus codes (`CONSISTENCY`, `GENERAL`…) — the sub-focus a player
/// picks within a skill when creating a goal.
String goalFocusLabel(AppLocalizations l, String focus) => switch (focus) {
  'CONSISTENCY' => l.goalFocusConsistency,
  'ACCURACY' => l.goalFocusAccuracy,
  'POWER' => l.goalFocusPower,
  'TECHNIQUE' => l.goalFocusTechnique,
  'PLACEMENT' => l.goalFocusPlacement,
  'POSITIONING' => l.goalFocusPositioning,
  'REACTION' => l.goalFocusReaction,
  'DEPTH' => l.goalFocusDepth,
  'VOLLEYS' => l.goalFocusVolleys,
  'TOUCH' => l.goalFocusTouch,
  'APPROACH' => l.goalFocusApproach,
  'SPEED' => l.goalFocusSpeed,
  'BALANCE' => l.goalFocusBalance,
  'RECOVERY' => l.goalFocusRecovery,
  'ENDURANCE' => l.goalFocusEndurance,
  'STRATEGY' => l.goalFocusStrategy,
  'COMPOSURE' => l.goalFocusComposure,
  'CLOSING' => l.goalFocusClosing,
  'PREPARATION' => l.goalFocusPreparation,
  'AGILITY' => l.goalFocusAgility,
  'GENERAL' => l.goalFocusGeneral,
  _ => focus,
};

/// Padel skill pillars, which add padel-only shots to the shared ones.
String padelPillarLabel(AppLocalizations l, String pillar) => switch (pillar) {
  'RALLY_CONSISTENCY' => l.padelPillarRallyConsistency,
  'OVERHEAD' => l.padelPillarOverhead,
  'BANDEJA' => l.padelPillarBandeja,
  'VIBORA' => l.padelPillarVibora,
  'SMASH' => l.padelPillarSmash,
  'WALL_USAGE' => l.padelPillarWallUsage,
  'POSITIONING' => l.padelPillarPositioning,
  'NET_CONTROL' => l.padelPillarNetControl,
  'TRANSITION' => l.padelPillarTransition,
  'PARTNER_COMMUNICATION' => l.padelPillarPartnerCommunication,
  'TACTICAL_AWARENESS' => l.padelPillarTacticalAwareness,
  _ => pillarLabel(l, pillar),
};

/// Time-of-day blocks used by availability and preferences.
String timeBlockLabel(AppLocalizations l, String block) => switch (block) {
  'MORNING' => l.timeMorning,
  'AFTERNOON' => l.timeAfternoon,
  'EVENING' => l.timeEvening,
  _ => block,
};

/// Short weekday name for `DateTime.weekday`-style 1 (Mon) … 7 (Sun), in the
/// active language — "Mon", "lun.", "lun".
String shortWeekday(String localeTag, int weekday) =>
    // 2024-01-01 was a Monday.
    DateFormat.E(localeTag).format(DateTime(2024, 1, weekday));

/// Short day name for the backend's Sunday-first `dayOfWeek` (0 = Sun).
String shortDayOfWeek(String localeTag, int dayOfWeek) =>
    // 2023-12-31 was a Sunday.
    DateFormat.E(localeTag).format(DateTime(2023, 12, 31 + dayOfWeek));

/// `SINGLES` / `DOUBLES` / `EITHER` format preferences.
String formatPrefLabel(AppLocalizations l, String value) => switch (value) {
  'SINGLES' => l.optSingles,
  'DOUBLES' => l.optDoubles,
  'EITHER' => l.optEither,
  _ => value,
};

/// `SOCIAL` / `COMPETITIVE` / `EITHER` style preferences.
String stylePrefLabel(AppLocalizations l, String value) => switch (value) {
  'SOCIAL' => l.optSocial,
  'COMPETITIVE' => l.optCompetitive,
  'EITHER' => l.optEither,
  _ => value,
};

/// "Right-handed" etc. for `LEFT` / `RIGHT` / `AMBIDEXTROUS`.
String handednessLabel(AppLocalizations l, String value) => switch (value) {
  'LEFT' => l.handLeftHanded,
  'RIGHT' => l.handRightHanded,
  'AMBIDEXTROUS' => l.onbHandAmbidextrous,
  _ => value,
};

/// Court surfaces (`HARD`, `CLAY`, …).
String surfaceLabel(AppLocalizations l, String value) => switch (value) {
  'HARD' => l.surfaceHard,
  'CLAY' => l.surfaceClay,
  'GRASS' => l.surfaceGrass,
  'ARTIFICIAL_GRASS' => l.surfaceArtificialGrass,
  'CARPET' => l.surfaceCarpet,
  _ => value,
};

/// The server's level-band names ("Beginner" … "Advanced", from
/// `labelForLevel`) arrive in English; this shows them in the app's language.
String levelLabelText(AppLocalizations l, String serverLabel) =>
    switch (serverLabel) {
      'Beginner' => l.levelBeginner,
      'Foundational' => l.levelFoundational,
      'Intermediate' => l.levelIntermediate,
      'Advanced' => l.levelAdvanced,
      _ => serverLabel,
    };
