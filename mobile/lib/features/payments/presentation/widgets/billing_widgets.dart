import 'package:flutter/material.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_spacing.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/buttons/drift_button.dart';
import '../../../../shared/widgets/drift_card.dart';
import '../../../../shared/widgets/drift_status_badge.dart';
import '../../data/payments_repository.dart';
import '../../../../core/l10n/l10n.dart';
import 'package:intl/intl.dart';

class PaymentPlanCard extends StatelessWidget {
  const PaymentPlanCard({
    super.key,
    required this.plan,
    required this.current,
    required this.loading,
    required this.onSelect,
  });

  final PaymentPlan plan;
  final bool current;
  final bool loading;
  final VoidCallback? onSelect;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(plan.name, style: type.h3)),
              if (current)
                DriftStatusBadge(
                  label: context.l10n.payCurrent,
                  tone: DriftStatusTone.success,
                ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            plan.priceLabel,
            style: type.h2.copyWith(color: colors.primaryDark),
          ),
          if (plan.description != null) ...[
            const SizedBox(height: DriftSpacing.s2),
            Text(plan.description!, style: type.bodySmall),
          ],
          const SizedBox(height: DriftSpacing.s4),
          for (final entitlement in plan.entitlements)
            Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 18,
                    color: colors.success,
                  ),
                  const SizedBox(width: DriftSpacing.s2),
                  Expanded(child: Text(entitlement, style: type.body)),
                ],
              ),
            ),
          const SizedBox(height: DriftSpacing.s3),
          DriftButton(
            label: current
                ? context.l10n.payCurrentPlan
                : loading
                ? context.l10n.payProcessing
                : plan.isFree
                ? context.l10n.payChooseFree
                : context.l10n.paySelectAndPay,
            onPressed: current || loading ? null : onSelect,
          ),
        ],
      ),
    );
  }
}

class BillingLoadError extends StatelessWidget {
  const BillingLoadError({
    super.key,
    required this.message,
    required this.retry,
  });

  final String message;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        const SizedBox(height: DriftSpacing.s12),
        Text(message, textAlign: TextAlign.center),
        const SizedBox(height: DriftSpacing.s3),
        DriftButton(
          label: context.l10n.commonRetry,
          variant: DriftButtonVariant.text,
          onPressed: retry,
        ),
      ],
    );
  }
}

DriftStatusTone invoiceTone(InvoiceStatus status) => switch (status) {
  InvoiceStatus.paid => DriftStatusTone.success,
  InvoiceStatus.failed => DriftStatusTone.error,
  InvoiceStatus.open => DriftStatusTone.warning,
  InvoiceStatus.voided => DriftStatusTone.neutral,
};

String billingDate(DateTime date) =>
    DateFormat.yMMMd(localeTagNow).format(date);
