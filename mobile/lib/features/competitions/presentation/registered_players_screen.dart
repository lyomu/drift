import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/competitions_providers.dart';
import '../data/competitions_repository.dart';

/// Registered Players List — `foundation/04-screen-inventory.md` §A.5
/// (redesign 2026-08).
class RegisteredPlayersScreen extends ConsumerWidget {
  const RegisteredPlayersScreen({super.key, required this.seasonId});

  final String seasonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final players = ref.watch(registeredPlayersProvider(seasonId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Registered Players'),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(registeredPlayersProvider(seasonId));
                  await ref.read(registeredPlayersProvider(seasonId).future);
                },
                child: switch (players) {
                  AsyncData(:final value) when value.isEmpty => ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
                        child: Text(
                          'No one has registered yet.',
                          textAlign: TextAlign.center,
                          style: type.body.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  AsyncData(:final value) => ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    itemCount: value.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final entry = value[index];
                      return DriftSoftCard(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        onTap: () =>
                            context.push('/players/${entry.player.id}'),
                        child: Row(
                          children: [
                            DriftPlayerAvatar(player: entry.player, radius: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                entry.player.displayName,
                                style: type.title.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            if (entry.status ==
                                SeasonRegistrationStatus.waitlisted)
                              const DriftPill(
                                label: 'Waitlist',
                                tone: DriftPillTone.warning,
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                  AsyncError() => const Center(
                    child: Text("Couldn't load players."),
                  ),
                  _ => const Center(child: CircularProgressIndicator()),
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
