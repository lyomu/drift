import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../auth/data/auth_repository.dart';
import '../application/payments_providers.dart';
import '../data/payments_repository.dart';
import 'widgets/billing_widgets.dart';

class PlanSelectionScreen extends ConsumerStatefulWidget {
  const PlanSelectionScreen({super.key});

  @override
  ConsumerState<PlanSelectionScreen> createState() =>
      _PlanSelectionScreenState();
}

class _PlanSelectionScreenState extends ConsumerState<PlanSelectionScreen> {
  String? _processingPlanId;
  String? _error;

  Future<void> _select(PaymentPlan plan, BillingSummary summary) async {
    if (!plan.isFree && summary.paymentMethods.isEmpty) {
      await context.push(
        Uri(
          path: '/settings/payment-methods',
          queryParameters: {'planId': plan.id},
        ).toString(),
      );
      ref.invalidate(billingSummaryProvider);
      return;
    }

    setState(() {
      _processingPlanId = plan.id;
      _error = null;
    });
    try {
      await ref.read(paymentsRepositoryProvider).changeSubscription(plan.id);
      ref.invalidate(billingSummaryProvider);
      ref.invalidate(billingHistoryProvider);
      if (mounted) context.go('/settings/subscription');
    } on AuthException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _processingPlanId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final plans = ref.watch(paymentPlansProvider);
    final summary = ref.watch(billingSummaryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Choose a plan')),
      body: SafeArea(
        child: switch ((plans, summary)) {
          (AsyncData(value: final planList), AsyncData(value: final billing)) =>
            RefreshIndicator(
              onRefresh: () async {
                await Future.wait([
                  ref.refresh(paymentPlansProvider.future),
                  ref.refresh(billingSummaryProvider.future),
                ]);
              },
              child: ListView(
                padding: const EdgeInsets.all(DriftSpacing.s5),
                children: [
                  if (planList.any((plan) => plan.isTest)) ...[
                    const BillingSandboxBanner(),
                    const SizedBox(height: DriftSpacing.s5),
                  ],
                  if (_error != null) ...[
                    _PaymentError(
                      message: _error!,
                      onAddMethod: () =>
                          context.push('/settings/payment-methods'),
                    ),
                    const SizedBox(height: DriftSpacing.s4),
                  ],
                  for (var index = 0; index < planList.length; index++) ...[
                    PaymentPlanCard(
                      plan: planList[index],
                      current:
                          billing.subscription.plan.id == planList[index].id,
                      loading: _processingPlanId == planList[index].id,
                      onSelect: () => _select(planList[index], billing),
                    ),
                    if (index < planList.length - 1)
                      const SizedBox(height: DriftSpacing.s4),
                  ],
                ],
              ),
            ),
          (AsyncError(), _) || (_, AsyncError()) => BillingLoadError(
              message: "Couldn't load available plans.",
              retry: () {
                ref.invalidate(paymentPlansProvider);
                ref.invalidate(billingSummaryProvider);
              },
            ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _PaymentError extends StatelessWidget {
  const _PaymentError({required this.message, required this.onAddMethod});
  final String message;
  final VoidCallback onAddMethod;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        color: colors.errorSurface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.warning_amber_outlined, color: colors.error),
              const SizedBox(width: DriftSpacing.s2),
              Expanded(child: Text(message)),
            ],
          ),
          TextButton(
            onPressed: onAddMethod,
            child: const Text('Manage payment methods'),
          ),
        ],
      ),
    );
  }
}
