import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/connections_providers.dart';
import '../data/connections_repository.dart';

/// Connections List — `foundation/04-screen-inventory.md` §A.4.
class ConnectionsListScreen extends ConsumerWidget {
  const ConnectionsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connections = ref.watch(connectionsProvider);
    final pending = ref.watch(pendingRequestsProvider);
    final incomingCount = pending.valueOrNull?.incoming.length ?? 0;

    return DriftScaffold(
      title: 'Connections',
      trailing: _RequestsButton(
        count: incomingCount,
        onPressed: () => context.push('/connections/pending'),
      ),
      body: RefreshIndicator(
        onRefresh: () {
          ref.invalidate(pendingRequestsProvider);
          return ref.refresh(connectionsProvider.future);
        },
        child: switch (connections) {
          AsyncData(:final value) =>
            value.isEmpty ? const _EmptyConnections() : _List(entries: value),
          AsyncError() => const Center(
            child: Text("Couldn't load your connections."),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _RequestsButton extends StatelessWidget {
  const _RequestsButton({required this.count, required this.onPressed});

  final int count;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: 'Pending requests',
      icon: Badge(
        isLabelVisible: count > 0,
        label: Text('$count'),
        child: const Icon(Icons.person_add_alt_1_outlined),
      ),
    );
  }
}

class _List extends StatelessWidget {
  const _List({required this.entries});

  final List<ConnectionEntry> entries;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      itemCount: entries.length,
      separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s3),
      itemBuilder: (context, index) {
        final entry = entries[index];
        return DriftPlayerCard(
          player: entry.player,
          onTap: () => context.push('/players/${entry.player.id}'),
        );
      },
    );
  }
}

class _EmptyConnections extends StatelessWidget {
  const _EmptyConnections();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Icon(Icons.people_outline, size: 40, color: colors.textSecondary),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                'Connect with players to build your Tennis network',
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
