import 'package:flutter/material.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../clubs/presentation/club_list_screen.dart';
import '../../courts/presentation/court_finder_hub_screen.dart';
import '../../players/presentation/player_search_screen.dart';

/// Discover Hub — `foundation/02-information-architecture.md` §1.3,
/// segmented Players / Courts / Clubs. Coach discovery is excluded
/// entirely (not shown as a "coming later" segment, unlike Compete Hub's
/// Ladders/Tournaments/Events) — Coaches needs the Club Admin app before
/// there's anything to discover, a different kind of "later" than the
/// genuinely-next items Compete Hub previews. Deliberate IA deviation,
/// documented in PROGRESS.md's M9 entry.
class DiscoverHubScreen extends StatefulWidget {
  const DiscoverHubScreen({super.key});

  @override
  State<DiscoverHubScreen> createState() => _DiscoverHubScreenState();
}

class _DiscoverHubScreenState extends State<DiscoverHubScreen> {
  int _segment = 0;

  static const _labels = ['Players', 'Courts', 'Clubs'];

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s3,
            ),
            child: Text('Discover', style: type.display),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DriftSpacing.s4),
            child: SegmentedButton<int>(
              segments: [
                for (var i = 0; i < _labels.length; i++)
                  ButtonSegment(value: i, label: Text(_labels[i])),
              ],
              selected: {_segment},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _segment = s.first),
            ),
          ),
          const SizedBox(height: DriftSpacing.s3),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    return switch (_segment) {
      0 => const PlayerSearchScreen(embedded: true),
      1 => const CourtFinderHubScreen(embedded: true),
      _ => const ClubListScreen(embedded: true),
    };
  }
}
