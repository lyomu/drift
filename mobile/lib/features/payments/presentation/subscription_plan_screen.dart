import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../application/payments_providers.dart';
import '../data/payments_repository.dart';
import 'widgets/billing_widgets.dart';
import '../../../core/l10n/l10n.dart';

class SubscriptionPlanScreen extends ConsumerWidget {
  const SubscriptionPlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(billingSummaryProvider);
    return DriftScaffold(
      title: context.l10n.settingsSubscriptionPlan,
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(billingSummaryProvider.future),
        child: switch (summary) {
          AsyncData(:final value) => _SubscriptionBody(summary: value),
          AsyncError() => BillingLoadError(
            message: context.l10n.paySubscriptionFailed,
            retry: () => ref.invalidate(billingSummaryProvider),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _SubscriptionBody extends StatelessWidget {
  const _SubscriptionBody({required this.summary});
  final BillingSummary summary;

  @override
  Widget build(BuildContext context) {
    final subscription = summary.subscription;
    final plan = subscription.plan;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      summary.betaFree ? context.l10n.payFreeBeta : plan.name,
                      style: type.h2,
                    ),
                  ),
                  DriftStatusBadge(
                    label: subscription.status.label,
                    tone: subscription.status == BillingStatus.active
                        ? DriftStatusTone.success
                        : DriftStatusTone.warning,
                  ),
                ],
              ),
              if (!summary.betaFree) ...[
                const SizedBox(height: DriftSpacing.s2),
                Text(
                  plan.priceLabel,
                  style: type.statistics.copyWith(color: colors.primaryDark),
                ),
              ],
              const SizedBox(height: DriftSpacing.s2),
              Text(
                summary.betaFree
                    ? context.l10n.payNoChargesBeta
                    : context.l10n.payPeriodEnds(
                        billingDate(subscription.currentPeriodEnd),
                      ),
                style: type.bodySmall,
              ),
              if (!summary.betaFree) ...[
                const SizedBox(height: DriftSpacing.s5),
                DriftButton(
                  label: plan.isFree
                      ? context.l10n.payUpgradePlan
                      : context.l10n.payChangePlan,
                  onPressed: () => context.push('/settings/subscription/plans'),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s6),
        Text(context.l10n.payIncluded, style: type.h4),
        const SizedBox(height: DriftSpacing.s3),
        for (final entitlement in plan.entitlements)
          Padding(
            padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
            child: Row(
              children: [
                Icon(Icons.check_circle_outline, color: colors.success),
                const SizedBox(width: DriftSpacing.s2),
                Expanded(child: Text(entitlement, style: type.body)),
              ],
            ),
          ),
        if (!summary.betaFree) ...[
          const SizedBox(height: DriftSpacing.s6),
          DriftCard(
            onTap: () => context.push('/settings/payment-methods'),
            child: _BillingLink(
              icon: Icons.credit_card_outlined,
              title: context.l10n.payPaymentMethods,
              detail: summary.paymentMethods.isEmpty
                  ? context.l10n.payNoMethod
                  : summary.paymentMethods.first.label,
            ),
          ),
          const SizedBox(height: DriftSpacing.s3),
          DriftCard(
            onTap: () => context.push('/settings/billing-history'),
            child: _BillingLink(
              icon: Icons.receipt_long_outlined,
              title: context.l10n.payBillingHistory,
              detail: context.l10n.payChargesReceipts,
            ),
          ),
        ],
      ],
    );
  }
}

class _BillingLink extends StatelessWidget {
  const _BillingLink({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Row(
      children: [
        Icon(icon, color: colors.primary),
        const SizedBox(width: DriftSpacing.s3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: type.title),
              Text(detail, style: type.bodySmall),
            ],
          ),
        ),
        Icon(Icons.chevron_right, color: colors.textSecondary),
      ],
    );
  }
}
