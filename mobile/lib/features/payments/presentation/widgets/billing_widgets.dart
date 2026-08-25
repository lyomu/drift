import 'package:flutter/material.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_spacing.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/buttons/drift_button.dart';
import '../../../../shared/widgets/drift_card.dart';
import '../../../../shared/widgets/drift_status_badge.dart';
import '../../data/payments_repository.dart';

class BillingSandboxBanner extends StatelessWidget {
  const BillingSandboxBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        color: colors.warningSurface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.science_outlined, color: colors.warning),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Text(
              'Sandbox billing uses test currency and provider tokens. No real payment will be taken.',
              style: type.bodySmall.copyWith(color: colors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }
}

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
                const DriftStatusBadge(
                  label: 'Current',
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
                ? 'Current plan'
                : loading
                ? 'Processing…'
                : plan.isFree
                ? 'Choose Free'
                : 'Select and pay',
            onPressed: current || loading ? null : onSelect,
          ),
        ],
      ),
    );
  }
}

class BillingLoadError extends StatelessWidget {
  const BillingLoadError({super.key, required this.message, required this.retry});

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
          label: 'Retry',
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

String billingDate(DateTime date) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${date.day} ${months[date.month - 1]} ${date.year}';
}
