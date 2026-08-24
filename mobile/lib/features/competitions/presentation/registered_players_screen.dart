import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../application/competitions_providers.dart';
import '../data/competitions_repository.dart';

/// Registered Players List — `foundation/04-screen-inventory.md` §A.5.
class RegisteredPlayersScreen extends ConsumerWidget {
  const RegisteredPlayersScreen({super.key, required this.seasonId});

  final String seasonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final players = ref.watch(registeredPlayersProvider(seasonId));

    return Scaffold(
      appBar: AppBar(title: const Text('Registered Players')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(registeredPlayersProvider(seasonId));
            await ref.read(registeredPlayersProvider(seasonId).future);
          },
          child: switch (players) {
            AsyncData(:final value) =>
              value.isEmpty
                  ? const _EmptyState()
                  : ListView.separated(
                      padding: const EdgeInsets.all(DriftSpacing.s4),
                      itemCount: value.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: DriftSpacing.s3),
                      itemBuilder: (context, index) {
                        final entry = value[index];
                        return DriftPlayerCard(
                          player: entry.player,
                          onTap: () =>
                              context.push('/players/${entry.player.id}'),
                          trailing:
                              entry.status ==
                                  SeasonRegistrationStatus.waitlisted
                              ? const _WaitlistTag()
                              : null,
                        );
                      },
                    ),
            AsyncError() => const Center(child: Text("Couldn't load players.")),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _WaitlistTag extends StatelessWidget {
  const _WaitlistTag();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Text(
      'Waitlist',
      style: type.caption.copyWith(color: colors.warning),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    // A ListView, not a Center, so pull-to-refresh keeps working from the
    // empty state too.
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Text(
                'No one has registered yet.',
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
