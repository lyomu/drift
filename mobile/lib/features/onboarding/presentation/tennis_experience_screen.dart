import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

/// One selectable experience band. [signal] is the backend enum value; the
/// rest is presentation taken from the redesign mock.
class _ExperienceOption {
  const _ExperienceOption({
    required this.signal,
    required this.label,
    required this.subtitle,
    required this.icon,
    this.accent,
  });

  final String signal;
  final String label;
  final String subtitle;
  final IconData icon;

  /// `null` means "use the theme's brand colour".
  final Color? accent;
}

const _experienceOptions = <_ExperienceOption>[
  _ExperienceOption(
    signal: 'NEW',
    label: "I'm completely new",
    subtitle: 'Never held a racket',
    icon: Icons.sports_tennis_rounded,
  ),
  _ExperienceOption(
    signal: 'UNDER_6M',
    label: 'Less than 6 months',
    subtitle: 'Still learning the basics',
    icon: Icons.trending_up_rounded,
    accent: Color(0xFF22C55E),
  ),
  _ExperienceOption(
    signal: 'SIX_TO_12M',
    label: '6–12 months',
    subtitle: 'Getting comfortable on court',
    icon: Icons.electric_bolt_rounded,
    accent: Color(0xFFEAB308),
  ),
  _ExperienceOption(
    signal: 'ONE_TO_2Y',
    label: '1–2 years',
    subtitle: 'Building a solid foundation',
    icon: Icons.fitness_center_rounded,
    accent: Color(0xFFF97316),
  ),
  _ExperienceOption(
    signal: 'TWO_TO_5Y',
    label: '2–5 years',
    subtitle: 'Developing real game sense',
    icon: Icons.military_tech_rounded,
    accent: Color(0xFFEC4899),
  ),
  _ExperienceOption(
    signal: 'FIVE_PLUS',
    label: '5+ years',
    subtitle: 'Experienced and consistent',
    icon: Icons.emoji_events_rounded,
    accent: Color(0xFFEAB308),
  ),
  _ExperienceOption(
    signal: 'COMPETITIVE',
    label: 'Competitive / Advanced',
    subtitle: 'Tournament-level play',
    icon: Icons.workspace_premium_rounded,
    accent: Color(0xFF8B5CF6),
  ),
];

/// How many steps onboarding has end to end, and where this screen sits —
/// `OnboardingStep.basicProfile`..`padelInterest`, see
/// `core/onboarding/onboarding_step_route.dart`.
const _totalSteps = 10;
const _thisStep = 2;

const _ink = Color(0xFF0F172A);
const _checkBorder = Color(0xFFCBD5E1);

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
      setState(() => _errorText = 'Please choose an option to continue.');
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
      backgroundColor: colors.surface,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _ProgressBar(current: _thisStep, total: _totalSteps),
              const SizedBox(height: 20),
              const _Header(step: _thisStep, total: _totalSteps),
              const SizedBox(height: 20),
              for (var i = 0; i < _experienceOptions.length; i++) ...[
                if (i > 0) const SizedBox(height: 8),
                _OptionCard(
                  option: _experienceOptions[i],
                  selected: _experienceSignal == _experienceOptions[i].signal,
                  onTap: () => setState(() {
                    _experienceSignal = _experienceOptions[i].signal;
                    _errorText = null;
                  }),
                ),
              ],
              // The mock reserves this row whether or not the message shows,
              // so the Continue button never shifts.
              const SizedBox(height: 8),
              SizedBox(
                height: 16,
                child: _errorText == null
                    ? null
                    : Text(
                        _errorText!,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.33,
                          color: Color(0xFFEF4444),
                        ),
                      ),
              ),
              const SizedBox(height: 8),
              _ContinueButton(
                active: _experienceSignal != null,
                loading: _isSubmitting,
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

/// Row of 24×4 rounded ticks — filled up to [current], tinted after it.
class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.current, required this.total});

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
              child: Container(
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

class _Header extends StatelessWidget {
  const _Header({required this.step, required this.total});

  final int step;
  final int total;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'STEP $step OF $total',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 2.2,
            height: 1.2,
            color: colors.primary,
          ),
        ),
        const SizedBox(height: 4),
        Text.rich(
          TextSpan(
            children: [
              const TextSpan(text: "What's your tennis "),
              TextSpan(
                text: 'experience?',
                style: TextStyle(color: colors.primary),
              ),
            ],
          ),
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            height: 1.2,
            color: _ink,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          "We'll personalize your training to match your level.",
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            height: 1.4,
            color: _ink,
          ),
        ),
      ],
    );
  }
}

class _OptionCard extends StatelessWidget {
  const _OptionCard({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final _ExperienceOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final accent = option.accent ?? colors.primary;
    // #E2EAFF in the mock — a brand-tinted hairline rather than the neutral
    // `colors.border`, derived so it tracks whatever the primary is.
    final idleBorder = Color.alphaBlend(
      colors.primary.withValues(alpha: 0.18),
      colors.surface,
    );

    return AnimatedScale(
      scale: selected ? 1.01 : 1,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          color: selected ? colors.primaryLight : colors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? colors.primary : idleBorder,
            width: 2,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: colors.primary.withValues(alpha: 0.09),
                    spreadRadius: 4,
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.07),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: accent.withValues(alpha: 0.19),
                        width: 1.5,
                      ),
                    ),
                    child: Icon(option.icon, size: 20, color: accent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          option.label,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            height: 1.2,
                            color: selected ? colors.primary : _ink,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          option.subtitle,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            height: 1.3,
                            color: _ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  _CheckDot(selected: selected, accent: colors.primary),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CheckDot extends StatelessWidget {
  const _CheckDot({required this.selected, required this.accent});

  final bool selected;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 16,
      height: 16,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? accent : Colors.transparent,
        border: Border.all(
          color: selected ? accent : _checkBorder,
          width: 2,
        ),
      ),
      child: selected
          ? const Icon(Icons.check_rounded, size: 10, color: Colors.white)
          : null,
    );
  }
}

/// Full-width CTA — half-opacity until a band is chosen, then opaque with the
/// brand glow from the mock.
class _ContinueButton extends StatelessWidget {
  const _ContinueButton({
    required this.active,
    required this.loading,
    required this.onPressed,
  });

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
                  : const Text(
                      'Continue  →',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.48,
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
