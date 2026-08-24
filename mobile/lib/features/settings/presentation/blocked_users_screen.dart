import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../auth/data/auth_repository.dart';
import '../../safety/data/safety_repository.dart';
import '../application/settings_providers.dart';

/// Blocked Users — `foundation/04-screen-inventory.md` §A.10. No new
/// backend surface — reuses `SafetyService.listBlocks`/`unblock`, both real
/// since M5.
class BlockedUsersScreen extends ConsumerWidget {
  const BlockedUsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blocks = ref.watch(blockedUsersProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Blocked Users')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(blockedUsersProvider.future),
          child: switch (blocks) {
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
                                "You haven't blocked anyone.",
                                style: type.body,
                                textAlign: TextAlign.center,
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
                      itemBuilder: (context, index) {
                        final blocked = value[index];
                        return DriftPlayerCard(
                          player: blocked.player,
                          trailing: _UnblockButton(playerId: blocked.player.id),
                        );
                      },
                    ),
            AsyncError() => Center(
              child: Text(
                "Couldn't load your blocked users.",
                style: type.body,
              ),
            ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _UnblockButton extends ConsumerStatefulWidget {
  const _UnblockButton({required this.playerId});

  final String playerId;

  @override
  ConsumerState<_UnblockButton> createState() => _UnblockButtonState();
}

class _UnblockButtonState extends ConsumerState<_UnblockButton> {
  bool _isSubmitting = false;

  Future<void> _unblock() async {
    setState(() => _isSubmitting = true);
    try {
      await ref.read(safetyRepositoryProvider).unblock(widget.playerId);
      ref.invalidate(blockedUsersProvider);
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DriftButton(
      label: _isSubmitting ? 'Unblocking…' : 'Unblock',
      variant: DriftButtonVariant.text,
      onPressed: _isSubmitting ? null : _unblock,
    );
  }
}
