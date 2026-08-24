import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/onboarding/onboarding_step.dart';
import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

const _padelOptions = [
  ('YES', 'Yes'),
  ('NO', 'No'),
  ('WANT_TO_LEARN', "I'd like to learn"),
];

/// Padel Interest Prompt — `foundation/03-user-journeys.md` §2 & §9.
class PadelInterestScreen extends ConsumerStatefulWidget {
  const PadelInterestScreen({super.key});

  @override
  ConsumerState<PadelInterestScreen> createState() =>
      _PadelInterestScreenState();
}

class _PadelInterestScreenState extends ConsumerState<PadelInterestScreen> {
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _submit(String value) async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updatePadelInterest(value);
      if (!mounted) return;
      // Padel Interest always advances to COMPLETE. Route to the one-time
      // confirmation screen here rather than through `goToOnboardingStep` —
      // that generic mapping sends COMPLETE straight to /home, which is
      // correct for *resuming* an already-finished session, but not for
      // the moment onboarding actually finishes.
      if (nextStep == OnboardingStep.complete) {
        context.go('/onboarding/complete');
      } else {
        goToOnboardingStep(context, nextStep);
      }
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
      appBar: AppBar(title: const Text('Do You Also Play Padel?')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Padel is coming to Drift soon — let us know if you play or want to learn.',
              ),
              const SizedBox(height: DriftSpacing.s4),
              Wrap(
                spacing: DriftSpacing.s2,
                children: _padelOptions
                    .map(
                      (option) => DriftFilterChip(
                        label: option.$2,
                        selected: false,
                        onTap: _isSubmitting ? () {} : () => _submit(option.$1),
                      ),
                    )
                    .toList(),
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              Center(
                child: DriftButton(
                  label: 'Skip',
                  variant: DriftButtonVariant.text,
                  onPressed: _isSubmitting ? null : () => _submit('NO'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
