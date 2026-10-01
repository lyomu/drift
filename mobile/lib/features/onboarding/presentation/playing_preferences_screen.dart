import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

/// One chip in a section. [value] is the backend enum; everything else is
/// presentation taken from the redesign mock. The mock swaps a Material
/// Symbol's `FILL` axis on selection, which Flutter spells as two icons.
class _ChipOption {
  const _ChipOption({
    required this.value,
    required this.label,
    required this.icon,
    required this.iconSelected,
    required this.accent,
  });

  final String value;
  final String label;
  final IconData icon;
  final IconData iconSelected;
  final Color accent;
}

const _formatOptions = <_ChipOption>[
  _ChipOption(
    value: 'SINGLES',
    label: 'Singles',
    icon: Icons.person_outline_rounded,
    iconSelected: Icons.person_rounded,
    accent: Color(0xFF1A7AFF),
  ),
  _ChipOption(
    value: 'DOUBLES',
    label: 'Doubles',
    icon: Icons.group_outlined,
    iconSelected: Icons.group_rounded,
    accent: Color(0xFF8B5CF6),
  ),
  _ChipOption(
    value: 'EITHER',
    label: 'Either',
    icon: Icons.shuffle_rounded,
    iconSelected: Icons.shuffle_rounded,
    accent: Color(0xFF22C55E),
  ),
];

const _styleOptions = <_ChipOption>[
  _ChipOption(
    value: 'SOCIAL',
    label: 'Social',
    icon: Icons.celebration_outlined,
    iconSelected: Icons.celebration_rounded,
    accent: Color(0xFFEC4899),
  ),
  _ChipOption(
    value: 'COMPETITIVE',
    label: 'Competitive',
    icon: Icons.emoji_events_outlined,
    iconSelected: Icons.emoji_events_rounded,
    accent: Color(0xFFEAB308),
  ),
  _ChipOption(
    value: 'EITHER',
    label: 'Either',
    icon: Icons.shuffle_rounded,
    iconSelected: Icons.shuffle_rounded,
    accent: Color(0xFF22C55E),
  ),
];

const _timeOptions = <_ChipOption>[
  _ChipOption(
    value: 'MORNING',
    label: 'Morning',
    icon: Icons.light_mode_outlined,
    iconSelected: Icons.light_mode_rounded,
    accent: Color(0xFFF97316),
  ),
  _ChipOption(
    value: 'AFTERNOON',
    label: 'Afternoon',
    icon: Icons.wb_cloudy_outlined,
    iconSelected: Icons.wb_cloudy_rounded,
    accent: Color(0xFF1A7AFF),
  ),
  _ChipOption(
    value: 'EVENING',
    label: 'Evening',
    icon: Icons.nights_stay_outlined,
    iconSelected: Icons.nights_stay_rounded,
    accent: Color(0xFF8B5CF6),
  ),
];

/// Where this screen sits in onboarding —
/// `OnboardingStep.basicProfile`..`padelInterest`, see
/// `core/onboarding/onboarding_step_route.dart`. The mock says "Step 4 of 4"
/// because the prototype is a four-screen excerpt; the real flow is ten, and
/// the sibling redesigned steps (tennis experience, padel interest) already
/// count against the real total.
const _totalSteps = 10;
const _thisStep = 6;

const _ink = Color(0xFF0F172A);
const _muted = Color(0xFF94A3B8);

/// The progress bar's far end. Blue to green reads as "nearly there" in the
/// mock; it is a one-off gradient, not a palette token.
const _progressEnd = Color(0xFF69DB7C);

/// Playing Preferences — `foundation/03-user-journeys.md` §2.
class PlayingPreferencesScreen extends ConsumerStatefulWidget {
  const PlayingPreferencesScreen({super.key});

  @override
  ConsumerState<PlayingPreferencesScreen> createState() =>
      _PlayingPreferencesScreenState();
}

class _PlayingPreferencesScreenState
    extends ConsumerState<PlayingPreferencesScreen> {
  String? _format;
  String? _style;
  final Set<String> _times = {};
  bool _isSubmitting = false;
  String? _errorText;

  bool get _canContinue =>
      _format != null && _style != null && _times.isNotEmpty;

  Future<void> _submit() async {
    if (!_canContinue) {
      setState(
        () => _errorText = 'Choose an option in each section to continue.',
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updatePreferences(
            formatPreference: _format!,
            stylePreference: _style!,
            preferredTimeSlots: _times.toList(),
          );
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
      backgroundColor: colors.background,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            const _StepHeader(step: _thisStep, total: _totalSteps),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _SectionCard(
                    label: 'Format',
                    child: _ChipGroup(
                      options: _formatOptions,
                      isSelected: (o) => _format == o.value,
                      // Single choice: tapping replaces rather than toggles,
                      // so a section can never end up empty once touched.
                      onTap: (o) => setState(() {
                        _format = o.value;
                        _errorText = null;
                      }),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    label: 'Style',
                    child: _ChipGroup(
                      options: _styleOptions,
                      isSelected: (o) => _style == o.value,
                      onTap: (o) => setState(() {
                        _style = o.value;
                        _errorText = null;
                      }),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    label: 'Preferred times',
                    note: 'select all that apply',
                    child: _ChipGroup(
                      options: _timeOptions,
                      isSelected: (o) => _times.contains(o.value),
                      onTap: (o) => setState(() {
                        if (!_times.remove(o.value)) _times.add(o.value);
                        _errorText = null;
                      }),
                    ),
                  ),
                  // The mock reserves this row whether or not the message
                  // shows, so nothing below it shifts.
                  const SizedBox(height: 12),
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
                ],
              ),
            ),
            _ContinueBar(
              active: _canContinue,
              loading: _isSubmitting,
              onPressed: _isSubmitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }
}

/// White header band: back button, step eyebrow, title, and a single
/// gradient progress bar filled to [step] / [total].
class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.step, required this.total});

  final int step;
  final int total;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final hairline = Color.alphaBlend(
      colors.primary.withValues(alpha: 0.08),
      colors.surface,
    );
    // Onboarding steps are server driven and usually entered with `go`, which
    // leaves nothing to pop. Show the control only when it would do something.
    final canPop = Navigator.of(context).canPop();

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(bottom: BorderSide(color: hairline)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (canPop) ...[
                _BackButton(onTap: () => Navigator.of(context).pop()),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Step $step of $total',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        height: 1.2,
                        color: colors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Playing Preferences',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        height: 1.1,
                        color: _ink,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _ProgressBar(fraction: step / total),
        ],
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: colors.background,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: Color.alphaBlend(
                colors.primary.withValues(alpha: 0.14),
                colors.surface,
              ),
              width: 1.5,
            ),
          ),
          child: const Icon(Icons.arrow_back_rounded, size: 20, color: _ink),
        ),
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.fraction});

  final double fraction;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: Container(
        height: 4,
        color: colors.primary.withValues(alpha: 0.14),
        child: FractionallySizedBox(
          alignment: Alignment.centerLeft,
          widthFactor: fraction.clamp(0.0, 1.0),
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [colors.primary, _progressEnd],
              ),
              borderRadius: BorderRadius.circular(99),
            ),
          ),
        ),
      ),
    );
  }
}

