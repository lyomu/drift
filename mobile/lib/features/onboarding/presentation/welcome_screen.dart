import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../auth/presentation/widgets/auth_form_widgets.dart';
import '../../auth/presentation/widgets/auth_page_scaffold.dart';
import '../../auth/presentation/widgets/racket_illustration.dart';
import '../../auth/presentation/widgets/social_auth_buttons.dart';

/// Join the Court — the post-intro entry point to auth
/// (`foundation/03-user-journeys.md` §2, redesign 2026-08). "Continue with
/// Email" starts sign-up; the social buttons sign in through
/// [SocialAuthButtons], which owns that flow for all three auth screens.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return AuthPageScaffold(
      fallbackRoute: '/intro',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          const Center(child: RacketIllustration(width: 200)),
          const SizedBox(height: 20),
          Text(
            'Join the Court',
            textAlign: TextAlign.center,
            style: type.h1.copyWith(fontSize: 26),
          ),
          const SizedBox(height: 10),
          Text(
            'Track matches, enter ladders & tournaments, and level up your '
            'game, all in one place.',
            textAlign: TextAlign.center,
            style: type.body.copyWith(
              color: colors.textSecondary,
              height: 1.55,
            ),
          ),
          const SizedBox(height: 24),
          const _StepBars(),
          const SizedBox(height: 32),
          AuthPrimaryButton(
            label: 'Continue with Email',
            icon: Icons.mail_outline,
            onPressed: () => context.push('/sign-up'),
          ),
          const SizedBox(height: 10),
          const SocialAuthButtons(),
          const SizedBox(height: 24),
          AuthFooterPrompt(
            lead: 'Already have an account? ',
            action: 'Log in',
            onTap: () => context.push('/login'),
          ),
        ],
      ),
    );
  }
}

class _StepBars extends StatelessWidget {
  const _StepBars();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    Widget bar(Color color) => Container(
      width: 48,
      height: 5,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
    );
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        bar(colors.primary),
        const SizedBox(width: 8),
        bar(const Color(0xFF8ECCE8)),
      ],
    );
  }
}
