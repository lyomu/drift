import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_hero_scaffold.dart';

/// Welcome — the first screen in the onboarding journey
/// (`foundation/03-user-journeys.md` §2). Visual treatment is Drift's own
/// take on a solid-colour hero pattern; no third-party branding, imagery,
/// or copy is reused.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftHeroScaffold(
      top: Padding(
        padding: const EdgeInsets.only(top: DriftSpacing.s4),
        child: Row(
          children: [
            Text.rich(
              TextSpan(
                style: type.h4.copyWith(
                  color: Colors.white,
                  fontFamily: 'SharpSansDisplay',
                  fontWeight: FontWeight.w700,
                ),
                children: const [
                  TextSpan(text: 'DRIFT'),
                  TextSpan(
                    text: '.',
                    style: TextStyle(color: Colors.white70),
                  ),
                  TextSpan(text: 'TENNIS'),
                ],
              ),
            ),
          ],
        ),
      ),
      middle: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.sports_tennis_rounded,
            color: Colors.white,
            size: 56,
          ),
          const SizedBox(height: DriftSpacing.s6),
          Text(
            'Find your next match.',
            style: type.display.copyWith(color: Colors.white),
          ),
          const SizedBox(height: DriftSpacing.s3),
          Text(
            'Discover players near your level, book a court, and track your '
            'game as it improves — Drift is built for every stage of Tennis.',
            style: type.bodyLarge.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
        ],
      ),
      bottom: Padding(
        padding: const EdgeInsets.only(bottom: DriftSpacing.s4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftButton(
              label: 'Get Started',
              variant: DriftButtonVariant.pill,
              onPressed: () => context.push('/sign-up'),
            ),
            const SizedBox(height: DriftSpacing.s2),
            Center(
              child: DriftButton(
                label: 'Already have an account? Sign In',
                variant: DriftButtonVariant.text,
                foregroundColor: Colors.white,
                onPressed: () => context.push('/login'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
