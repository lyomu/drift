import 'package:flutter/material.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';

/// Drift Tennis is in beta and nothing is charged, so this screen only says so.
/// The plans, payment-methods and billing-history screens still exist but are
/// not linked from here until billing starts.
class SubscriptionPlanScreen extends StatelessWidget {
  const SubscriptionPlanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return DriftScaffold(
      title: context.l10n.settingsSubscriptionPlan,
      body: ListView(
        padding: const EdgeInsets.all(DriftSpacing.s5),
        children: [
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colors.primary.withValues(alpha: 0.14),
                  ),
                  child: Icon(
                    Icons.auto_awesome_rounded,
                    size: 30,
                    color: colors.primary,
                  ),
                ),
                const SizedBox(height: DriftSpacing.s4),
                Text(
                  context.l10n.payBetaTitle,
                  style: type.h2,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: DriftSpacing.s2),
                Text(
                  context.l10n.payBetaMessage,
                  style: type.body.copyWith(color: colors.textSecondary),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
