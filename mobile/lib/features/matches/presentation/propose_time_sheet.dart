import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_match_card.dart';

/// Propose Time — `foundation/04-screen-inventory.md` §A.4. Several candidate
/// times go out at once so the other player can just pick one, rather than
/// bouncing single suggestions back and forth (which is what the 3-round
/// bound in §4.2 exists to stop).
Future<List<DateTime>?> showProposeTimeSheet(BuildContext context) {
  return showModalBottomSheet<List<DateTime>>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const _ProposeTimeSheet(),
  );
}

class _ProposeTimeSheet extends StatefulWidget {
  const _ProposeTimeSheet();

  @override
  State<_ProposeTimeSheet> createState() => _ProposeTimeSheetState();
}

class _ProposeTimeSheetState extends State<_ProposeTimeSheet> {
  final List<DateTime> _times = [];

  static const _maxOptions = 5;

  Future<void> _addTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
      initialDate: now.add(const Duration(days: 1)),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 18, minute: 0),
    );
    if (time == null) return;

    final combined = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );

    // The server rejects past times; catching it here avoids a round trip.
    if (combined.isBefore(DateTime.now())) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pick a time in the future.')),
        );
      }
      return;
    }

    setState(() => _times.add(combined));
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s6,
          0,
          DriftSpacing.s6,
          DriftSpacing.s6,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Propose times', style: type.h2),
            const SizedBox(height: DriftSpacing.s1),
            Text(
              'Offer up to $_maxOptions options — they pick one.',
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s4),

            if (_times.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: DriftSpacing.s4),
                child: Text(
                  'No times added yet.',
                  style: type.body.copyWith(color: colors.textSecondary),
                  textAlign: TextAlign.center,
                ),
              )
            else
              for (var i = 0; i < _times.length; i++)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.event, color: colors.primary),
                  title: Text(formatMatchTime(_times[i]), style: type.body),
                  trailing: IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => setState(() => _times.removeAt(i)),
                  ),
                ),

            const SizedBox(height: DriftSpacing.s2),
            if (_times.length < _maxOptions)
              DriftButton(
                label: 'Add a time',
                variant: DriftButtonVariant.text,
                onPressed: _addTime,
              ),

            const SizedBox(height: DriftSpacing.s4),
            DriftButton(
              label:
                  'Send ${_times.length} time${_times.length == 1 ? '' : 's'}',
              onPressed: _times.isEmpty
                  ? null
                  : () => Navigator.of(context).pop(_times),
            ),
          ],
        ),
      ),
    );
  }
}
