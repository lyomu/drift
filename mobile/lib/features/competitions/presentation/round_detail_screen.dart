import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_match_card.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../users/application/current_user_provider.dart';
import '../application/competitions_providers.dart';
import '../data/competitions_repository.dart';
import '../../../core/l10n/l10n.dart';
import 'package:intl/intl.dart';

/// Round Detail — `foundation/04-screen-inventory.md` §A.5. The current
/// round's fixtures: opponent, deadline, tap through to the existing Match
/// Detail screen when a fixture's match exists (no separate Fixture Card
/// Detail screen — Round Detail's fixtures are 1:1 with matches once
/// opened, same reuse call M7 made folding Opponent Review into Match
/// Detail).
class RoundDetailScreen extends ConsumerWidget {
  const RoundDetailScreen({
    super.key,
    required this.seasonId,
    required this.roundId,
  });

  final String seasonId;
  final String roundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final round = ref.watch(
      roundProvider((seasonId: seasonId, roundId: roundId)),
    );
    final viewer = ref.watch(currentUserProvider).valueOrNull;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.competeRound,
      body: RefreshIndicator(
        onRefresh: () async {
          final params = (seasonId: seasonId, roundId: roundId);
          ref.invalidate(roundProvider(params));
          await ref.read(roundProvider(params).future);
        },
        child: switch (round) {
          AsyncData(:final value) => ListView(
            padding: const EdgeInsets.all(DriftSpacing.s5),
            children: [
              Text(context.l10n.competeRoundNumber(value.index), style: type.h2),
              const SizedBox(height: DriftSpacing.s1),
              Text(
                context.l10n.competeDeadline(
                  DateFormat.MMMd(context.localeTag)
                      .add_jm()
                      .format(value.deadline),
                ),
                style: type.bodySmall.copyWith(color: colors.textSecondary),
              ),
              const SizedBox(height: DriftSpacing.s4),
              for (final fixture in value.fixtures)
                Padding(
                  padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                  child: _FixtureTile(
                    fixture: fixture,
                    viewerId: viewer?.id ?? '',
                  ),
                ),
            ],
          ),
          AsyncError() => Center(
            child: Text(context.l10n.competeRoundUnavailable),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }

}

class _FixtureTile extends StatelessWidget {
  const _FixtureTile({required this.fixture, required this.viewerId});

  final Fixture fixture;
  final String viewerId;

  @override
  Widget build(BuildContext context) {
    if (fixture.isBye) {
      final type = Theme.of(context).extension<DriftTypography>()!;
      final colors = Theme.of(context).extension<DriftColors>()!;
      final isViewer = fixture.sideA.id == viewerId;
      return DriftCard(
        child: Row(
          children: [
            DriftPlayerAvatar(player: fixture.sideA, radius: 20),
            const SizedBox(width: DriftSpacing.s3),
            Expanded(
              child: Text(
                isViewer
                    ? context.l10n.competeByeThisRound
                    : '${fixture.sideA.displayName} — bye this round',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
            ),
          ],
        ),
      );
    }

    if (fixture.match != null) {
      return DriftMatchCard(
        match: fixture.match!,
        viewerId: viewerId,
        onTap: () => context.push('/matches/${fixture.match!.id}'),
      );
    }

    // Not yet opened — shouldn't happen for the current round, but render
    // something reasonable rather than nothing.
    return DriftCard(
      child: Row(
        children: [
          DriftPlayerAvatar(player: fixture.sideA, radius: 20),
          const SizedBox(width: DriftSpacing.s2),
          Text(context.l10n.commonVs),
          const SizedBox(width: DriftSpacing.s2),
          if (fixture.sideB != null)
            DriftPlayerAvatar(player: fixture.sideB!, radius: 20),
        ],
      ),
    );
  }
}
