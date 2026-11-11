import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/swing_check_providers.dart';
import 'swing_metric_format.dart';

/// Past Swing Check sessions, newest first.
class SwingCheckHistoryScreen extends ConsumerWidget {
  const SwingCheckHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final history = ref.watch(swingHistoryProvider);
    final dateFormat = DateFormat.yMMMd(context.localeTag).add_Hm();

    return DriftScaffold(
      title: l10n.swingHistory,
      body: history.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(DriftSpacing.s6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(l10n.swingLoadFailed, textAlign: TextAlign.center),
                const SizedBox(height: DriftSpacing.s4),
                DriftButton(
                  label: l10n.commonRetry,
                  onPressed: () => ref.invalidate(swingHistoryProvider),
                ),
              ],
            ),
          ),
        ),
        data: (sessions) => sessions.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(DriftSpacing.s6),
                  child: Text(
                    l10n.swingHistoryEmpty,
                    textAlign: TextAlign.center,
                    style: type.body.copyWith(color: colors.textSecondary),
                  ),
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                itemCount: sessions.length,
                separatorBuilder: (_, __) => Divider(color: colors.border, height: 1),
                itemBuilder: (context, i) {
                  final session = sessions[i];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      SwingMetricFormat.stroke(l10n, session.stroke),
                      style: type.subtitle,
                    ),
                    subtitle: Text(
                      '${dateFormat.format(session.createdAt.toLocal())} · '
                      '${l10n.swingMeasuredOf(session.swingsMeasured, session.swingsDetected)}',
                      style: type.bodySmall.copyWith(color: colors.textSecondary),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/swing-check/${session.id}'),
                  );
                },
              ),
      ),
    );
  }
}
