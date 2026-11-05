import 'package:flutter/material.dart';

import '../../../shared/widgets/drift_pill_tabs.dart';
import '../../clubs/presentation/club_list_screen.dart';
import '../../coaches/presentation/coach_list_screen.dart';
import '../../courts/presentation/court_finder_hub_screen.dart';
import '../../players/presentation/player_search_screen.dart';
import '../../../core/l10n/l10n.dart';

/// Discover Hub — `foundation/02-information-architecture.md` §1.3,
/// segmented Find players / Courts / Clubs / Coaches (redesign 2026-08:
/// `App.tsx` `DiscoverScreen`; "Players" became "Find players" when the old
/// Play → Find tab merged into it, 2026-11).
class DiscoverHubScreen extends StatefulWidget {
  const DiscoverHubScreen({super.key, this.initialSegment});

  final int? initialSegment;

  @override
  State<DiscoverHubScreen> createState() => _DiscoverHubScreenState();
}

class _DiscoverHubScreenState extends State<DiscoverHubScreen> {
  late int _segment;


  @override
  void initState() {
    super.initState();
    _segment = widget.initialSegment ?? 0;
  }

  @override
  void didUpdateWidget(covariant DiscoverHubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSegment != widget.initialSegment &&
        widget.initialSegment != null) {
      setState(() => _segment = widget.initialSegment!);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Title lives in the shell's `DriftAppHeader` now (2026-09 redesign), so
    // this starts straight at the pill tabs.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 4),
        DriftPillTabs(
          labels: [
            context.l10n.discoverFindPlayers,
            context.l10n.discoverCourts,
            context.l10n.discoverClubs,
            context.l10n.discoverCoaches,
          ],
          selected: _segment,
          onChanged: (i) => setState(() => _segment = i),
        ),
        const SizedBox(height: 12),
        Expanded(child: _body()),
      ],
    );
  }

  Widget _body() {
    return switch (_segment) {
      0 => const PlayerSearchScreen(embedded: true),
      1 => const CourtFinderHubScreen(embedded: true),
      2 => const ClubListScreen(embedded: true),
      _ => const CoachListScreen(embedded: true),
    };
  }
}
