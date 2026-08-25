import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

enum PaymentMethodKind {
  card,
  mobileMoney;

  String get apiValue => switch (this) {
    PaymentMethodKind.card => 'CARD',
    PaymentMethodKind.mobileMoney => 'MOBILE_MONEY',
  };

  String get label => switch (this) {
    PaymentMethodKind.card => 'Card',
    PaymentMethodKind.mobileMoney => 'Mobile money',
  };

  static PaymentMethodKind fromJson(String value) =>
      value == 'MOBILE_MONEY' ? mobileMoney : card;
}

enum BillingStatus {
  active,
  pastDue,
  cancelled;

  String get label => switch (this) {
    BillingStatus.active => 'Active',
    BillingStatus.pastDue => 'Past due',
    BillingStatus.cancelled => 'Cancelled',
  };

  static BillingStatus fromJson(String value) => switch (value) {
    'PAST_DUE' => pastDue,
    'CANCELLED' => cancelled,
    _ => active,
  };
}

enum InvoiceStatus {
  open,
  paid,
  failed,
  voided;

  String get label => switch (this) {
    InvoiceStatus.open => 'Open',
    InvoiceStatus.paid => 'Paid',
    InvoiceStatus.failed => 'Failed',
    InvoiceStatus.voided => 'Void',
  };

  static InvoiceStatus fromJson(String value) => switch (value) {
    'PAID' => paid,
    'FAILED' => failed,
    'VOID' => voided,
    _ => open,
  };
}

class PaymentPlan {
  const PaymentPlan({
    required this.id,
    required this.code,
    required this.name,
    required this.description,
    required this.priceMinor,
    required this.currency,
    required this.interval,
    required this.entitlements,
    required this.isTest,
  });

  final String id;
  final String code;
  final String name;
  final String? description;
  final int priceMinor;
  final String currency;
  final String interval;
  final List<String> entitlements;
  final bool isTest;

  bool get isFree => priceMinor == 0;
  String get priceLabel => isFree
      ? 'Free'
      : '$currency ${(priceMinor / 100).toStringAsFixed(2)} / ${interval == 'YEARLY' ? 'year' : 'month'}';

  factory PaymentPlan.fromJson(Map<String, dynamic> json) => PaymentPlan(
    id: json['id'] as String,
    code: json['code'] as String,
    name: json['name'] as String,
    description: json['description'] as String?,
    priceMinor: json['priceMinor'] as int,
    currency: json['currency'] as String,
    interval: json['interval'] as String,
    entitlements: (json['entitlements'] as List<dynamic>)
        .map((item) => item as String)
        .toList(),
    isTest: json['isTest'] as bool,
  );
}

class SavedPaymentMethod {
  const SavedPaymentMethod({
    required this.id,
    required this.kind,
    required this.provider,
    required this.brand,
    required this.last4,
    required this.label,
    required this.isDefault,
  });

  final String id;
  final PaymentMethodKind kind;
  final String provider;
  final String? brand;
  final String last4;
  final String label;
  final bool isDefault;

  factory SavedPaymentMethod.fromJson(Map<String, dynamic> json) =>
      SavedPaymentMethod(
        id: json['id'] as String,
        kind: PaymentMethodKind.fromJson(json['type'] as String),
        provider: json['provider'] as String,
        brand: json['brand'] as String?,
        last4: json['last4'] as String,
        label: json['label'] as String,
        isDefault: json['isDefault'] as bool,
      );
}

class BillingSubscription {
  const BillingSubscription({
    required this.id,
    required this.status,
    required this.currentPeriodStart,
    required this.currentPeriodEnd,
    required this.plan,
  });

  final String id;
  final BillingStatus status;
  final DateTime currentPeriodStart;
  final DateTime currentPeriodEnd;
  final PaymentPlan plan;

  factory BillingSubscription.fromJson(Map<String, dynamic> json) =>
      BillingSubscription(
        id: json['id'] as String,
        status: BillingStatus.fromJson(json['status'] as String),
        currentPeriodStart: DateTime.parse(
          json['currentPeriodStart'] as String,
        ).toLocal(),
        currentPeriodEnd: DateTime.parse(
          json['currentPeriodEnd'] as String,
        ).toLocal(),
        plan: PaymentPlan.fromJson(json['plan'] as Map<String, dynamic>),
      );
}

class BillingSummary {
  const BillingSummary({
    required this.subscription,
    required this.paymentMethods,
    required this.sandbox,
  });

  final BillingSubscription subscription;
  final List<SavedPaymentMethod> paymentMethods;
  final bool sandbox;

  factory BillingSummary.fromJson(Map<String, dynamic> json) => BillingSummary(
    subscription: BillingSubscription.fromJson(
      json['subscription'] as Map<String, dynamic>,
    ),
    paymentMethods: (json['paymentMethods'] as List<dynamic>)
        .map(
          (item) => SavedPaymentMethod.fromJson(
            item as Map<String, dynamic>,
          ),
        )
        .toList(),
    sandbox: json['sandbox'] as bool,
  );
}

