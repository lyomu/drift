import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n.dart';

/// Static catalogue behind the Create Goal flow: which skills a goal can
/// target, the focuses offered per skill, and the milestones suggested when
/// the player reaches the "Build your goal" step.

/// Skill pillars a goal can target, in grid order.
const goalSkills = [
  'FOREHAND',
  'BACKHAND',
  'SERVE',
  'RETURN',
  'NET_PLAY',
  'MOVEMENT',
  'MATCH_PLAY',
  'FOOTWORK',
];

/// Focus code a player picks to "keep it general".
const goalFocusGeneral = 'GENERAL';

/// The four skill-specific focuses per pillar (the General option is added
/// after these by the screen).
const goalFocusesBySkill = <String, List<String>>{
  'FOREHAND': ['CONSISTENCY', 'ACCURACY', 'POWER', 'TECHNIQUE'],
  'BACKHAND': ['CONSISTENCY', 'ACCURACY', 'POWER', 'TECHNIQUE'],
  'SERVE': ['CONSISTENCY', 'PLACEMENT', 'POWER', 'TECHNIQUE'],
  'RETURN': ['CONSISTENCY', 'POSITIONING', 'REACTION', 'DEPTH'],
  'NET_PLAY': ['VOLLEYS', 'POSITIONING', 'TOUCH', 'APPROACH'],
  'MOVEMENT': ['SPEED', 'BALANCE', 'RECOVERY', 'ENDURANCE'],
  'MATCH_PLAY': ['STRATEGY', 'COMPOSURE', 'CONSISTENCY', 'CLOSING'],
  'FOOTWORK': ['PREPARATION', 'AGILITY', 'RECOVERY', 'BALANCE'],
};

/// One-line description of [focus] in the context of [skill].
String goalFocusDescription(AppLocalizations l, String skill, String focus) =>
    switch ((skill, focus)) {
      (_, 'GENERAL') => l.goalFocusDescGeneral,
      ('FOREHAND', 'CONSISTENCY') => l.goalFocusDescForehandConsistency,
      ('FOREHAND', 'ACCURACY') => l.goalFocusDescForehandAccuracy,
      ('FOREHAND', 'POWER') => l.goalFocusDescForehandPower,
      ('FOREHAND', 'TECHNIQUE') => l.goalFocusDescForehandTechnique,
      ('BACKHAND', 'CONSISTENCY') => l.goalFocusDescBackhandConsistency,
      ('BACKHAND', 'ACCURACY') => l.goalFocusDescBackhandAccuracy,
      ('BACKHAND', 'POWER') => l.goalFocusDescBackhandPower,
      ('BACKHAND', 'TECHNIQUE') => l.goalFocusDescBackhandTechnique,
      ('SERVE', 'CONSISTENCY') => l.goalFocusDescServeConsistency,
      ('SERVE', 'PLACEMENT') => l.goalFocusDescServePlacement,
      ('SERVE', 'POWER') => l.goalFocusDescServePower,
      ('SERVE', 'TECHNIQUE') => l.goalFocusDescServeTechnique,
      ('RETURN', 'CONSISTENCY') => l.goalFocusDescReturnConsistency,
      ('RETURN', 'POSITIONING') => l.goalFocusDescReturnPositioning,
      ('RETURN', 'REACTION') => l.goalFocusDescReturnReaction,
      ('RETURN', 'DEPTH') => l.goalFocusDescReturnDepth,
      ('NET_PLAY', 'VOLLEYS') => l.goalFocusDescNetPlayVolleys,
      ('NET_PLAY', 'POSITIONING') => l.goalFocusDescNetPlayPositioning,
      ('NET_PLAY', 'TOUCH') => l.goalFocusDescNetPlayTouch,
      ('NET_PLAY', 'APPROACH') => l.goalFocusDescNetPlayApproach,
      ('MOVEMENT', 'SPEED') => l.goalFocusDescMovementSpeed,
      ('MOVEMENT', 'BALANCE') => l.goalFocusDescMovementBalance,
      ('MOVEMENT', 'RECOVERY') => l.goalFocusDescMovementRecovery,
      ('MOVEMENT', 'ENDURANCE') => l.goalFocusDescMovementEndurance,
      ('MATCH_PLAY', 'STRATEGY') => l.goalFocusDescMatchPlayStrategy,
      ('MATCH_PLAY', 'COMPOSURE') => l.goalFocusDescMatchPlayComposure,
      ('MATCH_PLAY', 'CONSISTENCY') => l.goalFocusDescMatchPlayConsistency,
      ('MATCH_PLAY', 'CLOSING') => l.goalFocusDescMatchPlayClosing,
      ('FOOTWORK', 'PREPARATION') => l.goalFocusDescFootworkPreparation,
      ('FOOTWORK', 'AGILITY') => l.goalFocusDescFootworkAgility,
      ('FOOTWORK', 'RECOVERY') => l.goalFocusDescFootworkRecovery,
      ('FOOTWORK', 'BALANCE') => l.goalFocusDescFootworkBalance,
      _ => '',
    };

/// Three starter milestones for [skill], in the active language.
List<String> suggestedGoalMilestones(AppLocalizations l, String skill) {
  final (sessions, drill) = switch (skill) {
    'FOREHAND' => (
      l.goalMilestoneSessionsForehand,
      l.goalMilestoneDrillForehand,
    ),
    'BACKHAND' => (
      l.goalMilestoneSessionsBackhand,
      l.goalMilestoneDrillBackhand,
    ),
    'SERVE' => (l.goalMilestoneSessionsServe, l.goalMilestoneDrillServe),
    'RETURN' => (l.goalMilestoneSessionsReturn, l.goalMilestoneDrillReturn),
    'NET_PLAY' => (l.goalMilestoneSessionsNetPlay, l.goalMilestoneDrillNetPlay),
    'MOVEMENT' => (
      l.goalMilestoneSessionsMovement,
      l.goalMilestoneDrillMovement,
    ),
    'MATCH_PLAY' => (
      l.goalMilestoneSessionsMatchPlay,
      l.goalMilestoneDrillMatchPlay,
    ),
    'FOOTWORK' => (
      l.goalMilestoneSessionsFootwork,
      l.goalMilestoneDrillFootwork,
    ),
    _ => (null, null),
  };
  return [
    if (sessions != null) sessions,
    if (drill != null) drill,
    l.goalMilestoneReachTarget(pillarLabel(l, skill)),
  ];
}
