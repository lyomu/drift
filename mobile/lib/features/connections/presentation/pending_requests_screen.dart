import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../application/connections_providers.dart';
import '../data/connections_repository.dart';

/// Pending Requests — `foundation/04-screen-inventory.md` §A.4. Incoming
/// requests can be accepted or declined; outgoing ones can be cancelled.
class PendingRequestsScreen extends ConsumerStatefulWidget {
  const PendingRequestsScreen({super.key});

  @override
  ConsumerState<PendingRequestsScreen> createState() =>
      _PendingRequestsScreenState();
}

class _PendingRequestsScreenState extends ConsumerState<PendingRequestsScreen> {
  String? _busyId;

  Future<void> _act(String connectionId, Future<void> Function() action) async {
    setState(() => _busyId = connectionId);
    try {
      await action();
      ref.invalidate(pendingRequestsProvider);
      ref.invalidate(connectionsProvider);
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final pending = ref.watch(pendingRequestsProvider);
    final repo = ref.read(connectionsRepositoryProvider);

    return DriftScaffold(
      title: 'Requests',
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(pendingRequestsProvider.future),
        child: switch (pending) {
          AsyncData(:final value) =>
            value.incoming.isEmpty && value.outgoing.isEmpty
                ? const _EmptyRequests()
                : ListView(
                    padding: const EdgeInsets.all(DriftSpacing.s4),
                    children: [
                      if (value.incoming.isNotEmpty) ...[
                        Text('Incoming', style: type.h4),
                        const SizedBox(height: DriftSpacing.s3),
                        for (final entry in value.incoming)
                          Padding(
                            padding: const EdgeInsets.only(
                              bottom: DriftSpacing.s3,
                            ),
                            child: _RequestCard(
                              entry: entry,
                              isBusy: _busyId == entry.connectionId,
                              primaryLabel: 'Accept',
                              secondaryLabel: 'Decline',
                              onPrimary: () => _act(
                                entry.connectionId,
                                () => repo.accept(entry.connectionId),
                              ),
                              onSecondary: () => _act(
                                entry.connectionId,
                                () => repo.decline(entry.connectionId),
                              ),
                            ),
                          ),
                        const SizedBox(height: DriftSpacing.s4),
                      ],
                      if (value.outgoing.isNotEmpty) ...[
                        Text('Sent', style: type.h4),
                        const SizedBox(height: DriftSpacing.s3),
                        for (final entry in value.outgoing)
                          Padding(
                            padding: const EdgeInsets.only(
                              bottom: DriftSpacing.s3,
                            ),
                            child: _RequestCard(
                              entry: entry,
                              isBusy: _busyId == entry.connectionId,
                              secondaryLabel: 'Cancel request',
                              onSecondary: () => _act(
                                entry.connectionId,
                                () => repo.remove(entry.connectionId),
                              ),
                            ),
                          ),
                      ],
                    ],
                  ),
          AsyncError() => const Center(
            child: Text("Couldn't load your requests."),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.entry,
    required this.isBusy,
    required this.secondaryLabel,
    required this.onSecondary,
    this.primaryLabel,
    this.onPrimary,
  });

  final ConnectionEntry entry;
  final bool isBusy;
  final String secondaryLabel;
  final VoidCallback onSecondary;
  final String? primaryLabel;
  final VoidCallback? onPrimary;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DriftPlayerCard(
          player: entry.player,
          onTap: () => context.push('/players/${entry.player.id}'),
        ),
        const SizedBox(height: DriftSpacing.s2),
        Row(
          children: [
            if (primaryLabel != null) ...[
              Expanded(
                child: DriftButton(
                  label: isBusy ? 'Working…' : primaryLabel!,
                  onPressed: isBusy ? null : onPrimary,
                ),
              ),
              const SizedBox(width: DriftSpacing.s2),
            ],
            Expanded(
              child: DriftButton(
                label: secondaryLabel,
                variant: DriftButtonVariant.text,
                onPressed: isBusy ? null : onSecondary,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _EmptyRequests extends StatelessWidget {
  const _EmptyRequests();

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
              Text(
                'No pending requests',
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
