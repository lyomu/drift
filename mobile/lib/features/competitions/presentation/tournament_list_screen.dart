import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../data/expansion_repository.dart';

/// Tournaments segment — browse and open the bracket detail.
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
        AsyncData(:final value) when value.isEmpty => _message(
          context,
          'No tournaments yet — ask your club to run one.',
        ),
        AsyncData(:final value) => ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          itemCount: value.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final t = value[i];
            return DriftSoftCard(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              onTap: () => context.push('/compete/tournaments/${t.id}'),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: colors.primaryLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.emoji_events_outlined,
                      size: 20,
                      color: colors.primary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.name,
                          style: type.body.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${t.clubName} · ${t.entryCount}/${t.drawSize} slots',
                          style: type.caption.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  DriftPill(label: _label(t.state), tone: _tone(t.state)),
                ],
              ),
            );
          },
        ),
        AsyncError() => _message(context, "Couldn't load tournaments."),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );

    if (embedded) return content;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Tournaments',
              style: type.h2.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }

  static String _label(String state) => switch (state) {
    'REGISTRATION_OPEN' => 'Open',
    'RUNNING' => 'In progress',
    'COMPLETED' => 'Completed',
    _ => state,
  };

  static DriftPillTone _tone(String state) => switch (state) {
    'REGISTRATION_OPEN' => DriftPillTone.success,
    'RUNNING' => DriftPillTone.warning,
    'COMPLETED' => DriftPillTone.neutral,
    _ => DriftPillTone.neutral,
  };

  Widget _message(BuildContext context, String text) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}
