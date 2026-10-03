import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';

/// Shared chrome for every numbered onboarding step (redesign 2026-10).
///
/// Before this existed the ten steps wore three different looks: two carried
/// the tick row, one a white header band, and the remaining seven showed no
/// progress at all — so a player lost any sense of how far through they were
/// on most of the flow. The tick row won; this is the one place it lives.
///
/// The CTA scrolls with the content rather than being pinned, which is the
/// chosen pattern's own shape. On a step with a long option list it can sit
/// below the fold.

/// How many steps onboarding has end to end —
/// `OnboardingStep.basicProfile`..`padelInterest`, see
/// `core/onboarding/onboarding_step_route.dart`. Declared once so a step
/// added to the enum cannot leave the screens disagreeing about the total.
const onboardingTotalSteps = 10;

/// Drift's official readable text family.
const onboardingFont = 'Outfit';

/// 1-based position of each numbered step.
abstract final class OnboardingStepIndex {
  static const basicProfile = 1;
  static const tennisExperience = 2;
  static const assessment = 3;
  static const levelReview = 4;
  static const goals = 5;
  static const playingPreferences = 6;
  static const location = 7;
  static const clubCourts = 8;
  static const availability = 9;
  static const padelInterest = 10;
}

class DriftOnboardingScaffold extends StatelessWidget {
  const DriftOnboardingScaffold({
    super.key,
    required this.step,
    required this.title,
    required this.children,
    this.highlight,
    this.subtitle,
    this.ctaLabel = 'Continue',
    this.ctaActive = true,
    this.loading = false,
    this.onContinue,
    this.errorText,
    this.footer,
  });

  /// 1-based, from [OnboardingStepIndex].
  final int step;

  /// The heading. When [highlight] is given and occurs in [title], that
  /// fragment is drawn in the brand colour.
  final String title;
  final String? highlight;
  final String? subtitle;

  /// The step's own content, between the header and the CTA.
  final List<Widget> children;

  final String ctaLabel;

  /// False dims the button; it stays tappable so the tap can surface
  /// [errorText] rather than leaving the player with a dead control.
  final bool ctaActive;
  final bool loading;
  final VoidCallback? onContinue;
  final String? errorText;

  /// Optional control under the CTA — a "Skip for now" text link on the steps
  /// that genuinely are optional.
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final canGoBack = context.canPop();

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Semantics(
                    button: true,
                    label: 'Go back',
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: canGoBack ? () => context.pop() : null,
                        child: Ink(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: colors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: colors.border),
                          ),
                          child: Icon(
                            Icons.arrow_back_rounded,
                            size: 20,
                            color: canGoBack
                                ? colors.textPrimary
                                : colors.textSecondary.withValues(alpha: 0.45),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: OnboardingProgressBar(current: step)),
                ],
              ),
              const SizedBox(height: 20),
              OnboardingHeader(
                step: step,
                title: title,
                highlight: highlight,
                subtitle: subtitle,
              ),
              const SizedBox(height: 20),
              ...children,
              // The row is reserved whether or not the message shows, so the
              // CTA never shifts under the player's finger.
              const SizedBox(height: 8),
              SizedBox(
                height: 16,
                child: errorText == null
                    ? null
                    : Text(
                        errorText!,
                        style: TextStyle(
                          fontFamily: onboardingFont,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.33,
                          color: colors.error,
                        ),
                      ),
              ),
              const SizedBox(height: 8),
              OnboardingContinueButton(
                label: ctaLabel,
                active: ctaActive,
                loading: loading,
                onPressed: onContinue,
              ),
              if (footer != null) ...[
                const SizedBox(height: 12),
                Center(child: footer!),
              ],
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

/// Row of 24×4 rounded ticks — filled up to [current], tinted after it.
class OnboardingProgressBar extends StatelessWidget {
  const OnboardingProgressBar({
    super.key,
    required this.current,
    this.total = onboardingTotalSteps,
  });

  final int current;
  final int total;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          for (var i = 0; i < total; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            Flexible(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                constraints: const BoxConstraints(maxWidth: 24),
                height: 4,
                decoration: BoxDecoration(
                  color: i < current
                      ? colors.primary
                      : colors.primary.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class OnboardingHeader extends StatelessWidget {
  const OnboardingHeader({
    super.key,
    required this.step,
    required this.title,
    this.highlight,
    this.subtitle,
    this.total = onboardingTotalSteps,
  });

  final int step;
  final int total;
  final String title;
  final String? highlight;
  final String? subtitle;

  /// Splits [title] around [highlight] so the fragment can take the brand
  /// colour. A highlight that is not in the title simply does not apply.
  List<TextSpan> _spans(Color accent) {
    final needle = highlight;
    if (needle == null || needle.isEmpty) return [TextSpan(text: title)];
    final at = title.indexOf(needle);
    if (at < 0) return [TextSpan(text: title)];
    return [
      if (at > 0) TextSpan(text: title.substring(0, at)),
      TextSpan(text: needle, style: TextStyle(color: accent)),
      if (at + needle.length < title.length)
        TextSpan(text: title.substring(at + needle.length)),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'STEP $step OF $total',
          style: TextStyle(
            fontFamily: onboardingFont,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            height: 1.2,
            color: colors.primary,
          ),
        ),
        const SizedBox(height: 4),
        Text.rich(
          TextSpan(children: _spans(colors.primary)),
          style: TextStyle(
            fontFamily: onboardingFont,
            fontSize: 24,
            fontWeight: FontWeight.w900,
            height: 1.2,
            color: colors.textPrimary,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 8),
          Text(
            subtitle!,
            style: TextStyle(
              fontFamily: onboardingFont,
              fontSize: 13,
              fontWeight: FontWeight.w400,
              height: 1.5,
              color: colors.textPrimary,
            ),
          ),
        ],
      ],
    );
  }
}

/// Full-width CTA — half-opacity until the step is answered, then opaque with
/// the brand glow from the mock.
class OnboardingContinueButton extends StatelessWidget {
  const OnboardingContinueButton({
    super.key,
    required this.active,
    required this.loading,
    required this.onPressed,
    this.label = 'Continue',
  });

  final String label;
  final bool active;
  final bool loading;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: active
            ? [
                BoxShadow(
                  color: colors.primary.withValues(alpha: 0.4),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: Material(
        color: colors.primary.withValues(alpha: active ? 1 : 0.5),
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Center(
              child: loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      '$label  →',
                      style: const TextStyle(
                        fontFamily: onboardingFont,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        height: 1.2,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
