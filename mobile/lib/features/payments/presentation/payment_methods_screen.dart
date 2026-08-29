import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../application/payments_providers.dart';
import '../data/payments_repository.dart';
import 'widgets/billing_widgets.dart';

class PaymentMethodsScreen extends ConsumerStatefulWidget {
  const PaymentMethodsScreen({super.key, this.pendingPlanId});
  final String? pendingPlanId;

  @override
  ConsumerState<PaymentMethodsScreen> createState() =>
      _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends ConsumerState<PaymentMethodsScreen> {
  bool _saving = false;
  String? _paymentError;
  String? _retryMethodId;

  Future<void> _add() async {
    final draft = await showModalBottomSheet<_PaymentMethodDraft>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _AddPaymentMethodSheet(),
    );
    if (draft == null || !mounted) return;

    setState(() {
      _saving = true;
      _paymentError = null;
    });
    try {
      final method = await ref
          .read(paymentsRepositoryProvider)
          .addMethod(kind: draft.kind, last4: draft.last4, brand: draft.brand);
      ref.invalidate(paymentMethodsProvider);
      ref.invalidate(billingSummaryProvider);
      if (widget.pendingPlanId != null) {
        _retryMethodId = method.id;
        await ref
            .read(paymentsRepositoryProvider)
            .changeSubscription(
              widget.pendingPlanId!,
              paymentMethodId: method.id,
            );
        ref.invalidate(billingSummaryProvider);
        ref.invalidate(billingHistoryProvider);
        if (mounted) context.go('/settings/subscription');
      }
    } on AuthException catch (error) {
      if (mounted) setState(() => _paymentError = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _retryPayment() async {
    if (widget.pendingPlanId == null || _retryMethodId == null) return;
    setState(() {
      _saving = true;
      _paymentError = null;
    });
    try {
      await ref
          .read(paymentsRepositoryProvider)
          .changeSubscription(
            widget.pendingPlanId!,
            paymentMethodId: _retryMethodId,
          );
      ref.invalidate(billingSummaryProvider);
      ref.invalidate(billingHistoryProvider);
      if (mounted) context.go('/settings/subscription');
    } on AuthException catch (error) {
      if (mounted) setState(() => _paymentError = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _remove(SavedPaymentMethod method) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove payment method?'),
        content: Text(
          '${method.label} will no longer be available for charges.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(paymentsRepositoryProvider).removeMethod(method.id);
      ref.invalidate(paymentMethodsProvider);
      ref.invalidate(billingSummaryProvider);
    } on AuthException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final methods = ref.watch(paymentMethodsProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    return DriftScaffold(
      title: 'Payment methods',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _saving ? null : _add,
        icon: const Icon(Icons.add_card_outlined),
        label: Text(_saving ? 'Saving…' : 'Add method'),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(paymentMethodsProvider.future),
        child: switch (methods) {
          AsyncData(:final value) => ListView(
            padding: const EdgeInsets.fromLTRB(
              DriftSpacing.s5,
              DriftSpacing.s5,
              DriftSpacing.s5,
              DriftSpacing.s16,
            ),
            children: [
              const BillingSandboxBanner(),
              if (_paymentError != null) ...[
                const SizedBox(height: DriftSpacing.s4),
                _PaymentFailure(
                  message: _paymentError!,
                  retry: _retryMethodId == null ? null : _retryPayment,
                ),
              ],
              const SizedBox(height: DriftSpacing.s5),
              if (value.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: DriftSpacing.s12,
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.credit_card_off_outlined, size: 42),
                      const SizedBox(height: DriftSpacing.s3),
                      Text(
                        'No payment method saved',
                        style: type.body,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: DriftSpacing.s2),
                      Text(
                        'Add a tokenized card or mobile-money method to choose a paid plan.',
                        style: type.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              else
                for (var index = 0; index < value.length; index++) ...[
                  _PaymentMethodCard(
                    method: value[index],
                    onRemove: () => _remove(value[index]),
                  ),
                  if (index < value.length - 1)
                    const SizedBox(height: DriftSpacing.s3),
                ],
            ],
          ),
          AsyncError() => BillingLoadError(
            message: "Couldn't load your payment methods.",
            retry: () => ref.invalidate(paymentMethodsProvider),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _PaymentMethodCard extends StatelessWidget {
  const _PaymentMethodCard({required this.method, required this.onRemove});
  final SavedPaymentMethod method;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return DriftCard(
      child: Row(
        children: [
          Icon(
            method.kind == PaymentMethodKind.card
                ? Icons.credit_card_outlined
                : Icons.phone_android_outlined,
            color: colors.primary,
          ),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(method.label, style: type.title),
                Text('${method.provider} token', style: type.bodySmall),
              ],
            ),
          ),
          if (method.isDefault)
            const DriftStatusBadge(
              label: 'Default',
              tone: DriftStatusTone.info,
            ),
          IconButton(
            onPressed: onRemove,
            tooltip: 'Remove ${method.label}',
            icon: Icon(Icons.delete_outline, color: colors.error),
          ),
        ],
      ),
    );
  }
}

class _PaymentFailure extends StatelessWidget {
  const _PaymentFailure({required this.message, this.retry});
  final String message;
  final VoidCallback? retry;

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
          Text(message),
          if (retry != null)
            DriftButton(
              label: 'Retry payment',
              variant: DriftButtonVariant.text,
              onPressed: retry,
            ),
        ],
      ),
    );
  }
}

class _PaymentMethodDraft {
  const _PaymentMethodDraft({
    required this.kind,
    required this.last4,
    required this.brand,
  });
  final PaymentMethodKind kind;
  final String last4;
  final String? brand;
}

class _AddPaymentMethodSheet extends StatefulWidget {
  const _AddPaymentMethodSheet();

  @override
  State<_AddPaymentMethodSheet> createState() => _AddPaymentMethodSheetState();
}

class _AddPaymentMethodSheetState extends State<_AddPaymentMethodSheet> {
  PaymentMethodKind _kind = PaymentMethodKind.card;
  final _brand = TextEditingController(text: 'Card');
  final _last4 = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _brand.dispose();
    _last4.dispose();
    super.dispose();
  }

  void _save() {
    if (!RegExp(r'^\d{4}$').hasMatch(_last4.text)) {
      setState(() => _error = 'Enter exactly four digits.');
      return;
    }
    Navigator.of(context).pop(
      _PaymentMethodDraft(
        kind: _kind,
        last4: _last4.text,
        brand: _kind == PaymentMethodKind.card ? _brand.text.trim() : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          DriftSpacing.s5,
          0,
          DriftSpacing.s5,
          MediaQuery.viewInsetsOf(context).bottom + DriftSpacing.s5,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Add payment method', style: type.h3),
              const SizedBox(height: DriftSpacing.s4),
              SegmentedButton<PaymentMethodKind>(
                segments: [
                  for (final kind in PaymentMethodKind.values)
                    ButtonSegment(value: kind, label: Text(kind.label)),
                ],
                selected: {_kind},
                onSelectionChanged: (selection) =>
                    setState(() => _kind = selection.first),
              ),
              const SizedBox(height: DriftSpacing.s4),
              if (_kind == PaymentMethodKind.card) ...[
                DriftTextField(
                  label: 'Card brand',
                  hintText: 'e.g. Visa',
                  controller: _brand,
                ),
                const SizedBox(height: DriftSpacing.s3),
              ],
              DriftTextField(
                label: _kind == PaymentMethodKind.card
                    ? 'Tokenized card — last four digits'
                    : 'Tokenized mobile number — last four digits',
                controller: _last4,
                keyboardType: TextInputType.number,
                maxLength: 4,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                errorText: _error,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Text(
                'Drift stores only the provider token and these display digits. Full payment credentials never reach Drift.',
                style: type.bodySmall,
              ),
              const SizedBox(height: DriftSpacing.s5),
              DriftButton(label: 'Save method', onPressed: _save),
            ],
          ),
        ),
      ),
    );
  }
}
