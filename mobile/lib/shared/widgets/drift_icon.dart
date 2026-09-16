import 'package:flutter/material.dart';

import 'drift_racket_icon.dart';

/// Drop-in replacement for [Icon] used by every widget that renders an
/// arbitrary [IconData] passed in from elsewhere (list rows, empty states,
/// icon tiles). It swaps in the hand-drawn [DriftRacketIcon] for any of the
/// built-in `Icons.sports_tennis*` glyphs and renders everything else exactly
/// as [Icon] would — so call sites that merely pass `Icons.sports_tennis`
/// around as data didn't need to change for the 2026-09 icon refresh.
class DriftIcon extends StatelessWidget {
  const DriftIcon(this.icon, {super.key, this.size, this.color});

  final IconData icon;
  final double? size;
  final Color? color;

  // IconData overrides `==`, so this set literal can't be `const`.
  static final _racketGlyphs = {
    Icons.sports_tennis,
    Icons.sports_tennis_outlined,
    Icons.sports_tennis_rounded,
  };

  @override
  Widget build(BuildContext context) {
    if (_racketGlyphs.contains(icon)) {
      return DriftRacketIcon(size: size, color: color);
    }
    return Icon(icon, size: size, color: color);
  }
}
