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

const _days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _timeBlocks = [
  ('MORNING', 'AM'),
  ('AFTERNOON', 'Mid'),
  ('EVENING', 'PM'),
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
      title: 'When can you play?',
      highlight: 'play?',
      subtitle: 'Tap the slots you are usually free. You can change these '
          'any time.',
      loading: _isSubmitting,
      onContinue: _isSubmitting ? null : _submit,
      errorText: _errorText,
      footer: DriftButton(
        label: 'Skip',
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
                              child: Text(block.$2, style: type.label),
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
                            child: Text(_days[day], style: type.body),
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
