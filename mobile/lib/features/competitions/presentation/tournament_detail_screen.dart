import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../data/expansion_repository.dart';

/// Tournament bracket detail (Wave 6) — rounds top-down with fixture names,
/// winners bolded, and a Join action while registration is open.
class TournamentDetailScreen extends ConsumerWidget {
  const TournamentDetailScreen({super.key, required this.tournamentId});

  final String tournamentId;

  String _roundName(int index, int totalRounds) {
    if (index == totalRounds) return 'Final';
    if (index == totalRounds - 1) return 'Semi-finals';
    return 'Round $index';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(tournamentDetailProvider(tournamentId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Tournament',
      body: switch (detail) {
        AsyncData(:final value) => Builder(
          builder: (context) {
            final t = value.tournament;
            final totalRounds = value.rounds.length;
            final canJoin =
                t.state == 'REGISTRATION_OPEN' && t.entryCount < t.drawSize;

            return ListView(
              padding: const EdgeInsets.all(DriftSpacing.s5),
              children: [
                Text(t.name, style: type.h2),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  '${t.clubName} · ${t.entryCount}/${t.drawSize} slots · ${t.state}',
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
                const SizedBox(height: DriftSpacing.s4),
                if (canJoin)
                  DriftButton(
                    label: 'Join tournament',
                    onPressed: () async {
                      final dio = ref.read(dioClientProvider);
                      try {
                        await dio.post('/tournaments/${t.id}/entries');
                        ref.invalidate(tournamentDetailProvider(t.id));
                      } catch (_) {}
                    },
                  ),
                if (canJoin) const SizedBox(height: DriftSpacing.s4),
                for (final round in value.rounds) ...[
                  Text(_roundName(round.index, totalRounds), style: type.h4),
                  const SizedBox(height: DriftSpacing.s2),
                  for (final f in round.fixtures)
                    Padding(
                      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              f.isBye
                                  ? '${f.sideAName ?? f.sideBName ?? "Bye"} — bye'
                                  : '${f.sideAName ?? "?"} vs ${f.sideBName ?? "?"}',
                              style: type.body.copyWith(
                                fontWeight: f.winnerUserId != null
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                              ),
                            ),
                          ),
                          if (f.matchId != null)
                            Icon(
                              Icons.sports_tennis,
                              size: 16,
                              color: colors.textSecondary,
                            ),
                        ],
                      ),
                    ),
                  const SizedBox(height: DriftSpacing.s4),
                ],
              ],
            );
          },
        ),
        AsyncError() => Center(
          child: Text(
            'Tournament not available.',
            style: type.body.copyWith(color: colors.textSecondary),
          ),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}
