import 'package:flutter/material.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_soft_card.dart';

/// Compact placeholder shown in a Home section that has no content yet —
/// a muted line plus an optional prompt to go get some.
class HomeEmptyState extends StatelessWidget {
  const HomeEmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftSoftCard(
      onTap: onAction,
      child: Row(
        children: [
          Icon(icon, size: 20, color: colors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: type.body.copyWith(color: colors.textSecondary),
            ),
          ),
          if (actionLabel != null) ...[
            const SizedBox(width: 8),
            Text(
              actionLabel!,
              style: type.label.copyWith(
                color: colors.primaryDark,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
