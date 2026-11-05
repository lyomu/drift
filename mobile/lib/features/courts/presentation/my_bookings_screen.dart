import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../application/courts_providers.dart';
import '../data/court_bookings.dart';
import '../data/courts_repository.dart';

/// The player's court booking requests: upcoming first, then history.
class MyBookingsScreen extends ConsumerWidget {
  const MyBookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final bookings = ref.watch(myBookingsProvider);

    return DriftScaffold(
      title: l.bookingMyBookings,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(myBookingsProvider);
          await ref.read(myBookingsProvider.future);
        },
        child: switch (bookings) {
          AsyncData(:final value) when value.isEmpty => ListView(
            children: [
              const SizedBox(height: 120),
              Center(child: Text(l.bookingEmpty, style: type.h3)),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: Text(
                  l.bookingEmptyHint,
                  style: type.body.copyWith(color: colors.textSecondary),
                ),
              ),
            ],
          ),
          AsyncData(:final value) => _List(bookings: value),
          AsyncError() => ListView(
            children: [
              const SizedBox(height: 120),
              Center(child: Text(l.commonErrorGeneric)),
            ],
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _List extends ConsumerWidget {
  const _List({required this.bookings});

  final List<CourtBooking> bookings;

  bool _isUpcoming(CourtBooking b) =>
      b.cancellable || (b.status == CourtBookingStatus.pending && !b.completed);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final upcoming = bookings.where(_isUpcoming).toList()
      ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
    final past = bookings.where((b) => !_isUpcoming(b)).toList();

    Widget header(String text) => Padding(
      padding: const EdgeInsets.only(
        top: DriftSpacing.s4,
        bottom: DriftSpacing.s2,
      ),
      child: Text(
        text,
        style: type.title.copyWith(color: colors.textSecondary),
      ),
    );

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        if (upcoming.isNotEmpty) ...[
          header(l.bookingUpcoming),
          for (final b in upcoming) _BookingCard(booking: b),
        ],
        if (past.isNotEmpty) ...[
          header(l.bookingPast),
          for (final b in past) _BookingCard(booking: b),
        ],
      ],
    );
  }
}

class _BookingCard extends ConsumerWidget {
  const _BookingCard({required this.booking});

  final CourtBooking booking;

  (String, DriftPillTone) _status(BuildContext context) {
    final l = context.l10n;
    if (booking.completed) {
      return (l.bookingStatusCompleted, DriftPillTone.neutral);
    }
    return switch (booking.status) {
      CourtBookingStatus.pending => (
        l.bookingStatusPending,
        DriftPillTone.warning,
      ),
      CourtBookingStatus.approved => (
        l.bookingStatusApproved,
        DriftPillTone.success,
      ),
      CourtBookingStatus.declined => (
        l.bookingStatusDeclined,
        DriftPillTone.error,
      ),
      CourtBookingStatus.cancelled => (
        booking.cancelledByClub
            ? l.bookingCancelledByClub
            : l.bookingStatusCancelled,
        DriftPillTone.neutral,
      ),
    };
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final messenger = ScaffoldMessenger.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.bookingCancelTitle),
        content: Text(l.bookingCancelBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l.bookingKeep),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l.bookingCancel),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(courtsRepositoryProvider).cancelBooking(booking.id);
      ref.invalidate(myBookingsProvider);
      messenger.showSnackBar(SnackBar(content: Text(l.bookingCancelled)));
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(e is AuthException ? e.message : l.commonErrorGeneric),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final locale = Localizations.localeOf(context).toString();
    final (label, tone) = _status(context);
    final date = DateFormat.MMMEd(
      locale,
    ).format(DateTime.parse(booking.localDate));

    return Container(
      margin: const EdgeInsets.only(bottom: DriftSpacing.s3),
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  booking.courtName,
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              DriftPill(label: label, tone: tone),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            '$date · ${booking.localStart}–${booking.localEnd} · ${surfaceLabel(l, booking.surface)}',
            style: type.body.copyWith(color: colors.textSecondary),
          ),
          if (booking.note != null && booking.note!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                l.bookingYourNote(booking.note!),
                style: type.caption.copyWith(color: colors.textSecondary),
              ),
            ),
          if (booking.decisionNote != null && booking.decisionNote!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                l.bookingClubNote(booking.decisionNote!),
                style: type.caption.copyWith(color: colors.textSecondary),
              ),
            ),
          if (booking.cancellable)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => _cancel(context, ref),
                child: Text(l.bookingCancel),
              ),
            ),
        ],
      ),
    );
  }
}
