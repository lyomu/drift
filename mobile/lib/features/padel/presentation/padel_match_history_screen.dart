import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_match_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_recent_form.dart';
import '../../users/application/current_user_provider.dart';
import '../application/padel_providers.dart';

/// Padel Match History & Stats — `foundation/04-screen-inventory.md` §A.10.
/// Reuses `DriftMatchCard`/`DriftRecentForm` as-is, sport-scoped — same
/// discipline as Own Profile (M12) reusing `RatingsStatsScreen`.
class PadelMatchHistoryScreen extends ConsumerWidget {
  const PadelMatchHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = ref.watch(padelMatchHistoryProvider);
    final stats = ref.watch(padelStatsProvider);
    final viewer = ref.watch(currentUserProvider).valueOrNull;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftScaffold(
      title: 'Padel Match History',
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(padelMatchHistoryProvider);
          ref.invalidate(padelStatsProvider);
          await ref.read(padelMatchHistoryProvider.future);
        },
        child: switch (matches) {
          AsyncData(:final value) => ListView(
            padding: const EdgeInsets.all(DriftSpacing.s4),
            children: [
              if (stats.valueOrNull != null) ...[
                DriftCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Your Padel stats', style: type.h4),
                      const SizedBox(height: DriftSpacing.s2),
                      DriftRecentForm(results: stats.value!.recentForm),
                    ],
                  ),
                ),
                const SizedBox(height: DriftSpacing.s4),
              ],
              if (value.isEmpty)
                const _EmptyState()
              else
                for (final match in value)
                  Padding(
                    padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                    child: DriftMatchCard(
                      match: match,
                      viewerId: viewer?.id ?? '',
                      onTap: () => context.push('/matches/${match.id}'),
                    ),
                  ),
            ],
          ),
          AsyncError() => const Center(
            child: Text("Couldn't load your Padel match history."),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Padding(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        children: [
          const SizedBox(height: DriftSpacing.s12),
          Text(
            'Play your first Padel match to start building history',
            style: type.body,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