class BillingInvoice {
  const BillingInvoice({
    required this.id,
    required this.number,
    required this.amountMinor,
    required this.currency,
    required this.status,
    required this.description,
    required this.periodStart,
    required this.periodEnd,
    required this.paidAt,
    required this.createdAt,
    required this.planName,
    required this.providerReference,
    required this.paymentMethodLabel,
    required this.failureReason,
  });

  final String id;
  final String number;
  final int amountMinor;
  final String currency;
  final InvoiceStatus status;
  final String description;
  final DateTime periodStart;
  final DateTime periodEnd;
  final DateTime? paidAt;
  final DateTime createdAt;
  final String planName;
  final String? providerReference;
  final String? paymentMethodLabel;
  final String? failureReason;

  String get amountLabel =>
      '$currency ${(amountMinor / 100).toStringAsFixed(2)}';

  factory BillingInvoice.fromJson(Map<String, dynamic> json) {
    final transaction = json['transaction'] as Map<String, dynamic>?;
    final plan = json['plan'] as Map<String, dynamic>;
    return BillingInvoice(
      id: json['id'] as String,
      number: json['number'] as String,
      amountMinor: json['amountMinor'] as int,
      currency: json['currency'] as String,
      status: InvoiceStatus.fromJson(json['status'] as String),
      description: json['description'] as String,
      periodStart: DateTime.parse(json['periodStart'] as String).toLocal(),
      periodEnd: DateTime.parse(json['periodEnd'] as String).toLocal(),
      paidAt: json['paidAt'] == null
          ? null
          : DateTime.parse(json['paidAt'] as String).toLocal(),
      createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
      planName: plan['name'] as String,
      providerReference: transaction?['providerReference'] as String?,
      paymentMethodLabel: transaction?['paymentMethodLabel'] as String?,
      failureReason: transaction?['failureReason'] as String?,
    );
  }

  String receiptText() => '''
Drift Tennis receipt
$number

$description
Amount: $amountLabel
Status: ${status.label}
Plan: $planName
Payment method: ${paymentMethodLabel ?? 'Not available'}
Provider reference: ${providerReference ?? 'Not available'}
Created: ${createdAt.toIso8601String()}
Period: ${periodStart.toIso8601String()} to ${periodEnd.toIso8601String()}
${failureReason == null ? '' : 'Failure reason: $failureReason'}
''';
}

class PaymentsRepository {
  PaymentsRepository(this._dio);
  final Dio _dio;

  Future<BillingSummary> summary() async => BillingSummary.fromJson(
    await _send(() => _dio.get('/payments/summary')),
  );

  Future<List<PaymentPlan>> plans() async {
    final data = await _send(() => _dio.get('/payments/plans'));
    return (data['plans'] as List<dynamic>)
        .map((item) => PaymentPlan.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<List<SavedPaymentMethod>> methods() async {
    final data = await _send(() => _dio.get('/payments/methods'));
    return (data['paymentMethods'] as List<dynamic>)
        .map(
          (item) => SavedPaymentMethod.fromJson(
            item as Map<String, dynamic>,
          ),
        )
        .toList();
  }

  Future<SavedPaymentMethod> addMethod({
    required PaymentMethodKind kind,
    required String last4,
    String? brand,
  }) async => SavedPaymentMethod.fromJson(
    await _send(
      () => _dio.post(
        '/payments/methods',
        data: {
          'type': kind.apiValue,
          'last4': last4,
          if (brand != null && brand.trim().isNotEmpty) 'brand': brand.trim(),
        },
      ),
    ),
  );

  Future<void> removeMethod(String id) async {
    await _send(() => _dio.delete('/payments/methods/$id'));
  }

  Future<BillingSummary> changeSubscription(
    String planId, {
    String? paymentMethodId,
  }) async => BillingSummary.fromJson(
    await _send(
      () => _dio.post(
        '/payments/subscription',
        data: {
          'planId': planId,
          if (paymentMethodId != null) 'paymentMethodId': paymentMethodId,
        },
      ),
    ),
  );

  Future<List<BillingInvoice>> invoices() async {
    final data = await _send(() => _dio.get('/payments/invoices'));
    return (data['invoices'] as List<dynamic>)
        .map((item) => BillingInvoice.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<BillingInvoice> receipt(String id) async {
    final data = await _send(() => _dio.get('/payments/invoices/$id'));
    return BillingInvoice.fromJson(data['receipt'] as Map<String, dynamic>);
  }

  Future<String> downloadReceipt(String id) async {
    final invoice = await receipt(id);
    final directory = await getApplicationDocumentsDirectory();
    final safeNumber = invoice.number.replaceAll(RegExp(r'[^A-Za-z0-9-]'), '_');
    final file = File('${directory.path}/$safeNumber.txt');
    await file.writeAsString(invoice.receiptText());
    return file.path;
  }

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() call,
  ) async {
    try {
      final response = await call();
      return response.data as Map<String, dynamic>;
    } on DioException catch (error) {
      final body = error.response?.data;
      final message = body is Map ? body['message'] : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final paymentsRepositoryProvider = Provider<PaymentsRepository>((ref) {
  return PaymentsRepository(ref.watch(dioClientProvider));
});
