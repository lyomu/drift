import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import 'widgets/onboarding_scaffold.dart';
import '../../../core/l10n/l10n.dart';

final _goalOptions = [
  ('play_more', (AppLocalizations l) => l.goalPlayMore),
  ('meet_people', (AppLocalizations l) => l.goalMeetPeople),
  ('improve_skills', (AppLocalizations l) => l.goalImproveSkills),
  ('compete', (AppLocalizations l) => l.goalCompete),
  ('get_fit', (AppLocalizations l) => l.goalGetFit),
  ('track_progress', (AppLocalizations l) => l.goalTrackProgress),
  ('have_fun', (AppLocalizations l) => l.goalHaveFun),
  ('coaching', (AppLocalizations l) => l.goalCoaching),
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
      title: context.l10n.onbGoalsTitle,
      highlight: context.l10n.onbGoalsHighlight,
      subtitle: context.l10n.onbGoalsSubtitle,
      loading: _isSubmitting,
      onContinue: _isSubmitting ? null : _submit,
      errorText: _errorText,
      // Goals are optional, and submitting an empty set is what Skip has
      // always done — the API takes a list, not a null.
      footer: DriftButton(
        label: context.l10n.commonSkip,
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
                  label: goal.$2(context.l10n),
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
