import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../../auth/data/auth_repository.dart';
import '../application/payments_providers.dart';
import '../data/payments_repository.dart';
import 'widgets/billing_widgets.dart';

class BillingHistoryScreen extends ConsumerWidget {
  const BillingHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(billingHistoryProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Billing history')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(billingHistoryProvider.future),
          child: switch (history) {
            AsyncData(:final value) => value.isEmpty
                ? const _EmptyBillingHistory()
                : ListView.separated(
                    padding: const EdgeInsets.all(DriftSpacing.s5),
                    itemCount: value.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: DriftSpacing.s3),
                    itemBuilder: (context, index) => _InvoiceCard(
                      invoice: value[index],
                      onTap: () => _showReceipt(context, ref, value[index].id),
                    ),
                  ),
            AsyncError() => BillingLoadError(
                message: "Couldn't load your billing history.",
                retry: () => ref.invalidate(billingHistoryProvider),
              ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _EmptyBillingHistory extends StatelessWidget {
  const _EmptyBillingHistory();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        const SizedBox(height: DriftSpacing.s12),
        const Icon(Icons.receipt_long_outlined, size: 42),
        const SizedBox(height: DriftSpacing.s3),
        Text(
          'No billing history yet',
          style: type.body,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: DriftSpacing.s2),
        Text(
          'Receipts will appear here after your first paid plan change.',
          style: type.bodySmall,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  const _InvoiceCard({required this.invoice, required this.onTap});
  final BillingInvoice invoice;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return DriftCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(invoice.description, style: type.title),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  '${invoice.number} · ${billingDate(invoice.createdAt)}',
                  style: type.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: DriftSpacing.s3),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                invoice.amountLabel,
                style: type.title.copyWith(color: colors.primaryDark),
              ),
              const SizedBox(height: DriftSpacing.s1),
              DriftStatusBadge(
                label: invoice.status.label,
                tone: invoiceTone(invoice.status),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

Future<void> _showReceipt(
  BuildContext context,
  WidgetRef ref,
  String invoiceId,
) async {
  try {
    final receipt = await ref.read(paymentsRepositoryProvider).receipt(invoiceId);
    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _ReceiptSheet(
        receipt: receipt,
        download: () async {
          try {
            final path = await ref
                .read(paymentsRepositoryProvider)
                .downloadReceipt(invoiceId);
            if (!sheetContext.mounted) return;
            ScaffoldMessenger.of(sheetContext).showSnackBar(
              SnackBar(content: Text('Receipt saved to $path')),
            );
          } on AuthException catch (error) {
            if (!sheetContext.mounted) return;
            ScaffoldMessenger.of(
              sheetContext,
            ).showSnackBar(SnackBar(content: Text(error.message)));
          } catch (_) {
            if (!sheetContext.mounted) return;
            ScaffoldMessenger.of(sheetContext).showSnackBar(
              const SnackBar(
                content: Text('Could not save the receipt. Please retry.'),
              ),
            );
          }
        },
      ),
    );
  } on AuthException catch (error) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(error.message)));
  }
}

class _ReceiptSheet extends StatelessWidget {
  const _ReceiptSheet({required this.receipt, required this.download});
  final BillingInvoice receipt;
  final Future<void> Function() download;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s5,
          0,
          DriftSpacing.s5,
          DriftSpacing.s5,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: Text('Receipt', style: type.h3)),
                  DriftStatusBadge(
                    label: receipt.status.label,
                    tone: invoiceTone(receipt.status),
                  ),
                ],
              ),
              const SizedBox(height: DriftSpacing.s5),
              _ReceiptLine(label: 'Invoice', value: receipt.number),
              _ReceiptLine(label: 'Plan', value: receipt.planName),
              _ReceiptLine(label: 'Amount', value: receipt.amountLabel),
              _ReceiptLine(
                label: 'Payment method',
                value: receipt.paymentMethodLabel ?? 'Not available',
              ),
              _ReceiptLine(
                label: 'Provider reference',
                value: receipt.providerReference ?? 'Not available',
              ),
              _ReceiptLine(
                label: 'Date',
                value: billingDate(receipt.createdAt),
              ),
              if (receipt.failureReason != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(receipt.failureReason!, style: type.body),
              ],
              const SizedBox(height: DriftSpacing.s5),
              DriftButton(
                label: 'Download receipt',
                variant: DriftButtonVariant.text,
                onPressed: download,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReceiptLine extends StatelessWidget {
  const _ReceiptLine({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label, style: type.bodySmall)),
          Expanded(child: Text(value, style: type.body)),
        ],
      ),
    );
  }
}
