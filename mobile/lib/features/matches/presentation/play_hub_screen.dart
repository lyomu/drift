import 'package:flutter/material.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import '../../competitions/presentation/event_list_screen.dart';
import '../../competitions/presentation/ladder_list_screen.dart';
import '../../competitions/presentation/league_list_screen.dart';
import '../../competitions/presentation/tournament_list_screen.dart';
import '../application/matches_providers.dart';
import 'play/play_matches_tab.dart';

/// Play Hub (2026-11 restructure). The former Play and Compete tabs merged
/// into one: Matches / Leagues / Ladders / Tournaments / Events. The old
/// Play segments (Challenges / Active / History) are filter chips inside
/// Matches; Find moved to Discover → Find players. Compete's bottom-nav slot
/// went to Community.
class PlayHubScreen extends StatefulWidget {
  const PlayHubScreen({super.key, this.initialSegment, this.initialMatchFilter});

  /// Index into [PlaySegment.values].
  final int? initialSegment;
  final MatchSegment? initialMatchFilter;

  @override
  State<PlayHubScreen> createState() => _PlayHubScreenState();
}

/// The Play Hub's segments, in tab order. `wireValue` is the `?segment=`
/// deep-link value.
enum PlaySegment {
  matches('matches'),
  leagues('leagues'),
  ladders('ladders'),
  tournaments('tournaments'),
  events('events');

  const PlaySegment(this.wireValue);

  final String wireValue;
}

class _PlayHubScreenState extends State<PlayHubScreen> {
  late int _segment;

  @override
  void initState() {
    super.initState();
    _segment = widget.initialSegment ?? 0;
  }

  @override
  void didUpdateWidget(covariant PlayHubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSegment != widget.initialSegment &&
        widget.initialSegment != null) {
      setState(() => _segment = widget.initialSegment!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    // Title and the my-leagues button live in the shell's `DriftAppHeader`,
    // so this starts straight at the pill tabs.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 4),
        DriftPillTabs(
          labels: [
            context.l10n.playSegmentMatches,
            context.l10n.competeLeagues,
            context.l10n.competeLadders,
            context.l10n.competeTournaments,
            context.l10n.competeEvents,
          ],
          selected: _segment,
          onChanged: (i) => setState(() => _segment = i),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: Container(
            color: colors.background,
            child: switch (PlaySegment.values[_segment]) {
              PlaySegment.matches => PlayMatchesTab(
                initialFilter: widget.initialMatchFilter,
              ),
              PlaySegment.leagues => const LeagueListScreen(embedded: true),
              PlaySegment.ladders => const LadderListScreen(embedded: true),
              PlaySegment.tournaments => const TournamentListScreen(
                embedded: true,
              ),
              PlaySegment.events => const EventListScreen(),
            },
          ),
        ),
      ],
    );
  }
}
