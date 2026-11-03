import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_racket_icon.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../data/expansion_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Tournament bracket detail (Wave 6) — rounds top-down with fixture names,
/// winners bolded, and a Join action while registration is open.
class TournamentDetailScreen extends ConsumerWidget {
  const TournamentDetailScreen({super.key, required this.tournamentId});

  final String tournamentId;

  String _roundName(AppLocalizations l10n, int index, int totalRounds) {
    if (index == totalRounds) return l10n.competeFinal;
    if (index == totalRounds - 1) return l10n.competeSemiFinals;
    return l10n.competeRoundNumber(index);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(tournamentDetailProvider(tournamentId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.competeTournament,
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
                    label: context.l10n.competeJoinTournament,
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
                  Text(_roundName(context.l10n, round.index, totalRounds), style: type.h4),
                  const SizedBox(height: DriftSpacing.s2),
                  for (final f in round.fixtures)
                    Padding(
                      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              f.isBye
                                  ? context.l10n.competeByeFixture(
                                      f.sideAName ??
                                          f.sideBName ??
                                          context.l10n.competeBye,
                                    )
                                  : context.l10n.competeVsFixture(
                                      f.sideAName ?? '?',
                                      f.sideBName ?? '?',
                                    ),
                              style: type.body.copyWith(
                                fontWeight: f.winnerUserId != null
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                              ),
                            ),
                          ),
                          if (f.matchId != null)
                            DriftRacketIcon(
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
            context.l10n.competeTournamentUnavailable,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}
