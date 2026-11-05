import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../application/courts_providers.dart';
import '../data/court_bookings.dart';
import '../data/courts_repository.dart';

/// How many days the date strip offers (bounded further by the court's own
/// advance window, which the server enforces).
const int kBookingStripDays = 14;

String _ymd(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Native court booking: pick a surface, a day, a start time and a length,
/// then send a request the club approves or declines. Free; no payment.
class CourtBookingScreen extends ConsumerStatefulWidget {
  const CourtBookingScreen({super.key, required this.courtId});

  final String courtId;

  @override
  ConsumerState<CourtBookingScreen> createState() => _CourtBookingScreenState();
}

class _CourtBookingScreenState extends ConsumerState<CourtBookingScreen> {
  late final DateTime _today;
  late DateTime _day;
  String? _groupId;
  int? _startIndex;
  int _length = 1;
  bool _submitting = false;
  final _note = TextEditingController();

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _day = _today;
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  /// Lengths (in slots) that fit from [start]: consecutive, all still free.
  int _maxLength(CourtAvailability a, int start) {
    var n = 1;
    while (n < a.maxSlots &&
        start + n < a.slots.length &&
        a.slots[start + n].available &&
        a.slots[start + n].startsAt == a.slots[start + n - 1].endsAt) {
      n++;
    }
    return n;
  }

  Future<void> _submit(CourtAvailability a) async {
    final start = _startIndex;
    if (start == null) return;
    setState(() => _submitting = true);
    try {
      await ref
          .read(courtsRepositoryProvider)
          .requestBooking(
            widget.courtId,
            groupId: a.groupId,
            startsAt: a.slots[start].startsAt,
            endsAt: a.slots[start + _length - 1].endsAt,
            note: _note.text,
          );
      ref.invalidate(myBookingsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.l10n.bookingSent)));
      context.pushReplacement('/discover/my-bookings');
    } catch (e) {
      if (!mounted) return;
      final text = e is AuthException ? e.message : null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(text ?? context.l10n.commonErrorGeneric)),
      );
      // The slot may have just been taken; refresh the grid.
      ref.invalidate(courtAvailabilityProvider);
      setState(() {
        _submitting = false;
        _startIndex = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final key = (widget.courtId, _ymd(_day), _groupId);
    final availability = ref.watch(courtAvailabilityProvider(key));
    final locale = Localizations.localeOf(context).toString();

    return DriftScaffold(
      title: l.bookingTitle,
      body: switch (availability) {
        AsyncData(:final value) => _body(context, value, type, colors, locale),
        AsyncError() => Center(
          child: Padding(
            padding: const EdgeInsets.all(DriftSpacing.s6),
            child: Text(
              l.bookingUnavailable,
              textAlign: TextAlign.center,
              style: type.body.copyWith(color: colors.textSecondary),
            ),
          ),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }

  Widget _label(String text, DriftTypography type, DriftColors colors) =>
      Padding(
        padding: const EdgeInsets.only(
          top: DriftSpacing.s5,
          bottom: DriftSpacing.s2,
        ),
        child: Text(
          text,
          style: type.title.copyWith(color: colors.textSecondary),
        ),
      );

  Widget _body(
    BuildContext context,
    CourtAvailability a,
    DriftTypography type,
    DriftColors colors,
    String locale,
  ) {
    final l = context.l10n;
    final days = [
      for (var i = 0; i < kBookingStripDays && i <= a.advanceDays; i++)
        _today.add(Duration(days: i)),
    ];
    final start = _startIndex;
    final maxLen = start == null ? 1 : _maxLength(a, start);
    final length = _length > maxLen ? maxLen : _length;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        Text(a.courtName, style: type.h3),
        const SizedBox(height: 2),
        Text(
          l.bookingFreeNote,
          style: type.body.copyWith(color: colors.textSecondary),
        ),
        if (a.groups.length > 1) ...[
          _label(l.bookingSurface, type, colors),
          Wrap(
            spacing: DriftSpacing.s2,
            children: [
              for (final g in a.groups)
                ChoiceChip(
                  label: Text(surfaceLabel(l, g.surface)),
                  selected: g.id == a.groupId,
                  onSelected: (_) => setState(() {
                    _groupId = g.id;
                    _startIndex = null;
                  }),
                ),
            ],
          ),
        ],
        _label(l.bookingDay, type, colors),
        SizedBox(
          height: 62,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: days.length,
            separatorBuilder: (_, _) => const SizedBox(width: DriftSpacing.s2),
            itemBuilder: (context, i) {
              final d = days[i];
              final selected = _ymd(d) == _ymd(_day);
              return ChoiceChip(
                key: ValueKey('day-${_ymd(d)}'),
                label: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(DateFormat.E(locale).format(d)),
                    Text(
                      DateFormat.d(locale).format(d),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                selected: selected,
                onSelected: (_) => setState(() {
                  _day = d;
                  _startIndex = null;
                }),
              );
            },
          ),
        ),
        _label(l.bookingTime, type, colors),
        if (a.slots.isEmpty || !a.slots.any((s) => s.available))
          Text(
            l.bookingNoSlots,
            style: type.body.copyWith(color: colors.textSecondary),
          )
        else
          Wrap(
            spacing: DriftSpacing.s2,
            runSpacing: DriftSpacing.s2,
            children: [
              for (var i = 0; i < a.slots.length; i++)
                ChoiceChip(
                  key: ValueKey('slot-$i'),
                  label: Text(a.slots[i].localStart),
                  selected: start == i,
                  onSelected: a.slots[i].available
                      ? (_) => setState(() {
                          _startIndex = i;
                          _length = 1;
                        })
                      : null,
                ),
            ],
          ),
        if (start != null && maxLen > 1) ...[
          _label(l.bookingDuration, type, colors),
          Wrap(
            spacing: DriftSpacing.s2,
            children: [
              for (var n = 1; n <= maxLen; n++)
                ChoiceChip(
                  key: ValueKey('len-$n'),
                  label: Text(l.bookingMinutes(n * a.slotMinutes)),
                  selected: length == n,
                  onSelected: (_) => setState(() => _length = n),
                ),
            ],
          ),
        ],
        const SizedBox(height: DriftSpacing.s5),
        DriftTextField(
          label: l.bookingNoteLabel,
          controller: _note,
          maxLines: 2,
          maxLength: 500,
        ),
        const SizedBox(height: DriftSpacing.s4),
        DriftPrimaryButton(
          label: start == null
              ? l.bookingPickSlot
              : '${l.bookingSubmit} · ${a.slots[start].localStart}–${a.slots[start + length - 1].localEnd}',
          loading: _submitting,
          onPressed: start == null
              ? null
              : () {
                  _length = length;
                  _submit(a);
                },
        ),
      ],
    );
  }
}
