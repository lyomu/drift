import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import 'league_list_screen.dart';

/// Compete Hub — `foundation/04-screen-inventory.md` §A.5, segmented
/// Leagues / Ladders / Tournaments / Events. Only Leagues is real this
/// phase (Phase M8) — the P0 roadmap scope is "leagues, seasons, rounds,
/// standings"; Ladders/Tournaments/Events are P1 and would mean inventing
/// a bracket/ladder-challenge algorithm nothing in the foundation docs
/// specifies. Same shape of cut as M7 deferring Achievements.
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
