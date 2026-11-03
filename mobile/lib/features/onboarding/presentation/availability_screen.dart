import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import 'widgets/onboarding_scaffold.dart';
import '../../../core/l10n/l10n.dart';
import 'package:intl/intl.dart';

/// Short day name for the grid's Sunday-first row index, in the active
/// language. 2023-12-31 was a Sunday.
String _dayLabel(String localeTag, int day) =>
    DateFormat.E(localeTag).format(DateTime(2023, 12, 31 + day));

final _timeBlocks = [
  ('MORNING', (AppLocalizations l) => l.onbTimeBlockAm),
  ('AFTERNOON', (AppLocalizations l) => l.onbTimeBlockMid),
  ('EVENING', (AppLocalizations l) => l.onbTimeBlockPm),
];

/// Availability — `foundation/03-user-journeys.md` §2. Day x time-block
/// grid, matching `AvailabilitySlot`'s shape directly.
class AvailabilityScreen extends ConsumerStatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  ConsumerState<AvailabilityScreen> createState() => _AvailabilityScreenState();
}

class _AvailabilityScreenState extends ConsumerState<AvailabilityScreen> {
  final Set<(int, String)> _selected = {};
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final slots = _selected
          .map((s) => {'dayOfWeek': s.$1, 'timeBlock': s.$2})
          .toList();
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateAvailability(slots);
      if (!mounted) return;
      goToOnboardingStep(context, nextStep);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftOnboardingScaffold(
      step: OnboardingStepIndex.availability,
      title: context.l10n.onbAvailabilityTitle,
      highlight: context.l10n.onbAvailabilityHighlight,
      subtitle: context.l10n.onbAvailabilitySubtitle,
      loading: _isSubmitting,
      onContinue: _isSubmitting ? null : _submit,
      errorText: _errorText,
      footer: DriftButton(
        label: context.l10n.commonSkip,
        variant: DriftButtonVariant.text,
        onPressed: _isSubmitting ? null : _submit,
      ),
      children: [
        Table(
                  defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                  children: [
                    TableRow(
                      children: [
                        const SizedBox.shrink(),
                        for (final block in _timeBlocks)
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: DriftSpacing.s2,
                            ),
                            child: Center(
                              child: Text(block.$2(context.l10n), style: type.label),
                            ),
                          ),
                      ],
                    ),
                    for (var day = 0; day < 7; day++)
                      TableRow(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: DriftSpacing.s1,
                            ),
                            child: Text(
                              _dayLabel(context.localeTag, day),
                              style: type.body,
                            ),
                          ),
                          for (final block in _timeBlocks)
                            Padding(
                              padding: const EdgeInsets.all(DriftSpacing.s1),
                              child: _SlotCell(
                                selected: _selected.contains((day, block.$1)),
                                onTap: () => setState(() {
                                  final key = (day, block.$1);
                                  if (!_selected.remove(key)) {
                                    _selected.add(key);
                                  }
                                }),
                              ),
                            ),
                        ],
                      ),
          ],
        ),
      ],
    );
  }
}

class _SlotCell extends StatelessWidget {
  const _SlotCell({required this.selected, required this.onTap});

  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 36,
        decoration: BoxDecoration(
          color: selected ? colors.primary : colors.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? colors.primary : colors.border),
        ),
      ),
    );
  }
}
