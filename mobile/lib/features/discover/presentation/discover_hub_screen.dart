import 'package:flutter/material.dart';

import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import '../../clubs/presentation/club_list_screen.dart';
import '../../coaches/presentation/coach_list_screen.dart';
import '../../courts/presentation/court_finder_hub_screen.dart';
import '../../players/presentation/player_search_screen.dart';

/// Discover Hub — `foundation/02-information-architecture.md` §1.3,
/// segmented Players / Courts / Clubs / Coaches (redesign 2026-08:
/// `App.tsx` `DiscoverScreen`).
class DiscoverHubScreen extends StatefulWidget {
  const DiscoverHubScreen({super.key, this.initialSegment});

  final int? initialSegment;

  @override
  State<DiscoverHubScreen> createState() => _DiscoverHubScreenState();
}

class _DiscoverHubScreenState extends State<DiscoverHubScreen> {
  late int _segment;

  static const _labels = ['Players', 'Courts', 'Clubs', 'Coaches'];

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
    final type = Theme.of(context).extension<DriftTypography>()!;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Text(
              'Discover',
              style: type.h2.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          DriftPillTabs(
            labels: _labels,
            selected: _segment,
            onChanged: (i) => setState(() => _segment = i),
          ),
          const SizedBox(height: 12),
          Expanded(child: _body()),
        ],
      ),
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
