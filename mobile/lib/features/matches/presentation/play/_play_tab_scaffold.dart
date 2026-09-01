import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../data/matches_repository.dart';

/// Shared list body for the Play → Challenges / Active / History tabs:
/// pull-to-refresh, loading / error / empty states, and 16px padding.
class PlayTabScaffold extends StatelessWidget {
  const PlayTabScaffold({
    super.key,
    required this.onRefresh,
    required this.state,
    required this.emptyIcon,
    required this.emptyMessage,
    required this.onRetry,
    required this.itemBuilder,
    this.header,
    this.itemSpacing = 8,
  });

  final Future<void> Function() onRefresh;
  final AsyncValue<List<DriftMatch>> state;
  final IconData emptyIcon;
  final String emptyMessage;
  final VoidCallback onRetry;
  final Widget Function(DriftMatch match) itemBuilder;
  final Widget? header;
  final double itemSpacing;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: switch (state) {
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          children: [
            if (header != null) ...[header!, const SizedBox(height: 10)],
            if (value.isEmpty)
              _Empty(icon: emptyIcon, message: emptyMessage)
            else
              for (var i = 0; i < value.length; i++) ...[
                if (i > 0) SizedBox(height: itemSpacing),
                itemBuilder(value[i]),
              ],
          ],
        ),
        AsyncError() => _ErrorState(onRetry: onRetry),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 64, 8, 24),
      child: Column(
        children: [
          Icon(icon, size: 40, color: colors.textSecondary),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Column(
            children: [
              Text(
                "Couldn't load your matches.",
                textAlign: TextAlign.center,
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              const SizedBox(height: 12),
              TextButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          ),
        ),
      ],
    );
  }
}
