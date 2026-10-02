import 'package:flutter/widgets.dart';

/// Material Symbols Rounded at **FILL 1**.
///
/// The `material_symbols_icons` package ships the Rounded face as a variable
/// font whose `FILL` axis defaults to 0, and `Icon(..., fill: 1)` drives that
/// axis through `fontVariations` — which Impeller ignores on Android, so the
/// icons come out outlined. Same bug that forced static cuts for Outfit and
/// Outfit.
///
/// So the filled glyphs come from a pre-instanced static subset
/// (`assets/fonts/MaterialSymbolsRounded-Filled.ttf`, FILL 1 / wght 500 /
/// GRAD 0 / opsz 20 — the mock's exact variation settings). The codepoints
/// are the package's own, so these are the same glyphs `Symbols.*_rounded`
/// would give, just baked.
///
/// Unfilled icons (`arrow_back`, `chevron_right` …) have no fill variant to
/// lose, so those keep using `Symbols.*_rounded` from the package directly.
///
/// Regenerating, after adding a codepoint below:
/// ```
/// python -m fontTools.varLib.instancer <pkg>/lib/fonts/MaterialSymbolsRounded.ttf \
///   FILL=1 wght=500 GRAD=0 opsz=20 -o /tmp/full.ttf
/// python -m fontTools.subset /tmp/full.ttf --unicodes=f013,f08f,... \
///   --output-file=assets/fonts/MaterialSymbolsRounded-Filled.ttf
/// ```
class DriftSymbolsFilled {
  const DriftSymbolsFilled._();

  static const _family = 'MaterialSymbolsRoundedFilled';

  static const IconData verifiedUser = IconData(0xf013, fontFamily: _family);
  static const IconData doNotDisturbOn = IconData(0xf08f, fontFamily: _family);
  static const IconData groupAdd = IconData(0xe7f0, fontFamily: _family);
  static const IconData notificationsActive =
      IconData(0xe7f7, fontFamily: _family);
  static const IconData cardMembership = IconData(0xe8f7, fontFamily: _family);
  static const IconData manageAccounts = IconData(0xf02e, fontFamily: _family);
  static const IconData contactSupport = IconData(0xe94c, fontFamily: _family);
  static const IconData supportAgent = IconData(0xf0e2, fontFamily: _family);
  static const IconData policy = IconData(0xea17, fontFamily: _family);
  static const IconData logout = IconData(0xe9ba, fontFamily: _family);
  static const IconData videocam = IconData(0xe04b, fontFamily: _family);
  static const IconData delete = IconData(0xe92e, fontFamily: _family);

  /// Unfilled by nature, but baked here because the mock draws it at wght
  /// 500 — another axis Impeller would drop back to the 400 default master.
  static const IconData arrowBack = IconData(0xe5c4, fontFamily: _family);

  // Achievement badges. The names are the backend's own `icon` strings from
  // achievements.service.ts, resolved through [achievementSymbol].
  static const IconData sportsTennis = IconData(0xea32, fontFamily: _family);
  static const IconData emojiEvents = IconData(0xea23, fontFamily: _family);
  static const IconData fitnessCenter = IconData(0xeb43, fontFamily: _family);
  static const IconData school = IconData(0xe80c, fontFamily: _family);
  static const IconData flag = IconData(0xf0c6, fontFamily: _family);
  static const IconData groups = IconData(0xf233, fontFamily: _family);
  static const IconData leaderboard = IconData(0xf20c, fontFamily: _family);
  static const IconData trackChanges = IconData(0xe8e1, fontFamily: _family);
  static const IconData group = IconData(0xea21, fontFamily: _family);
  static const IconData militaryTech = IconData(0xea3f, fontFamily: _family);

  static const IconData calendarToday = IconData(0xe935, fontFamily: _family);

  // Drawer navigation. The *outlined* counterparts are not here — those are
  // FILL 0 / wght 400, the package font's default master, so an inactive row
  // uses `Symbols.*_rounded` straight from the package.
  static const IconData person = IconData(0xf0d3, fontFamily: _family);
  static const IconData newspaper = IconData(0xeb81, fontFamily: _family);
  static const IconData notifications = IconData(0xe7f5, fontFamily: _family);
  static const IconData settings = IconData(0xe8b8, fontFamily: _family);
  static const IconData close = IconData(0xe5cd, fontFamily: _family);
}

/// The same face at **wght 600**, which the mocks use for `check_circle` and
/// the duration stepper's `+` / `-`. A second family rather than a `weight:`
/// argument, because that argument is a font variation too.
///
/// `add` and `remove` are solid strokes with no fill variant, so taking them
/// from the FILL 1 instance costs nothing.
class DriftSymbolsFilled600 {
  const DriftSymbolsFilled600._();

  static const _family = 'MaterialSymbolsRoundedFilled600';

  static const IconData checkCircle = IconData(0xf0be, fontFamily: _family);
  static const IconData add = IconData(0xe145, fontFamily: _family);
  static const IconData remove = IconData(0xe15b, fontFamily: _family);

  /// The tick inside a selected radio dot. The mocks draw it as an SVG path
  /// at `stroke-width: 2`, which this weight matches.
  static const IconData check = IconData(0xe668, fontFamily: _family);
}

/// Maps an `Achievement.icon` string to its glyph.
///
/// The backend catalogue sends `sports_tennis`, `emoji_events`,
/// `fitness_center`, `school`, `flag`, `groups`, `leaderboard`. The prototype
/// picked `track_changes`, `group` and `military_tech` for the last three
/// instead, so both spellings resolve here and the server stays the source of
/// truth. Anything unrecognised falls back to the trophy.
IconData achievementSymbol(String icon) => switch (icon) {
  'sports_tennis' => DriftSymbolsFilled.sportsTennis,
  'emoji_events' => DriftSymbolsFilled.emojiEvents,
  'fitness_center' => DriftSymbolsFilled.fitnessCenter,
  'school' => DriftSymbolsFilled.school,
  'flag' => DriftSymbolsFilled.flag,
  'groups' => DriftSymbolsFilled.groups,
  'leaderboard' => DriftSymbolsFilled.leaderboard,
  'track_changes' => DriftSymbolsFilled.trackChanges,
  'group' => DriftSymbolsFilled.group,
  'military_tech' => DriftSymbolsFilled.militaryTech,
  _ => DriftSymbolsFilled.emojiEvents,
};