/// White card holding one labelled group of chips.
class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.label, required this.child, this.note});

  final String label;
  final String? note;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Color.alphaBlend(
            colors.primary.withValues(alpha: 0.1),
            colors.surface,
          ),
          width: 1.5,
        ),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 4, bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: _ink,
                  ),
                ),
                if (note != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    note!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                      height: 1.2,
                      color: _muted,
                    ),
                  ),
                ],
              ],
            ),
          ),
          child,
        ],
      ),
    );
  }
}

/// Three equal chips in a row. A `Row` of `Expanded`s rather than a grid: the
/// count is fixed at three and this keeps the chips out of a nested scrollable.
class _ChipGroup extends StatelessWidget {
  const _ChipGroup({
    required this.options,
    required this.isSelected,
    required this.onTap,
  });

  final List<_ChipOption> options;
  final bool Function(_ChipOption) isSelected;
  final void Function(_ChipOption) onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < options.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: _OptionChip(
              option: options[i],
              selected: isSelected(options[i]),
              onTap: () => onTap(options[i]),
            ),
          ),
        ],
      ],
    );
  }
}

class _OptionChip extends StatelessWidget {
  const _OptionChip({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final _ChipOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final accent = option.accent;
    // #E2EAFF in the mock: a brand-tinted hairline rather than the neutral
    // `colors.border`, derived so it tracks whatever the primary is.
    final idleBorder = Color.alphaBlend(
      colors.primary.withValues(alpha: 0.18),
      colors.surface,
    );

    return Semantics(
      selected: selected,
      button: true,
      label: option.label,
      child: AnimatedScale(
        scale: selected ? 1.03 : 1,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            color: selected
                ? Color.alphaBlend(
                    accent.withValues(alpha: 0.07),
                    colors.surface,
                  )
                : colors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? accent : idleBorder,
              width: selected ? 2 : 1.5,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.16),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                    BoxShadow(
                      color: accent.withValues(alpha: 0.06),
                      spreadRadius: 3,
                    ),
                  ]
                : const [
                    BoxShadow(
                      color: Color(0x0A000000),
                      blurRadius: 3,
                      offset: Offset(0, 1),
                    ),
                  ],
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 14,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: accent.withValues(
                          alpha: selected ? 0.13 : 0.06,
                        ),
                        borderRadius: BorderRadius.circular(11),
                        border: Border.all(
                          color: accent.withValues(
                            alpha: selected ? 0.25 : 0.12,
                          ),
                          width: 1.5,
                        ),
                      ),
                      child: Icon(
                        selected ? option.iconSelected : option.icon,
                        size: 20,
                        color: accent,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      option.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: selected
                            ? FontWeight.w700
                            : FontWeight.w500,
                        height: 1.2,
                        color: selected ? accent : _ink,
                      ),
                    ),
                    // Reserved whether or not the dot shows: the mock lets the
                    // chip grow on selection, which would jog the whole row.
                    const SizedBox(height: 6),
                    SizedBox(
                      height: 6,
                      child: selected
                          ? Center(
                              child: Container(
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: accent,
                                ),
                              ),
                            )
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Pinned footer holding the CTA, on its own white band above the gesture
/// inset so the button never sits under the home indicator.
class _ContinueBar extends StatelessWidget {
  const _ContinueBar({
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
    final hairline = Color.alphaBlend(
      colors.primary.withValues(alpha: 0.08),
      colors.surface,
    );

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(top: BorderSide(color: hairline)),
      ),
      padding: EdgeInsets.fromLTRB(
        16,
        8,
        16,
        24 + MediaQuery.viewPaddingOf(context).bottom,
      ),
      child: AnimatedContainer(
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
          color: active
              ? colors.primary
              : Color.alphaBlend(
                  colors.primary.withValues(alpha: 0.14),
                  colors.surface,
                ),
          borderRadius: BorderRadius.circular(14),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            // Still tappable when incomplete: the tap is what surfaces the
            // "choose an option in each section" message, as in the mock.
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
                        'Continue  →',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          height: 1.2,
                          color: active ? Colors.white : _muted,
                        ),
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
