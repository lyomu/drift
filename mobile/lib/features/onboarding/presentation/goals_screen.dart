import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import 'widgets/onboarding_scaffold.dart';

const _goalOptions = [
  ('play_more', 'Play more often'),
  ('meet_people', 'Meet new players'),
  ('improve_skills', 'Improve my skills'),
  ('compete', 'Compete in leagues/tournaments'),
  ('get_fit', 'Get fitter'),
  ('track_progress', 'Track my progress'),
  ('have_fun', 'Just have fun'),
  ('coaching', 'Find a coach'),
];

/// Goals — `foundation/03-user-journeys.md` §2, multi-select.
class GoalsScreen extends ConsumerStatefulWidget {
  const GoalsScreen({super.key});

  @override
  ConsumerState<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends ConsumerState<GoalsScreen> {
  final Set<String> _selected = {};
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateGoals(_selected.toList());
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
    return DriftOnboardingScaffold(
      step: OnboardingStepIndex.goals,
      title: 'What brings you to Drift?',
      highlight: 'Drift?',
      subtitle: 'Pick as many as you like. This only shapes what we suggest.',
      loading: _isSubmitting,
      onContinue: _isSubmitting ? null : _submit,
      errorText: _errorText,
      // Goals are optional, and submitting an empty set is what Skip has
      // always done — the API takes a list, not a null.
      footer: DriftButton(
        label: 'Skip',
        variant: DriftButtonVariant.text,
        onPressed: _isSubmitting ? null : _submit,
      ),
      children: [
        Wrap(
          spacing: DriftSpacing.s2,
          runSpacing: DriftSpacing.s2,
          children: _goalOptions
              .map(
                (goal) => DriftFilterChip(
                  label: goal.$2,
                  selected: _selected.contains(goal.$1),
                  onTap: () => setState(() {
                    if (!_selected.remove(goal.$1)) {
                      _selected.add(goal.$1);
                    }
                  }),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}
