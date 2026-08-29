import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/drift_colors.dart';

/// Bottom navigation — a verbatim port of `App.tsx` `BottomNav`: a flat white
/// bar with a 1px top border, five `flex: 1` tabs, a 22px outline icon and a
/// 10px label. Active tab is `color.primary` / w700; the rest are `#9CA3AF`
/// / w500. No selection pill (that's the Material `NavigationBar` look the
/// redesign drops).
class DriftBottomNav extends StatelessWidget {
  const DriftBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onSelected,
  });

  final int selectedIndex;
  final ValueChanged<int> onSelected;

  static const _inactive = Color(0xFF9CA3AF);

  static const _tabs = [
    (label: 'Home', svg: _homeSvg),
    (label: 'Play', svg: _playSvg),
    (label: 'Compete', svg: _competeSvg),
    (label: 'Discover', svg: _discoverSvg),
    (label: 'Profile', svg: _profileSvg),
  ];

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(top: BorderSide(color: colors.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            children: [
              for (var i = 0; i < _tabs.length; i++)
                Expanded(
                  child: _Tab(
                    label: _tabs[i].label,
                    svg: _tabs[i].svg,
                    color: i == selectedIndex ? colors.primary : _inactive,
                    active: i == selectedIndex,
                    onTap: () => onSelected(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    required this.label,
    required this.svg,
    required this.color,
    required this.active,
    required this.onTap,
  });

  final String label;
  final String svg;
  final Color color;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(0, 10, 0, 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SvgPicture.string(
              svg,
              width: 22,
              height: 22,
              colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'Outfit',
                fontSize: 10,
                height: 1.2,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

const _homeSvg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<path d="M3 9.5L11 3l8 6.5V19a1 1 0 0 1-1 1H14v-5H8v5H4a1 1 0 0 1-1-1V9.5z" '
    'stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';

const _playSvg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<circle cx="11" cy="8" r="3.5" stroke="currentColor" stroke-width="1.7"/>'
    '<path d="M4 19c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" '
    'stroke-width="1.7" stroke-linecap="round"/></svg>';

const _competeSvg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<path d="M7 4h8v6a4 4 0 0 1-8 0V4z" stroke="currentColor" stroke-width="1.7" '
    'stroke-linejoin="round"/>'
    '<path d="M11 14v4m-4 0h8" stroke="currentColor" stroke-width="1.7" '
    'stroke-linecap="round"/>'
    '<path d="M7 7H4a2 2 0 0 0 0 4h3M15 7h3a2 2 0 0 0 0 4h-3" stroke="currentColor" '
    'stroke-width="1.7" stroke-linecap="round"/></svg>';

const _discoverSvg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.7"/>'
    '<path d="M14.5 7.5l-2.5 5L7.5 14.5l2.5-5 4.5-2z" stroke="currentColor" '
    'stroke-width="1.7" stroke-linejoin="round"/></svg>';

const _profileSvg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<circle cx="11" cy="7" r="4" stroke="currentColor" stroke-width="1.7"/>'
    '<path d="M3 19c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="currentColor" '
    'stroke-width="1.7" stroke-linecap="round"/></svg>';
