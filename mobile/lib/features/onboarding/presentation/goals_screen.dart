import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

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
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Goals')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('What are you hoping to get out of Drift?'),
              const SizedBox(height: DriftSpacing.s4),
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
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(
                label: _isSubmitting ? 'Saving…' : 'Continue',
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: DriftButton(
                  label: 'Skip',
                  variant: DriftButtonVariant.text,
                  onPressed: _isSubmitting ? null : _submit,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
