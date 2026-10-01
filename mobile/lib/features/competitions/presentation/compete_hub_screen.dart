import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import 'event_list_screen.dart';
import 'ladder_list_screen.dart';
import 'league_list_screen.dart';
import 'tournament_list_screen.dart';

/// Compete Hub — `foundation/04-screen-inventory.md` A5 (redesign 2026-10).
/// Pill tabs: Leagues / Ladders / Tournaments / Events.
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
    final colors = Theme.of(context).extension<DriftColors>()!;

    // Title and the my-leagues button live in the shell's `DriftAppHeader`
    // now (2026-09 redesign), so this starts straight at the pill tabs.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 4),
        DriftPillTabs(
          labels: _labels,
          selected: _segment,
          onChanged: (i) => setState(() => _segment = i),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: Container(
            color: colors.background,
            child: switch (_segment) {
              0 => const LeagueListScreen(embedded: true),
              1 => const LadderListScreen(embedded: true),
              2 => const TournamentListScreen(embedded: true),
              _ => const EventListScreen(),
            },
          ),
        ),
      ],
    );
  }
}
