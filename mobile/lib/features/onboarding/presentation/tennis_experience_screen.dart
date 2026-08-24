import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

const _experienceOptions = [
  ('NEW', "I'm completely new"),
  ('UNDER_6M', 'Less than 6 months'),
  ('SIX_TO_12M', '6-12 months'),
  ('ONE_TO_2Y', '1-2 years'),
  ('TWO_TO_5Y', '2-5 years'),
  ('FIVE_PLUS', '5+ years'),
  ('COMPETITIVE', 'Competitive / advanced'),
];

/// Tennis Experience — `foundation/03-user-journeys.md` §3.1. The selected
/// signal determines the adaptive assessment's branch and question depth.
class TennisExperienceScreen extends ConsumerStatefulWidget {
  const TennisExperienceScreen({super.key});

  @override
  ConsumerState<TennisExperienceScreen> createState() =>
      _TennisExperienceScreenState();
}

class _TennisExperienceScreenState
    extends ConsumerState<TennisExperienceScreen> {
  String? _experienceSignal;
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _submit() async {
    if (_experienceSignal == null) {
      setState(() => _errorText = 'Choose an option to continue.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateTennisExperience(experienceSignal: _experienceSignal!);
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
      appBar: AppBar(title: const Text('Tennis Experience')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('How long have you been playing tennis?'),
              const SizedBox(height: DriftSpacing.s4),
              Wrap(
                spacing: DriftSpacing.s2,
                runSpacing: DriftSpacing.s2,
                children: _experienceOptions
                    .map(
                      (option) => DriftFilterChip(
                        label: option.$2,
                        selected: _experienceSignal == option.$1,
                        onTap: () =>
                            setState(() => _experienceSignal = option.$1),
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
            ],
          ),
        ),
      ),
    );
  }
}
