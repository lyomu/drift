import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import 'widgets/onboarding_scaffold.dart';

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
    return DriftOnboardingScaffold(
      step: OnboardingStepIndex.playingPreferences,
      title: 'How do you like to play?',
      highlight: 'play?',
      subtitle: 'This shapes who we match you with.',
      ctaActive: _canContinue,
      loading: _isSubmitting,
      onContinue: _isSubmitting ? null : _submit,
      errorText: _errorText,
      children: [
        _SectionCard(
          label: 'Format',
          child: _ChipGroup(
            options: _formatOptions,
            isSelected: (o) => _format == o.value,
            // Single choice: tapping replaces rather than toggles, so a
            // section can never end up empty once touched.
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
      ],
    );
  }
}

/// White header band: back button, step eyebrow, title, and a single
/// gradient progress bar filled to [step] / [total].
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
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: colors.textPrimary,
                  ),
                ),
                if (note != null) ...[
                  const SizedBox(width: 6),
                  Text(
                    note!,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w400,
                      height: 1.2,
                      color: colors.textSecondary,
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
                        color: selected ? accent : colors.textPrimary,
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
