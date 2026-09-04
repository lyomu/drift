import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import 'ladder_list_screen.dart';
import 'league_list_screen.dart';
import 'tournament_list_screen.dart';

/// Compete Hub — `foundation/04-screen-inventory.md` A5 (redesign 2026-08).
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
        const SizedBox(height: 12),
        Expanded(
          child: Container(
            color: colors.background,
            child: switch (_segment) {
              0 => const LeagueListScreen(embedded: true),
              1 => const LadderListScreen(embedded: true),
              2 => const TournamentListScreen(embedded: true),
              _ => const _EventsComingSoon(),
            },
          ),
        ),
      ],
    );
  }
}

class _EventsComingSoon extends StatelessWidget {
  const _EventsComingSoon();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(32, 0, 32, 60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: colors.primaryLight,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.calendar_month_outlined,
                size: 30,
                color: colors.primary,
              ),
            ),
            const SizedBox(height: 14),
            Text('Events coming soon', style: type.h4),
            const SizedBox(height: 6),
            Text(
              'Club events and tournaments will appear here once available '
              'in your area.',
              textAlign: TextAlign.center,
              style: type.body.copyWith(color: colors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
