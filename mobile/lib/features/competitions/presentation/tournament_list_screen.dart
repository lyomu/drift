import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_competition_card.dart';
import '../data/expansion_repository.dart';
import '../../../core/theme/drift_colors.dart';


/// Tournaments segment (redesign 2026-10).
///
/// "Spots left" is `drawSize - entryCount`, which is what the mock's number
/// means; at zero the card reads Full and the action goes flat, matching the
/// mock. A tournament that is running or completed is past entering, so its
/// action reflects the state rather than offering a place that is not there.
class TournamentListScreen extends ConsumerWidget {
  const TournamentListScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final tournaments = ref.watch(tournamentsListProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    final content = RefreshIndicator(
      onRefresh: () => ref.refresh(tournamentsListProvider.future),
      child: switch (tournaments) {
        AsyncData(:final value) when value.isEmpty => _message(
          'No tournaments yet. Ask your club to run one.',
          colors,
        ),
        AsyncData(:final value) => ListView.separated(
          padding: EdgeInsets.fromLTRB(16, 12, 16, 24),
          itemCount: value.length,
          separatorBuilder: (_, _) => SizedBox(height: 10),
          itemBuilder: (context, i) =>
              _TournamentCard(tournament: value[i], index: i),
        ),
        AsyncError() => _message("Couldn't load tournaments.", colors),
        _ => Center(child: CircularProgressIndicator()),
      },
    );

    if (embedded) return content;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Text('Tournaments', style: type.h2),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }

  Widget _message(String text, DriftColors colors) {
    return ListView(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, height: 1.4, color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}

class _TournamentCard extends StatelessWidget {
  const _TournamentCard({required this.tournament, required this.index});

  final TournamentSummary tournament;
  final int index;

  static String _stateLabel(String state) => switch (state) {
    'REGISTRATION_OPEN' => 'Open',
    'RUNNING' => 'In progress',
    'COMPLETED' => 'Completed',
    _ => state,
  };

  @override
  Widget build(BuildContext context) {
    final accent = driftCompetitionAccent(index);
    final open = tournament.state == 'REGISTRATION_OPEN';
    final spotsLeft = (tournament.drawSize - tournament.entryCount)
        .clamp(0, tournament.drawSize);

    final (label, style) = switch ((open, spotsLeft)) {
      (true, > 0) => ('Enter', DriftCompetitionActionStyle.filled),
      (true, _) => ('Full', DriftCompetitionActionStyle.disabled),
      // Not open: the state is the answer, and there is nothing to enter.
      _ => (
        _stateLabel(tournament.state),
        DriftCompetitionActionStyle.disabled,
      ),
    };

    return DriftCompetitionCard(
      leading: DriftCompetitionIconTile(
        icon: Icons.military_tech_rounded,
        accent: accent,
      ),
      title: tournament.name,
      badge: _stateLabel(tournament.state),
      badgeAccent: accent,
      meta: open && spotsLeft > 0
          ? '$spotsLeft ${spotsLeft == 1 ? 'spot' : 'spots'} left'
          : null,
      details: [
        if (tournament.clubName.isNotEmpty)
          DriftCompetitionDetail(
            icon: Icons.location_on,
            label: tournament.clubName,
          ),
        DriftCompetitionDetail(
          icon: Icons.group,
          label: '${tournament.entryCount}/${tournament.drawSize} in the draw',
        ),
      ],
      action: DriftCompetitionActionButton(
        label: label,
        style: style,
        accent: accent,
        onTap: () => context.push('/compete/tournaments/${tournament.id}'),
      ),
      onTap: () => context.push('/compete/tournaments/${tournament.id}'),
    );
  }
}
