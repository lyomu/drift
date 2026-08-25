import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../data/expansion_repository.dart';

/// Tournaments segment (Wave 6) — browse and open the bracket detail.
class TournamentListScreen extends ConsumerWidget {
  const TournamentListScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tournaments = ref.watch(tournamentsListProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final content = RefreshIndicator(
      onRefresh: () => ref.refresh(tournamentsListProvider.future),
      child: switch (tournaments) {
        AsyncData(:final value) =>
          value.isEmpty
              ? ListView(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(DriftSpacing.s6),
                      child: Column(
                        children: [
                          const SizedBox(height: DriftSpacing.s12),
                          Text(
                            'No tournaments yet — ask your club to run one.',
                            textAlign: TextAlign.center,
                            style: type.body
                                .copyWith(color: colors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(DriftSpacing.s4),
                  itemCount: value.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: DriftSpacing.s3),
                  itemBuilder: (context, i) {
                    final t = value[i];
                    return DriftCard(
                      onTap: () => context.push('/compete/tournaments/${t.id}'),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(t.name, style: type.title),
                                const SizedBox(height: DriftSpacing.s1),
                                Text(
                                  '${t.clubName} · ${t.entryCount}/${t.drawSize} slots',
                                  style: type.bodySmall.copyWith(
                                    color: colors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _StateChip(state: t.state),
                        ],
                      ),
                    );
                  },
                ),
        AsyncError() => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(DriftSpacing.s6),
                child: Text(
                  "Couldn't load tournaments.",
                  textAlign: TextAlign.center,
                  style: type.body,
                ),
              ),
            ],
          ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );

    if (embedded) return content;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(DriftSpacing.s4),
            child:
                Text('Tournaments', style: type.display),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }
}

class _StateChip extends StatelessWidget {
  const _StateChip({required this.state});
  final String state;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final color = switch (state) {
      'REGISTRATION_OPEN' => colors.success,
      'RUNNING' => colors.primary,
      'COMPLETED' => colors.textSecondary,
      _ => colors.textSecondary,
    };
    return Text(
      switch (state) {
        'REGISTRATION_OPEN' => 'Registration open',
        'RUNNING' => 'In progress',
        'COMPLETED' => 'Completed',
        _ => state,
      },
      style: TextStyle(color: color, fontSize: 12),
    );
  }
}
