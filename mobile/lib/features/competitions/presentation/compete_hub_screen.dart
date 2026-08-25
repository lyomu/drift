import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import 'ladder_list_screen.dart';
import 'league_list_screen.dart';
import 'tournament_list_screen.dart';

/// Compete Hub — `foundation/04-screen-inventory.md` A5, segmented
/// Leagues / Ladders / Tournaments / Events. Leagues shipped in M8;
/// Ladders and Tournaments shipped in Wave 6. Events remain P1.
class CompeteHubScreen extends StatefulWidget {
  const CompeteHubScreen({super.key});

  @override
  State<CompeteHubScreen> createState() => _CompeteHubScreenState();
}

class _CompeteHubScreenState extends State<CompeteHubScreen> {
  int _segment = 0;

  static const _labels = ['Leagues', 'Ladders', 'Tournaments', 'Events'];

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
            child: Row(
              children: [
                Expanded(child: Text('Compete', style: type.display)),
                IconButton(
                  onPressed: () => context.push('/compete/my-seasons'),
                  icon: const Icon(Icons.event_note_outlined),
                  tooltip: 'My Seasons',
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DriftSpacing.s4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
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
          ),
          const SizedBox(height: DriftSpacing.s3),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    return switch (_segment) {
      0 => const LeagueListScreen(embedded: true),
      1 => const LadderListScreen(embedded: true),
      2 => const TournamentListScreen(embedded: true),
      _ => _ComingLater(label: _labels[_segment]),
    };
  }
}

class _ComingLater extends StatelessWidget {
  const _ComingLater({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: type.h2),
          const SizedBox(height: DriftSpacing.s2),
          const Text('Coming in a later phase'),
        ],
      ),
    );
  }
}
