import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/onboarding/onboarding_step.dart';
import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_symbol.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import 'widgets/onboarding_scaffold.dart';

/// Drift's official readable text family.
const _font = 'Outfit';

/// Padel Interest is the last onboarding step — see
/// `core/onboarding/onboarding_step_route.dart`.

const _padelOptions = [
  (
    value: 'YES',
    label: 'Yes, I play padel',
    subtitle: 'Already on the court',
    icon: DriftSymbolsFilled.sportsTennis,
    accent: Color(0xFF22C55E),
  ),
  (
    value: 'NO',
    label: 'No, just tennis',
    subtitle: 'Sticking to the classics',
    icon: DriftSymbolsFilled.close,
    accent: Color(0xFF64748B),
  ),
  (
    value: 'WANT_TO_LEARN',
    label: "I'd like to learn",
    subtitle: 'Open to picking it up',
    icon: DriftSymbolsFilled.school,
    accent: Color(0xFF8B5CF6),
  ),
];

/// Padel Interest Prompt — `foundation/03-user-journeys.md` §2 & §9.
class PadelInterestScreen extends ConsumerStatefulWidget {
  const PadelInterestScreen({super.key});

  @override
  ConsumerState<PadelInterestScreen> createState() =>
      _PadelInterestScreenState();
}

class _PadelInterestScreenState extends ConsumerState<PadelInterestScreen> {
  String? _selected;
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
        context.push('/onboarding/complete');
      } else {
        goToOnboardingStep(context, nextStep);
      }
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _continue() {
    if (_selected == null) {
      setState(() => _errorText = 'Please choose an option to continue.');
      return;
    }
    _submit(_selected!);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftOnboardingScaffold(
      step: OnboardingStepIndex.padelInterest,
      title: 'Do you also play padel?',
      highlight: 'padel?',
      subtitle:
          'Padel is coming to Drift soon — let us know if you play or want '
          'to learn.',
      ctaActive: _selected != null,
      loading: _isSubmitting,
      onContinue: _isSubmitting ? null : _continue,
      errorText: _errorText,
      // Skip records NO — the step is optional but the answer is not nullable
      // on the API, and this is what it has always sent.
      footer: TextButton(
        onPressed: _isSubmitting ? null : () => _submit('NO'),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        child: Text(
          'Skip',
          style: TextStyle(
            fontFamily: _font,
            fontSize: 14,
            fontWeight: FontWeight.w600,
            height: 1.3,
            color: colors.primary,
          ),
        ),
      ),
      children: [
        const SizedBox(height: 12),
        for (var i = 0; i < _padelOptions.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _OptionCard(
            option: _padelOptions[i],
            selected: _selected == _padelOptions[i].value,
            onTap: _isSubmitting
                ? null
                : () => setState(() {
                    _selected = _padelOptions[i].value;
                    _errorText = null;
                  }),
          ),
        ],
      ],
    );
  }
}

/// Row of 24×4 rounded ticks — filled up to [current], tinted after it.
class _OptionCard extends StatelessWidget {
  const _OptionCard({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final ({
    String value,
    String label,
    String subtitle,
    IconData icon,
    Color accent,
  })
  option;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return AnimatedScale(
      scale: selected ? 1.01 : 1,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        decoration: BoxDecoration(
          color: selected ? colors.primaryLight : colors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? colors.primary : _tintedBorder(colors),
            width: 2,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: colors.primary.withValues(alpha: 0.07),
                    spreadRadius: 4,
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: option.accent.withValues(
                        alpha: selected ? 0.09 : 0.06,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: option.accent.withValues(alpha: 0.19),
                        width: 1.5,
                      ),
                    ),
                    child: Icon(option.icon, size: 22, color: option.accent),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          option.label,
                          style: TextStyle(
                            fontFamily: _font,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            height: 1.2,
                            color: selected ? colors.primary : colors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          option.subtitle,
                          style: TextStyle(
                            fontFamily: _font,
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            height: 1.3,
                            color: colors.textPrimary,
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
    final colors = Theme.of(context).extension<DriftColors>()!;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? accent : Colors.transparent,
        border: Border.all(
          color: selected ? accent : colors.border,
          width: 2,
        ),
      ),
      child: selected
          ? const Icon(
              DriftSymbolsFilled600.check,
              size: 11,
              color: Colors.white,
            )
          : null,
    );
  }
}
Color _tintedBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.18), colors.surface);
