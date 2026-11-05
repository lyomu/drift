import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Outline glyph for a tennis skill pillar (`FOREHAND`, `NET_PLAY`…) — the
/// Create Goal redesign's skill icons. Same approach as [DriftRacketIcon]:
/// `currentColor` strokes tinted through a [ColorFilter], so one glyph works
/// in light and dark themes at any size. Unknown pillars fall back to the
/// forehand glyph.
class DriftSkillIcon extends StatelessWidget {
  const DriftSkillIcon(this.skill, {super.key, this.size, this.color});

  final String skill;
  final double? size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final iconTheme = IconTheme.of(context);
    final resolvedSize = size ?? iconTheme.size ?? 24;
    final resolvedColor = color ?? iconTheme.color ?? const Color(0xFF000000);

    return SvgPicture.string(
      _wrap(_paths[skill] ?? _paths['FOREHAND']!),
      width: resolvedSize,
      height: resolvedSize,
      colorFilter: ColorFilter.mode(resolvedColor, BlendMode.srcIn),
    );
  }
}

String _wrap(String body) =>
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" '
    'stroke="#000" stroke-width="1.8" stroke-linecap="round" '
    'stroke-linejoin="round">$body</svg>';

const _paths = <String, String>{
  'FOREHAND':
      '<ellipse cx="9" cy="8" rx="4.6" ry="6.2" transform="rotate(-42 9 8)"/>'
      '<path d="m12.8 12.8 6.4 7.3M17.4 18.1l1.8-1.6M5.2 5.3l7.6 6.6M4.1 8.3l6.2 5.1"/>'
      '<circle cx="19.2" cy="5.2" r="1.55" fill="#000" stroke="none"/>'
      '<path d="M20.8 9.2c-2.3 1.4-4.6 1.6-6.8.7" opacity=".55"/>',
  'BACKHAND':
      '<ellipse cx="15" cy="8" rx="4.6" ry="6.2" transform="rotate(42 15 8)"/>'
      '<path d="m11.2 12.8-6.4 7.3M6.6 18.1l-1.8-1.6M18.8 5.3l-7.6 6.6M19.9 8.3l-6.2 5.1"/>'
      '<circle cx="4.8" cy="5.2" r="1.55" fill="#000" stroke="none"/>'
      '<path d="M3.2 9.2c2.3 1.4 4.6 1.6 6.8.7" opacity=".55"/>',
  'SERVE':
      '<circle cx="8.7" cy="6" r="2"/>'
      '<circle cx="16.9" cy="2.8" r="1.35" fill="#000" stroke="none"/>'
      '<path d="m9.4 8.2 2.4 4.7-1.4 4.1M11.8 12.9l4.8 2.8M10.4 17l-3.7 4M10.4 17l4.2 3.4M10.6 10l3-4.1 1.8-1.2"/>'
      '<ellipse cx="18.2" cy="7.1" rx="2.2" ry="3.1" transform="rotate(31 18.2 7.1)"/>'
      '<path d="m16.5 9.5-1.9 2.7"/>',
  'RETURN':
      '<ellipse cx="15.8" cy="8.1" rx="3.8" ry="5.2" transform="rotate(46 15.8 8.1)"/>'
      '<path d="m12.6 12.1-6.7 7M7.7 17.2l-1.6-1.5M19.1 5.6l-6.6 5.9M18.8 9.2l-4.2 3.3"/>'
      '<circle cx="4" cy="7.1" r="1.55" fill="#000" stroke="none"/>'
      '<path d="M3.4 11.2c3.3 1 6.1.4 8.6-1.6M4.8 4.1 3.4 7.2l3.2 1.1" opacity=".65"/>',
  'NET_PLAY':
      '<path d="M3 8v12M21 8v12M3 10h18M3 20h18M7.5 10v10M12 10v10M16.5 10v10M3 15h18"/>'
      '<circle cx="16.8" cy="5.2" r="2" fill="#000" stroke="none"/>'
      '<path d="M8.2 4.5c2.5-.8 4.8-.6 6.6.2" opacity=".55"/>',
  'MOVEMENT':
      '<circle cx="14.8" cy="4.2" r="2"/>'
      '<path d="m13.5 7-3.2 4.2 3.8 2.7 2.5 4.2M10.3 11.2l-4.8 2M14.1 13.9 9.6 20M14 8.7l4.6 2.1 2-2.1"/>'
      '<path d="M3.2 18.4h3.2M2.8 14.8H5" opacity=".55"/>',
  'MATCH_PLAY':
      '<path d="M3.5 4h17v16h-17zM3.5 12h17M12 4v16M3.5 8h17M3.5 16h17M8 4v4M16 4v4M8 16v4M16 16v4"/>'
      '<circle cx="7.8" cy="10.1" r="1.35" fill="#000" stroke="none"/>',
  'FOOTWORK':
      '<path d="M5.2 4.2c1.9-.3 3.2 1.1 3.9 3.3l1.2 3.7c.5 1.6-.4 2.8-1.9 2.5l-2.6-.6c-1.6-.4-2.3-1.5-2-3.1l.6-3.8c.2-1 .2-1.7.8-2ZM17.7 11.1c1.8.4 2.6 2 2.5 4.3l-.2 3.9c-.1 1.7-1.3 2.5-2.6 1.7l-2.3-1.4c-1.4-.8-1.8-2.1-1-3.5l1.9-3.4c.5-.9.8-1.6 1.7-1.6Z"/>'
      '<path d="M5.2 7.3 8.5 8M15.9 15.3l3.5.8"/>',
};
