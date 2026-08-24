import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';

/// Onboarding Complete — `foundation/04-screen-inventory.md` A.2. Generic
/// next-actions only, per the screen's own documented fallback rule — real
/// personalisation is Phase M4 (Home).
class OnboardingCompleteScreen extends StatelessWidget {
  const OnboardingCompleteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.check_circle_rounded, color: colors.success, size: 56),
              const SizedBox(height: DriftSpacing.s4),
              Text(
                "You're all set!",
                style: type.display,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Text(
                'Your Tennis Profile is ready. Start exploring players, courts, and '
                "matches near you.",
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: DriftSpacing.s8),
              DriftButton(
                label: 'Go to Home',
                onPressed: () => context.go('/home'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
