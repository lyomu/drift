import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_symbol.dart';
import '../../auth/data/auth_repository.dart';
import '../application/learning_providers.dart';
import '../data/learning_repository.dart';

/// Drift's official readable text family.
const _font = 'Outfit';

const _ink = Color(0xFF0F172A);
const _slate = Color(0xFF64748B);
const _muted = Color(0xFF94A3B8);

/// The `AssessmentPillar` values a practice session can target. FOOTWORK was
/// added to the enum for this screen (2026-10) — it has no assessment
/// questions, so it scores from practice alone.
const _skillOptions = [
  (value: 'FOREHAND', label: 'Forehand'),
  (value: 'BACKHAND', label: 'Backhand'),
  (value: 'SERVE', label: 'Serve'),
  (value: 'RETURN', label: 'Return'),
  (value: 'NET_PLAY', label: 'Net Play'),
  (value: 'MOVEMENT', label: 'Movement'),
  (value: 'MATCH_PLAY', label: 'Match Play'),
  (value: 'FOOTWORK', label: 'Footwork'),
];

/// 1–5 self-rating. `accent: null` takes the theme's brand colour, which is
/// what the mock gives the top rating.
const _ratings = [
  (emoji: '😣', label: 'Rough', accent: Color(0xFFEF4444)),
  (emoji: '😕', label: 'Okay', accent: Color(0xFFF97316)),
  (emoji: '😐', label: 'Good', accent: Color(0xFFEAB308)),
  (emoji: '😊', label: 'Great', accent: Color(0xFF22C55E)),
  (emoji: '🤩', label: 'Peak', accent: null),
];

const _months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const _durationStep = 5;
const _durationMin = 5;
const _durationMax = 240;

/// Add Practice Session — `foundation/04-screen-inventory.md` §A.7. "Kept
/// lightweight, not a long form" (Doc 3 §8) — date, duration, skill focus,
/// optional drill, notes, and a 1-5 self-rating.
class AddPracticeSessionScreen extends ConsumerStatefulWidget {
  const AddPracticeSessionScreen({super.key, this.drillId, this.skillFocus});

  final String? drillId;
  final String? skillFocus;

  @override
  ConsumerState<AddPracticeSessionScreen> createState() =>
      _AddPracticeSessionScreenState();
}

class _AddPracticeSessionScreenState
    extends ConsumerState<AddPracticeSessionScreen> {
  final _notesController = TextEditingController();
  late DateTime _occurredAt = DateTime.now();
  late String? _skillFocus = widget.skillFocus;
  int _durationMinutes = 30;
  int? _perceivedPerformance;
  bool _isSubmitting = false;
  String? _errorText;

  bool get _canSave => _skillFocus != null && _perceivedPerformance != null;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _occurredAt,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _occurredAt = picked);
  }

  void _stepDuration(int delta) {
    setState(() {
      _durationMinutes = (_durationMinutes + delta).clamp(
        _durationMin,
        _durationMax,
      );
    });
  }

  Future<void> _submit() async {
    if (!_canSave) return;

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      await ref
          .read(learningRepositoryProvider)
          .logPracticeSession(
            occurredAt: _occurredAt,
            durationMinutes: _durationMinutes,
            skillFocus: _skillFocus!,
            drillId: widget.drillId,
            notes: _notesController.text.trim(),
            perceivedPerformance: _perceivedPerformance!,
          );
      ref.invalidate(practiceSessionsProvider);
      ref.invalidate(skillProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Header(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _DateRow(date: _occurredAt, onTap: _pickDate),
                    const SizedBox(height: 20),
                    const _FieldLabel('Skill focus'),
                    _SkillGrid(
                      selected: _skillFocus,
                      onSelect: (value) => setState(() {
                        _skillFocus = value;
                        _errorText = null;
                      }),
                    ),
                    const SizedBox(height: 20),
                    const _FieldLabel('Duration'),
                    _DurationStepper(
                      minutes: _durationMinutes,
                      onDecrement: () => _stepDuration(-_durationStep),
                      onIncrement: () => _stepDuration(_durationStep),
                    ),
                    const SizedBox(height: 20),
                    const _FieldLabel('How did it feel?'),
                    _RatingRow(
                      selected: _perceivedPerformance,
                      onSelect: (value) => setState(() {
                        _perceivedPerformance = value;
                        _errorText = null;
                      }),
                    ),
                    const SizedBox(height: 20),
                    const _FieldLabel('Notes', optional: true),
                    _NotesField(controller: _notesController),
                    if (_errorText != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _errorText!,
                        style: const TextStyle(
                          fontFamily: _font,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.33,
                          color: Color(0xFFEF4444),
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),
                    _SaveButton(
                      enabled: _canSave,
                      loading: _isSubmitting,
                      onPressed: _isSubmitting ? null : _submit,
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(bottom: BorderSide(color: _hairline(colors), width: 1)),
      ),
      child: Row(
        children: [
          Material(
            color: _tintedFill(colors),
            borderRadius: BorderRadius.circular(12),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () {
                if (context.canPop()) context.pop();
              },
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _tintedBorder(colors), width: 1.5),
                ),
                child: const Icon(
                  DriftSymbolsFilled.arrowBack,
                  size: 20,
                  color: _ink,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'Log Practice',
            style: TextStyle(
              fontFamily: _font,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              height: 1.2,
              color: _ink,
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text, {this.optional = false});

  final String text;
  final bool optional;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(text: text),
            if (optional)
              const TextSpan(
                text: ' (optional)',
                style: TextStyle(fontWeight: FontWeight.w400, color: _muted),
              ),
          ],
        ),
        style: const TextStyle(
          fontFamily: _font,
          fontSize: 13,
          fontWeight: FontWeight.w700,
          height: 1.3,
          color: _ink,
        ),
      ),
    );
  }
}

