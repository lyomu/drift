import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/drift_colors.dart';
import '../l10n/l10n.dart';

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

  static final _tabs = <({String Function(AppLocalizations) label, String svg})>[
    (label: (l) => l.navHome, svg: _homeSvg),
    // 2026-11: Play and Compete merged into Play (trophy icon); Community
    // took the freed slot.
    (label: (l) => l.navPlay, svg: _playSvg),
    (label: (l) => l.navCommunity, svg: _communitySvg),
    (label: (l) => l.navDiscover, svg: _discoverSvg),
    // Learn took this slot from Profile in the 2026-09 redesign — profile
    // navigation moved into the app drawer (`DriftAppDrawer`).
    (label: (l) => l.navLearn, svg: _learnSvg),
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
                    label: _tabs[i].label(context.l10n),
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

/// Two people — a front figure and one behind it, same 1.7 outline.
const _communitySvg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<circle cx="8.5" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/>'
    '<path d="M2.5 18.5c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" '
    'stroke-width="1.7" stroke-linecap="round"/>'
    '<path d="M14 5.2a3.2 3.2 0 0 1 0 5.6M16.5 13c1.8.9 3 2.9 3 5.5" '
    'stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

const _playSvg =
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

/// Graduation cap — the mortarboard plus its tassel, drawn in the same 22px
/// 1.7-stroke outline style as the other four tabs.
const _learnSvg =
    '<svg width="22" height="22" viewBox="0 0 22 22" fill="none">'
    '<path d="M11 3.5L20 8l-9 4.5L2 8l9-4.5z" stroke="currentColor" '
    'stroke-width="1.7" stroke-linejoin="round"/>'
    '<path d="M5.5 10v4.6c0 .5.3 1 .8 1.2 1.3.7 3 1.2 4.7 1.2s3.4-.5 4.7-1.2c'
    '.5-.2.8-.7.8-1.2V10" stroke="currentColor" stroke-width="1.7" '
    'stroke-linecap="round" stroke-linejoin="round"/>'
    '<path d="M20 8v4.5" stroke="currentColor" stroke-width="1.7" '
    'stroke-linecap="round"/></svg>';
