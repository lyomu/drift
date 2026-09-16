import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The app's racket-and-ball glyph — a purpose-drawn replacement for
/// Material's `Icons.sports_tennis*` (2026-09 icon refresh: the stock glyph
/// reads as flat and generic at nav/tile sizes). Same outline language as
/// `DriftBottomNav`'s tab icons — `currentColor` strokes tinted via
/// [ColorFilter], so it scales cleanly from 15px inline glyphs up to the
/// 56px splash mark.
class DriftRacketIcon extends StatelessWidget {
  const DriftRacketIcon({super.key, this.size, this.color});

  final double? size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final iconTheme = IconTheme.of(context);
    final resolvedSize = size ?? iconTheme.size ?? 24;
    final resolvedColor = color ?? iconTheme.color ?? const Color(0xFF000000);

    return SvgPicture.string(
      _svg,
      width: resolvedSize,
      height: resolvedSize,
      colorFilter: ColorFilter.mode(resolvedColor, BlendMode.srcIn),
    );
  }
}

const _svg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<ellipse cx="8.6" cy="7.8" rx="5.1" ry="6.2" transform="rotate(-20 8.6 7.8)" '
    'stroke="currentColor" stroke-width="1.6"/>'
    '<path d="M8.6 2v11.6M3.9 7.8h9.4" transform="rotate(-20 8.6 7.8)" '
    'stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
    '<path d="M11.4 12.6l6.3 6.3" stroke="currentColor" stroke-width="1.7" '
    'stroke-linecap="round"/>'
    '<circle cx="18.6" cy="19.6" r="1.1" fill="currentColor"/>'
    '<circle cx="17.2" cy="4.4" r="2" fill="currentColor"/></svg>';
