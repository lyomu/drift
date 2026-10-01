import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/onboarding/onboarding_step.dart';
import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_symbol.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

/// The prototype's family. Only the ported screens are on Outfit — the rest
/// of the app is still DM Sans, so this cannot go in the global theme yet.
const _font = 'Outfit';

const _ink = Color(0xFF0F172A);
const _checkBorder = Color(0xFFCBD5E1);
const _danger = Color(0xFFEF4444);

/// Padel Interest is the last onboarding step — see
/// `core/onboarding/onboarding_step_route.dart`.
const _totalSteps = 10;
const _thisStep = 10;

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
              const SizedBox(height: 32),
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
                          fontFamily: _font,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.33,
                          color: _danger,
                        ),
                      ),
              ),
              const SizedBox(height: 8),
              _ContinueButton(
                active: _selected != null,
                loading: _isSubmitting,
                onPressed: _isSubmitting ? null : _continue,
              ),
              const SizedBox(height: 8),
              // Skip records NO — the step is optional but the answer is not
              // nullable on the API, and this is what it has always sent.
              Center(
                child: TextButton(
                  onPressed: _isSubmitting ? null : () => _submit('NO'),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
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
              ),
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
            fontFamily: _font,
            fontSize: 12,
            fontWeight: FontWeight.w600,
            height: 1.2,
            color: colors.primary,
          ),
        ),
        const SizedBox(height: 4),
        Text.rich(
          TextSpan(
            children: [
              const TextSpan(text: 'Do you also play '),
              TextSpan(
                text: 'padel?',
                style: TextStyle(color: colors.primary),
              ),
            ],
          ),
          style: const TextStyle(
            fontFamily: _font,
            fontSize: 24,
            fontWeight: FontWeight.w900,
            height: 1.2,
            color: _ink,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Padel is coming to Drift soon — let us know if you play or want to learn.',
          style: TextStyle(
            fontFamily: _font,
            fontSize: 13,
            fontWeight: FontWeight.w400,
            height: 1.5,
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
                            color: selected ? colors.primary : _ink,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          option.subtitle,
                          style: const TextStyle(
                            fontFamily: _font,
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
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
      width: 18,
      height: 18,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? accent : Colors.transparent,
        border: Border.all(
          color: selected ? accent : _checkBorder,
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

/// Full-width CTA — 45% opacity until an option is chosen, then opaque with
/// the brand glow from the mock.
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
        borderRadius: BorderRadius.circular(14),
        boxShadow: active
            ? [
                BoxShadow(
                  color: colors.primary.withValues(alpha: 0.25),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: Material(
        color: colors.primary.withValues(alpha: active ? 1 : 0.45),
        borderRadius: BorderRadius.circular(14),
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
                        fontFamily: _font,
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

Color _tintedBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.18), colors.surface);
