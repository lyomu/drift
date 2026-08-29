import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/payments_repository.dart';

final billingSummaryProvider = FutureProvider.autoDispose<BillingSummary>((
  ref,
) {
  return ref.watch(paymentsRepositoryProvider).summary();
});

final paymentPlansProvider = FutureProvider.autoDispose<List<PaymentPlan>>((
  ref,
) {
  return ref.watch(paymentsRepositoryProvider).plans();
});

final paymentMethodsProvider =
    FutureProvider.autoDispose<List<SavedPaymentMethod>>((ref) {
      return ref.watch(paymentsRepositoryProvider).methods();
    });

final billingHistoryProvider = FutureProvider.autoDispose<List<BillingInvoice>>(
  (ref) {
    return ref.watch(paymentsRepositoryProvider).invoices();
  },
);