/// The session date. The mock prints today and stops; this opens the picker,
/// because the live screen has always allowed back-dating a session.
class _DateRow extends StatelessWidget {
  const _DateRow({required this.date, required this.onTap});

  final DateTime date;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Material(
      color: colors.primary.withValues(alpha: 0.05),
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colors.primary.withValues(alpha: 0.13),
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Icon(
                DriftSymbolsFilled.calendarToday,
                size: 18,
                color: colors.primary,
              ),
              const SizedBox(width: 12),
              Text(
                '${date.day} ${_months[date.month - 1]} ${date.year}',
                style: TextStyle(
                  fontFamily: _font,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  height: 1.3,
                  color: colors.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Two-column grid of skill chips. Single-select: the API stores one
/// `skillFocus` per session and `skill-score.ts` groups on it, so a second
/// tap replaces the choice rather than adding to it.
class _SkillGrid extends StatelessWidget {
  const _SkillGrid({required this.selected, required this.onSelect});

  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var row = 0; row < (_skillOptions.length + 1) ~/ 2; row++) ...[
          if (row > 0) const SizedBox(height: 8),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var col = 0; col < 2; col++) ...[
                  if (col > 0) const SizedBox(width: 8),
                  Expanded(
                    child: row * 2 + col < _skillOptions.length
                        ? _SkillChip(
                            option: _skillOptions[row * 2 + col],
                            selected:
                                selected == _skillOptions[row * 2 + col].value,
                            onTap: () =>
                                onSelect(_skillOptions[row * 2 + col].value),
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _SkillChip extends StatelessWidget {
  const _SkillChip({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final ({String value, String label}) option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Material(
      color: selected
          ? colors.primary.withValues(alpha: 0.07)
          : colors.surface,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? colors.primary : _tintedBorder(colors),
              width: selected ? 2 : 1.5,
            ),
          ),
          child: Row(
            children: [
              if (selected) ...[
                Icon(
                  DriftSymbolsFilled600.checkCircle,
                  size: 14,
                  color: colors.primary,
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  option.label,
                  style: TextStyle(
                    fontFamily: _font,
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                    height: 1.3,
                    color: selected ? colors.primary : _ink,
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

class _DurationStepper extends StatelessWidget {
  const _DurationStepper({
    required this.minutes,
    required this.onDecrement,
    required this.onIncrement,
  });

  final int minutes;
  final VoidCallback onDecrement;
  final VoidCallback onIncrement;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _tintedBorder(colors), width: 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _StepperButton(
            icon: DriftSymbolsFilled600.remove,
            onTap: minutes > _durationMin ? onDecrement : null,
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$minutes',
                style: const TextStyle(
                  fontFamily: _font,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  height: 1.2,
                  color: _ink,
                ),
              ),
              const SizedBox(width: 4),
              const Text(
                'min',
                style: TextStyle(
                  fontFamily: _font,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: _slate,
                ),
              ),
            ],
          ),
          _StepperButton(
            icon: DriftSymbolsFilled600.add,
            onTap: minutes < _durationMax ? onIncrement : null,
          ),
        ],
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  const _StepperButton({required this.icon, required this.onTap});

  final IconData icon;

  /// Null at the clamp, so the control greys out rather than silently
  /// swallowing the tap.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final enabled = onTap != null;

    return Opacity(
      opacity: enabled ? 1 : 0.4,
      child: Material(
        color: colors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(8),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: colors.primary.withValues(alpha: 0.15),
                width: 1.5,
              ),
            ),
            child: Icon(icon, size: 18, color: colors.primary),
          ),
        ),
      ),
    );
  }
}

class _RatingRow extends StatelessWidget {
  const _RatingRow({required this.selected, required this.onSelect});

  final int? selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Row(
      children: [
        for (var i = 0; i < _ratings.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: _RatingTile(
              emoji: _ratings[i].emoji,
              label: _ratings[i].label,
              accent: _ratings[i].accent ?? colors.primary,
              selected: selected == i + 1,
              onTap: () => onSelect(i + 1),
            ),
          ),
        ],
      ],
    );
  }
}

class _RatingTile extends StatelessWidget {
  const _RatingTile({
    required this.emoji,
    required this.label,
    required this.accent,
    required this.selected,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final Color accent;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Material(
      color: selected ? accent.withValues(alpha: 0.08) : colors.surface,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? accent : _tintedBorder(colors),
              width: selected ? 2 : 1.5,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 20, height: 1.2)),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontFamily: _font,
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                  height: 1.2,
                  color: selected ? accent : _muted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotesField extends StatelessWidget {
  const _NotesField({required this.controller});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _tintedBorder(colors), width: 1.5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: TextField(
        controller: controller,
        minLines: 3,
        maxLines: 6,
        textCapitalization: TextCapitalization.sentences,
        cursorColor: colors.primary,
        style: const TextStyle(
          fontFamily: _font,
          fontSize: 13,
          fontWeight: FontWeight.w400,
          height: 1.5,
          color: _ink,
        ),
        decoration: const InputDecoration(
          hintText: 'What did you work on? Any breakthroughs?',
          hintStyle: TextStyle(
            fontFamily: _font,
            fontSize: 13,
            fontWeight: FontWeight.w400,
            height: 1.5,
            color: _muted,
          ),
          isDense: true,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: EdgeInsets.zero,
          filled: false,
        ),
      ),
    );
  }
}

class _SaveButton extends StatelessWidget {
  const _SaveButton({
    required this.enabled,
    required this.loading,
    required this.onPressed,
  });

  final bool enabled;
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
        boxShadow: enabled
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
        color: enabled ? colors.primary : _tintedBorder(colors),
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          // Disabled until a skill and a rating are chosen, matching the
          // mock — the old screen let you submit and then showed an error.
          onTap: enabled ? onPressed : null,
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
                      'Save Practice',
                      style: TextStyle(
                        fontFamily: _font,
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        height: 1.2,
                        color: enabled ? Colors.white : _muted,
                      ),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Brand-tinted neutrals — the mock's #F0F4FF / #F7F9FF / #E2EAFF are its blue
// at low opacity, derived here so they track the theme's primary.
// ---------------------------------------------------------------------------

Color _hairline(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.07), colors.surface);

Color _tintedFill(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.04), colors.surface);

Color _tintedBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.18), colors.surface);
