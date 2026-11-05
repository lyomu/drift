import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' hide TextDirection;

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_skill_icon.dart';
import '../../auth/data/auth_repository.dart';
import '../application/learning_providers.dart';
import '../data/learning_repository.dart';
import 'goal_catalog.dart';

/// Create Goal — three-step flow (skill → focus → build) plus a success
/// view, ported from the 2026-11 Figma Make redesign. The current rating is
/// prefilled from the player's computed score for the skill and can be
/// adjusted; it is sent as the goal's baseline.
class CreateGoalScreen extends ConsumerStatefulWidget {
  const CreateGoalScreen({super.key, this.initialSkill});

  final String? initialSkill;

  @override
  ConsumerState<CreateGoalScreen> createState() => _CreateGoalScreenState();
}

enum _Timeline { weeks4, weeks8, weeks12, custom, none }

class _MilestoneDraft {
  _MilestoneDraft(String text) : controller = TextEditingController(text: text);

  final TextEditingController controller;
  bool selected = true;
}

const _maxMilestones = 10;
const _defaultCurrent = 2.5;
const _defaultGain = 1.5;

class _CreateGoalScreenState extends ConsumerState<CreateGoalScreen> {
  final _scrollController = ScrollController();
  final _customMilestoneController = TextEditingController();

  int _step = 1;
  late String? _skill = goalSkills.contains(widget.initialSkill)
      ? widget.initialSkill
      : null;
  String? _focus;

  double _current = _defaultCurrent;
  double _target = _defaultCurrent + _defaultGain;
  bool _ratingEdited = false;

  _Timeline _timeline = _Timeline.weeks8;
  DateTime? _customDate;

  final List<_MilestoneDraft> _milestones = [];
  bool _showCustomMilestone = false;

  bool _submitting = false;
  bool _targetError = false;
  String? _error;
  Goal? _created;

  @override
  void dispose() {
    _scrollController.dispose();
    _customMilestoneController.dispose();
    for (final m in _milestones) {
      m.controller.dispose();
    }
    super.dispose();
  }

  // ── Navigation ────────────────────────────────────────────────────────

  void _goTo(int step) {
    setState(() {
      _step = step;
      _error = null;
    });
    if (_scrollController.hasClients) _scrollController.jumpTo(0);
  }

  void _back() {
    if (_step > 1) {
      _goTo(_step - 1);
    } else {
      context.pop();
    }
  }

  void _chooseSkill(String skill) {
    if (skill == _skill) return;
    setState(() {
      _skill = skill;
      _focus = null;
      _clearMilestones();
      _ratingEdited = false;
    });
  }

  void _clearMilestones() {
    for (final m in _milestones) {
      m.controller.dispose();
    }
    _milestones.clear();
  }

  void _goToBuild() {
    final skill = _skill;
    if (skill == null || _focus == null) return;
    if (_milestones.isEmpty) {
      _milestones.addAll(
        suggestedGoalMilestones(context.l10n, skill).map(_MilestoneDraft.new),
      );
    }
    if (!_ratingEdited) _applyPrefill(skill);
    _goTo(3);
  }

  /// Prefills current/target from the computed score for [skill], rounded to
  /// the slider's 0.5 steps. No-op while the profile hasn't loaded.
  void _applyPrefill(String skill) {
    final profile = ref.read(skillProfileProvider).valueOrNull;
    if (profile == null) return;
    double? score;
    for (final s in profile.skills) {
      if (s.skill == skill) score = s.score;
    }
    final current = score == null
        ? _defaultCurrent
        : ((score * 2).round() / 2).clamp(0.0, 5.5);
    _current = current;
    _target = math.min(6.0, current + _defaultGain);
  }

  // ── Rating ────────────────────────────────────────────────────────────

  void _setCurrent(double value) {
    setState(() {
      _ratingEdited = true;
      _current = value;
      if (_target <= value) _target = math.min(6.0, value + 0.5);
      _targetError = false;
    });
  }

  void _setTarget(double value) {
    setState(() {
      _ratingEdited = true;
      _target = value;
      _targetError = false;
    });
  }

  // ── Timeline ──────────────────────────────────────────────────────────

  DateTime? get _deadline => switch (_timeline) {
    _Timeline.weeks4 => _weeksFromNow(4),
    _Timeline.weeks8 => _weeksFromNow(8),
    _Timeline.weeks12 => _weeksFromNow(12),
    _Timeline.custom => _customDate,
    _Timeline.none => null,
  };

  DateTime _weeksFromNow(int weeks) {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day + weeks * 7);
  }

  Future<void> _pickCustomDate() async {
    setState(() {
      _timeline = _Timeline.custom;
      _error = null;
    });
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _customDate ?? now.add(const Duration(days: 30)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365 * 2)),
    );
    if (picked != null && mounted) setState(() => _customDate = picked);
  }

  // ── Milestones ────────────────────────────────────────────────────────

  void _addCustomMilestone() {
    final text = _customMilestoneController.text.trim();
    if (text.isEmpty || _milestones.length >= _maxMilestones) return;
    setState(() {
      _milestones.add(_MilestoneDraft(text));
      _customMilestoneController.clear();
      _showCustomMilestone = false;
    });
  }

  void _removeMilestone(_MilestoneDraft draft) {
    setState(() => _milestones.remove(draft));
    draft.controller.dispose();
  }

  List<String> get _selectedMilestones => [
    for (final m in _milestones)
      if (m.selected && m.controller.text.trim().isNotEmpty)
        m.controller.text.trim(),
  ];

  // ── Submit ────────────────────────────────────────────────────────────

  Future<void> _submit() async {
    final l = context.l10n;
    if (_target <= _current) {
      setState(() => _targetError = true);
      return;
    }
    if (_timeline == _Timeline.custom && _customDate == null) {
      setState(() => _error = l.goalCreateErrorCustomDate);
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final goal = await ref
          .read(learningRepositoryProvider)
          .createGoal(
            skill: _skill!,
            focus: _focus,
            baseline: _current,
            target: _target,
            deadline: _deadline,
            milestones: _selectedMilestones.take(_maxMilestones).toList(),
          );
      ref.invalidate(goalsProvider);
      if (!mounted) return;
      setState(() => _created = goal);
      if (_scrollController.hasClients) _scrollController.jumpTo(0);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _startOver() {
    setState(() {
      _created = null;
      _step = 1;
      _skill = null;
      _focus = null;
      _clearMilestones();
      _ratingEdited = false;
      _current = _defaultCurrent;
      _target = _defaultCurrent + _defaultGain;
      _timeline = _Timeline.weeks8;
      _customDate = null;
      _error = null;
      _targetError = false;
    });
  }

  // ── Build ─────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    // Keep the skill profile loaded so step 3 can prefill the current
    // rating; if it lands after the player reached step 3, apply it then.
    ref.watch(skillProfileProvider);
    ref.listen(skillProfileProvider, (_, next) {
      if (next.hasValue && _step == 3 && !_ratingEdited && _skill != null) {
        setState(() => _applyPrefill(_skill!));
      }
    });

    final created = _created;
    return PopScope(
      canPop: _step == 1 || created != null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        backgroundColor: colors.background,
        body: SafeArea(
          child: created != null
              ? _SuccessView(
                  goal: created,
                  deadline: _deadline,
                  onView: () =>
                      context.pushReplacement('/learn/goals/${created.id}'),
                  onCreateAnother: _startOver,
                )
              : Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        controller: _scrollController,
                        padding: const EdgeInsets.fromLTRB(
                          DriftSpacing.s5,
                          DriftSpacing.s3,
                          DriftSpacing.s5,
                          DriftSpacing.s4,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _StepHeader(step: _step, onBack: _back),
                            ...switch (_step) {
                              1 => _buildSkillStep(context),
                              2 => _buildFocusStep(context),
                              _ => _buildBuildStep(context),
                            },
                          ],
                        ),
                      ),
                    ),
                    _StickyAction(
                      label: _step == 3
                          ? context.l10n.goalCreateSubmit
                          : context.l10n.commonContinue,
                      loading: _submitting,
                      onPressed: switch (_step) {
                        1 => _skill == null ? null : () => _goTo(2),
                        2 => _focus == null ? null : _goToBuild,
                        _ => _submit,
                      },
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  List<Widget> _buildSkillStep(BuildContext context) {
    final l = context.l10n;
    return [
      const SizedBox(height: DriftSpacing.s8),
      _SectionHeading(
        title: l.goalCreateSkillHeading,
        subtitle: l.goalCreateSkillSub,
        index: '01',
      ),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.55,
        children: [
          for (final (i, skill) in goalSkills.indexed)
            _SkillCard(
              skill: skill,
              pattern: i % 4,
              selected: _skill == skill,
              onTap: () => _chooseSkill(skill),
            ),
        ],
      ),
    ];
  }

  List<Widget> _buildFocusStep(BuildContext context) {
    final l = context.l10n;
    final skill = _skill!;
    return [
      const SizedBox(height: DriftSpacing.s6),
      _ContextCard(
        skill: skill,
        eyebrow: l.goalCreateSelectedSkill,
        title: pillarLabel(l, skill),
        actionLabel: l.goalCreateChange,
        onAction: () => _goTo(1),
      ),
      const SizedBox(height: DriftSpacing.s6),
      _SectionHeading(
        title: l.goalCreateFocusHeading,
        subtitle: l.goalCreateFocusSub,
        index: '02',
      ),
      for (final focus in [...?goalFocusesBySkill[skill], goalFocusGeneral])
        Padding(
          padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
          child: _FocusOption(
            title: goalFocusLabel(l, focus),
            description: goalFocusDescription(l, skill, focus),
            selected: _focus == focus,
            onTap: () => setState(() => _focus = focus),
          ),
        ),
    ];
  }

  List<Widget> _buildBuildStep(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final skill = _skill!;
    final focus = _focus!;
    final deadline = _deadline;
    final deadlineLabel = deadline == null
        ? (_timeline == _Timeline.custom
              ? l.goalCreateChooseDate
              : l.goalCreateNoDeadline)
        : DateFormat.yMMMd(context.localeTag).format(deadline);

    return [
      const SizedBox(height: DriftSpacing.s6),
      _ContextCard(
        skill: skill,
        eyebrow: l.goalCreateYourGoal,
        title: pillarLabel(l, skill),
        trailingText: l.goalCreateFocusValue(goalFocusLabel(l, focus)),
        actionLabel: l.goalCreateEdit,
        onAction: () => _goTo(2),
      ),

      // Rating
      const SizedBox(height: DriftSpacing.s8),
      _SectionHeading(
        title: l.goalCreateTargetHeading,
        subtitle: l.goalCreateTargetSub,
        trailing: _InfoButton(
          onTap: () => showModalBottomSheet<void>(
            context: context,
            showDragHandle: true,
            builder: (context) => Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.goalCreateRatingInfoTitle, style: type.h4),
                  const SizedBox(height: DriftSpacing.s2),
                  Text(
                    l.goalCreateRatingInfoBody,
                    style: type.body.copyWith(color: colors.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      _RatingCard(
        current: _current,
        target: _target,
        hasError: _targetError,
        onCurrentChanged: _setCurrent,
        onTargetChanged: _setTarget,
      ),
      if (_targetError) _InlineError(message: l.goalCreateErrorTargetHigher),

      // Timeline
      const SizedBox(height: DriftSpacing.s8),
      _SectionHeading(
        title: l.goalCreateTimelineHeading,
        subtitle: l.goalCreateOptionalLater,
      ),
      _TimelineChips(
        selected: _timeline,
        onSelect: (t) => setState(() {
          _timeline = t;
          _error = null;
        }),
        onCustom: _pickCustomDate,
      ),
      const SizedBox(height: DriftSpacing.s3),
      Row(
        children: [
          Text(
            (_timeline == _Timeline.none
                    ? l.goalCreateTimeline
                    : l.goalCreateTargetDate)
                .toUpperCase(),
            style: type.caption.copyWith(
              color: colors.textSecondary.withValues(alpha: 0.75),
              letterSpacing: 0.6,
              fontSize: 11,
            ),
          ),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Text(
              deadlineLabel,
              style: type.caption.copyWith(
                color: colors.textPrimary.withValues(alpha: 0.8),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          _LinkButton(
            label: _timeline == _Timeline.none
                ? l.goalCreateAddDeadline
                : l.goalCreateNoDeadline,
            onTap: () => setState(() {
              _timeline = _timeline == _Timeline.none
                  ? _Timeline.weeks8
                  : _Timeline.none;
              _customDate = null;
              _error = null;
            }),
          ),
        ],
      ),

      // Milestones
      const SizedBox(height: DriftSpacing.s8),
      _SectionHeading(
        title: l.goalCreateMilestonesHeading,
        subtitle: l.goalCreateMilestonesSub,
      ),
      for (final draft in _milestones)
        Padding(
          padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
          child: _MilestoneRow(
            draft: draft,
            onToggle: () => setState(() => draft.selected = !draft.selected),
            onRemove: () => _removeMilestone(draft),
            onChanged: () => setState(() {}),
          ),
        ),
      if (_showCustomMilestone)
        _CustomMilestoneField(
          controller: _customMilestoneController,
          onSubmit: _addCustomMilestone,
          onChanged: () => setState(() {}),
        )
      else if (_milestones.length < _maxMilestones)
        Align(
          alignment: Alignment.centerLeft,
          child: _LinkButton(
            label: l.goalCreateAddCustomMilestone,
            icon: Icons.add_rounded,
            onTap: () => setState(() => _showCustomMilestone = true),
          ),
        ),

      // Summary
      const SizedBox(height: DriftSpacing.s8),
      _SectionHeading(
        title: l.goalCreateSummaryHeading,
        subtitle: l.goalCreateSummarySub,
      ),
      _SummaryCard(
        focus: '${pillarLabel(l, skill)} · ${goalFocusLabel(l, focus)}',
        rating:
            '${_current.toStringAsFixed(1)} → ${_target.toStringAsFixed(1)}',
        deadline: deadline == null
            ? l.goalCreateNone
            : DateFormat.yMMMd(context.localeTag).format(deadline),
        milestones: l.goalCreateMilestonesAdded(_selectedMilestones.length),
      ),
      if (_error != null) _InlineError(message: _error!),
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Pieces
// ═══════════════════════════════════════════════════════════════════════

class _StepHeader extends StatelessWidget {
  const _StepHeader({required this.step, required this.onBack});

  final int step;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final (title, subtitle) = switch (step) {
      1 => (l.goalCreateStep1Title, l.goalCreateStep1Subtitle),
      2 => (l.goalCreateStep2Title, l.goalCreateStep2Subtitle),
      _ => (l.goalCreateStep3Title, l.goalCreateStep3Subtitle),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: DriftHeaderSquareButton(
            icon: Icons.chevron_left_rounded,
            onTap: onBack,
          ),
        ),
        const SizedBox(height: DriftSpacing.s6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Text(
                title,
                style: type.h1.copyWith(letterSpacing: -0.8, height: 1.15),
              ),
            ),
            const SizedBox(width: DriftSpacing.s4),
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: SizedBox(
                width: 96,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      l.goalCreateStepOf(step, 3).toUpperCase(),
                      style: type.caption.copyWith(
                        color: colors.textSecondary,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: DriftSpacing.s2),
                    Row(
                      children: [
                        for (var i = 1; i <= 3; i++) ...[
                          if (i > 1) const SizedBox(width: 5),
                          Expanded(
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              height: 3,
                              decoration: BoxDecoration(
                                color: i <= step
                                    ? colors.primary
                                    : colors.border,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: DriftSpacing.s3),
        Text(
          subtitle,
          style: type.body.copyWith(
            color: colors.textSecondary,
            fontSize: 15,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.title,
    required this.subtitle,
    this.index,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final String? index;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
          if (index != null)
            Text(
              index!,
              style: type.caption.copyWith(
                color: colors.textSecondary.withValues(alpha: 0.55),
                fontWeight: FontWeight.w800,
                letterSpacing: 1.4,
                fontSize: 11,
              ),
            ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Rounded-square tinted glyph box (skill icon). Selected/active state
/// switches to the brand tint.
class _SkillGlyphBox extends StatelessWidget {
  const _SkillGlyphBox({
    required this.skill,
    this.size = 44,
    this.active = true,
  });

  final String skill;
  final double size;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: active
            ? colors.primary.withValues(alpha: 0.16)
            : colors.surfaceRaised,
        borderRadius: BorderRadius.circular(size * 0.29),
        border: Border.all(
          color: active
              ? colors.primary.withValues(alpha: 0.25)
              : colors.border.withValues(alpha: 0.6),
        ),
      ),
      child: DriftSkillIcon(
        skill,
        size: size * 0.6,
        color: active ? colors.primary : colors.textSecondary,
      ),
    );
  }
}

class _SkillCard extends StatelessWidget {
  const _SkillCard({
    required this.skill,
    required this.pattern,
    required this.selected,
    required this.onTap,
  });

  final String skill;
  final int pattern;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final radius = BorderRadius.circular(16);

    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              borderRadius: radius,
              border: Border.all(
                color: selected
                    ? colors.primary.withValues(alpha: 0.8)
                    : colors.border,
              ),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: selected
                    ? [
                        colors.primary.withValues(alpha: 0.24),
                        colors.primary.withValues(alpha: 0.1),
                      ]
                    : [colors.surface, colors.background],
              ),
            ),
            child: ClipRRect(
              borderRadius: radius,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _SkillCardPatternPainter(
                        pattern: pattern,
                        courtShape:
                            skill == 'NET_PLAY' || skill == 'MATCH_PLAY',
                        color: colors.textSecondary.withValues(
                          alpha: selected ? 0.38 : 0.22,
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 13, 14, 13),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _SkillGlyphBox(skill: skill, active: selected),
                        Text(
                          pillarLabel(context.l10n, skill),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: type.subtitle.copyWith(
                            fontWeight: FontWeight.w600,
                            color: selected
                                ? colors.textPrimary
                                : colors.textPrimary.withValues(alpha: 0.88),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (selected)
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: colors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          size: 15,
                          color: Colors.white,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Faint court-line decoration behind each skill card — four variants
/// (lines, arcs, stripes, dots) plus a corner circle or court outline.
class _SkillCardPatternPainter extends CustomPainter {
  _SkillCardPatternPainter({
    required this.pattern,
    required this.courtShape,
    required this.color,
  });

  final int pattern;
  final bool courtShape;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final w = size.width;
    final h = size.height;

    switch (pattern) {
      case 0:
        canvas.drawLine(Offset(w * 0.68, 0), Offset(w * 0.68, h), line);
        canvas.drawLine(Offset(0, h * 0.33), Offset(w, h * 0.33), line);
      case 1:
        final c = Offset(w * 1.1, h * 1.05);
        final d = math.sqrt(w * w + h * h);
        canvas.drawCircle(c, d * 0.35, line);
        canvas.drawCircle(c, d * 0.52, line);
      case 2:
        final stripe = Paint()
          ..color = color.withValues(alpha: color.a * 0.6)
          ..strokeWidth = 1;
        for (var x = -h; x < w; x += 24) {
          canvas.drawLine(Offset(x, h), Offset(x + h, 0), stripe);
        }
      default:
        final dot = Paint()..color = color;
        for (var x = 5.0; x < w; x += 12) {
          for (var y = 5.0; y < h; y += 12) {
            // Fade the dot grid in towards the bottom-right corner.
            final t = ((x / w) + (y / h)) / 2;
            if (t < 0.45) continue;
            canvas.drawCircle(Offset(x, y), 0.9, dot);
          }
        }
    }

    if (courtShape) {
      final rect = Rect.fromLTWH(w - 76, h - 38, 92, 52);
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(3)),
        line,
      );
    } else {
      // 74px ring hanging off the bottom-right corner (CSS: right -18,
      // bottom -23).
      canvas.drawCircle(Offset(w + 18 - 37, h + 23 - 37), 37, line);
    }
  }

  @override
  bool shouldRepaint(_SkillCardPatternPainter old) =>
      old.pattern != pattern ||
      old.color != color ||
      old.courtShape != courtShape;
}

class _ContextCard extends StatelessWidget {
  const _ContextCard({
    required this.skill,
    required this.eyebrow,
    required this.title,
    required this.actionLabel,
    required this.onAction,
    this.trailingText,
  });

  final String skill;
  final String eyebrow;
  final String title;
  final String? trailingText;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final radius = BorderRadius.circular(16);
    return Container(
      decoration: BoxDecoration(
        borderRadius: radius,
        border: Border.all(color: colors.primary.withValues(alpha: 0.22)),
        gradient: LinearGradient(
          colors: [colors.primary.withValues(alpha: 0.14), colors.surface],
        ),
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          children: [
            Positioned(
              right: -30,
              bottom: -46,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: colors.primary.withValues(alpha: 0.18),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(13),
              child: Row(
                children: [
                  _SkillGlyphBox(skill: skill, size: 48),
                  const SizedBox(width: DriftSpacing.s3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          eyebrow.toUpperCase(),
                          style: type.caption.copyWith(
                            color: colors.textSecondary,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: title,
                                style: type.title.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (trailingText != null)
                                TextSpan(
                                  text: '  $trailingText',
                                  style: type.caption.copyWith(
                                    color: colors.textSecondary,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  _LinkButton(
                    label: actionLabel,
                    icon: Icons.edit_outlined,
                    onTap: onAction,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FocusOption extends StatelessWidget {
  const _FocusOption({
    required this.title,
    required this.description,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String description;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final radius = BorderRadius.circular(14);
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      child: Material(
        color: selected
            ? colors.primary.withValues(alpha: 0.09)
            : colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(
            color: selected
                ? colors.primary.withValues(alpha: 0.72)
                : colors.border,
          ),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 21,
                  height: 21,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selected ? colors.primary : colors.border,
                      width: 1.4,
                    ),
                  ),
                  child: selected
                      ? Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: colors.primary,
                            shape: BoxShape.circle,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: DriftSpacing.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: type.subtitle.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        description,
                        style: type.caption.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InfoButton extends StatelessWidget {
  const _InfoButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: colors.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(
            Icons.info_outline_rounded,
            size: 19,
            color: colors.textSecondary,
            semanticLabel: context.l10n.goalCreateRatingInfoTitle,
          ),
        ),
      ),
    );
  }
}

class _RatingCard extends StatelessWidget {
  const _RatingCard({
    required this.current,
    required this.target,
    required this.hasError,
    required this.onCurrentChanged,
    required this.onTargetChanged,
  });

  final double current;
  final double target;
  final bool hasError;
  final ValueChanged<double> onCurrentChanged;
  final ValueChanged<double> onTargetChanged;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final improvement = target - current;
    final valid = improvement > 0;

    Widget value(String label, double v, Color color) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: type.caption.copyWith(
            color: colors.textSecondary,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 6),
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: v.toStringAsFixed(1),
                style: type.h2.copyWith(color: color, letterSpacing: -0.8),
              ),
              TextSpan(
                text: ' /6',
                style: type.caption.copyWith(color: colors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: hasError ? colors.error : colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: value(
                    l.goalCreateCurrentRating,
                    current,
                    colors.textPrimary,
                  ),
                ),
                VerticalDivider(width: 1, color: colors.border),
                const SizedBox(width: 14),
                Expanded(
                  child: value(
                    l.goalCreateTargetRating,
                    target,
                    colors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DriftSpacing.s4),
          Opacity(
            opacity: 0.8,
            child: _RatingSlider(
              value: current,
              min: 0,
              max: 5.5,
              semanticLabel: l.goalCreateCurrentRating,
              onChanged: onCurrentChanged,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                for (var i = 0; i <= 6; i++)
                  Text(
                    '$i',
                    style: type.caption.copyWith(
                      color: colors.textSecondary.withValues(alpha: 0.7),
                      fontSize: 10,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: DriftSpacing.s4),
          Text(
            l.goalCreateSetTarget,
            style: type.caption.copyWith(
              color: colors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: DriftSpacing.s1),
          _RatingSlider(
            value: target,
            min: 0.5,
            max: 6,
            semanticLabel: l.goalCreateTargetRating,
            onChanged: onTargetChanged,
          ),
          const SizedBox(height: DriftSpacing.s3),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: (valid ? colors.success : colors.error).withValues(
                alpha: 0.1,
              ),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: (valid ? colors.success : colors.error).withValues(
                  alpha: 0.25,
                ),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  valid
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.info_outline_rounded,
                  size: 16,
                  color: valid ? colors.success : colors.error,
                ),
                const SizedBox(width: 5),
                Text(
                  valid
                      ? l.goalCreateImprovement(
                          NumberFormat(
                            '0.0',
                            context.localeTag,
                          ).format(improvement),
                        )
                      : l.goalCreateTargetMustBeHigher,
                  style: type.caption.copyWith(
                    color: valid ? colors.success : colors.error,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DriftSpacing.s3),
          Text(
            l.goalCreateTargetDisclaimer,
            style: type.caption.copyWith(
              color: colors.textSecondary.withValues(alpha: 0.75),
              fontSize: 11,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _RatingSlider extends StatelessWidget {
  const _RatingSlider({
    required this.value,
    required this.min,
    required this.max,
    required this.semanticLabel,
    required this.onChanged,
  });

  final double value;
  final double min;
  final double max;
  final String semanticLabel;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Semantics(
      label: semanticLabel,
      child: SliderTheme(
        data: SliderTheme.of(context).copyWith(
          trackHeight: 4,
          activeTrackColor: colors.primary,
          inactiveTrackColor: colors.border,
          thumbColor: colors.primary,
          overlayColor: colors.primary.withValues(alpha: 0.16),
          thumbShape: _RingThumbShape(ring: colors.primaryLight),
          overlayShape: const RoundSliderOverlayShape(overlayRadius: 18),
          tickMarkShape: SliderTickMarkShape.noTickMark,
          showValueIndicator: ShowValueIndicator.never,
        ),
        child: Slider(
          value: value.clamp(min, max),
          min: min,
          max: max,
          divisions: ((max - min) * 2).round(),
          onChanged: onChanged,
        ),
      ),
    );
  }
}

/// Filled brand-blue thumb with a pale ring, matching the redesign's range
/// inputs.
class _RingThumbShape extends SliderComponentShape {
  const _RingThumbShape({required this.ring});

  final Color ring;

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) =>
      const Size.fromRadius(11);

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final canvas = context.canvas;
    canvas.drawCircle(
      center,
      14,
      Paint()..color = sliderTheme.thumbColor!.withValues(alpha: 0.2),
    );
    canvas.drawCircle(center, 11, Paint()..color = ring);
    canvas.drawCircle(center, 7, Paint()..color = sliderTheme.thumbColor!);
  }
}

class _TimelineChips extends StatelessWidget {
  const _TimelineChips({
    required this.selected,
    required this.onSelect,
    required this.onCustom,
  });

  final _Timeline selected;
  final ValueChanged<_Timeline> onSelect;
  final VoidCallback onCustom;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget chip(_Timeline t, String label, {IconData? icon}) => Expanded(
      child: _Chip(
        label: label,
        icon: icon,
        selected: selected == t,
        onTap: t == _Timeline.custom ? onCustom : () => onSelect(t),
      ),
    );

    return Column(
      children: [
        Row(
          children: [
            chip(_Timeline.weeks4, l.goalCreateWeeks(4)),
            const SizedBox(width: DriftSpacing.s2),
            chip(_Timeline.weeks8, l.goalCreateWeeks(8)),
          ],
        ),
        const SizedBox(height: DriftSpacing.s2),
        Row(
          children: [
            chip(_Timeline.weeks12, l.goalCreateWeeks(12)),
            const SizedBox(width: DriftSpacing.s2),
            chip(
              _Timeline.custom,
              l.goalCreateCustomDate,
              icon: Icons.calendar_today_outlined,
            ),
          ],
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.icon,
  });

  final String label;
  final IconData? icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final radius = BorderRadius.circular(12);
    final fg = selected ? colors.textPrimary : colors.textSecondary;
    return Material(
      color: selected ? colors.primary.withValues(alpha: 0.12) : colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(
          color: selected
              ? colors.primary.withValues(alpha: 0.65)
              : colors.border,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: radius,
        child: SizedBox(
          height: 48,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: fg),
                const SizedBox(width: 6),
              ],
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: type.label.copyWith(color: fg),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MilestoneRow extends StatelessWidget {
  const _MilestoneRow({
    required this.draft,
    required this.onToggle,
    required this.onRemove,
    required this.onChanged,
  });

  final _MilestoneDraft draft;
  final VoidCallback onToggle;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final selected = draft.selected;
    return Container(
      constraints: const BoxConstraints(minHeight: 56),
      padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(
          color: selected
              ? colors.primary.withValues(alpha: 0.28)
              : colors.border,
        ),
      ),
      child: Row(
        children: [
          Semantics(
            checked: selected,
            child: InkWell(
              onTap: onToggle,
              borderRadius: BorderRadius.circular(6),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: selected ? colors.primary : Colors.transparent,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: selected ? colors.primary : colors.border,
                    width: 1.4,
                  ),
                ),
                child: selected
                    ? const Icon(
                        Icons.check_rounded,
                        size: 16,
                        color: Colors.white,
                      )
                    : null,
              ),
            ),
          ),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: TextField(
              controller: draft.controller,
              onChanged: (_) => onChanged(),
              maxLength: 200,
              minLines: 1,
              maxLines: 3,
              style: type.bodySmall.copyWith(
                color: selected
                    ? colors.textPrimary.withValues(alpha: 0.88)
                    : colors.textSecondary,
              ),
              decoration: const InputDecoration(
                isDense: true,
                counterText: '',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                contentPadding: EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          IconButton(
            onPressed: onRemove,
            tooltip: context.l10n.goalCreateRemoveMilestone,
            icon: Icon(
              Icons.close_rounded,
              size: 20,
              color: colors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _CustomMilestoneField extends StatelessWidget {
  const _CustomMilestoneField({
    required this.controller,
    required this.onSubmit,
    required this.onChanged,
  });

  final TextEditingController controller;
  final VoidCallback onSubmit;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final canSubmit = controller.text.trim().isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(top: DriftSpacing.s1),
      padding: const EdgeInsets.fromLTRB(14, 4, 5, 4),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.primary),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              autofocus: true,
              maxLength: 200,
              onChanged: (_) => onChanged(),
              onSubmitted: (_) => onSubmit(),
              textInputAction: TextInputAction.done,
              style: type.bodySmall.copyWith(color: colors.textPrimary),
              decoration: InputDecoration(
                hintText: context.l10n.goalCreateMilestoneHint,
                hintStyle: type.bodySmall.copyWith(
                  color: colors.textSecondary.withValues(alpha: 0.75),
                ),
                isDense: true,
                counterText: '',
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
              ),
            ),
          ),
          Material(
            color: canSubmit ? colors.primary : colors.border,
            borderRadius: BorderRadius.circular(9),
            child: InkWell(
              onTap: canSubmit ? onSubmit : null,
              borderRadius: BorderRadius.circular(9),
              child: SizedBox(
                width: 40,
                height: 40,
                child: Icon(
                  Icons.check_rounded,
                  size: 19,
                  color: canSubmit ? Colors.white : colors.textSecondary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.focus,
    required this.rating,
    required this.deadline,
    required this.milestones,
  });

  final String focus;
  final String rating;
  final String deadline;
  final String milestones;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final divider = BorderSide(color: colors.border);

    Widget cell(String label, String value) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Eyebrow(label),
        const SizedBox(height: 6),
        Text(value, style: type.label.copyWith(color: colors.textPrimary)),
      ],
    );

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: cell(l.goalCreateSummaryFocus, focus),
          ),
          Container(
            decoration: BoxDecoration(border: Border(top: divider)),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    flex: 4,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: cell(l.goalCreateSummaryRating, rating),
                    ),
                  ),
                  VerticalDivider(width: 1, color: colors.border),
                  Expanded(
                    flex: 6,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: cell(l.goalDeadline, deadline),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: colors.background.withValues(alpha: 0.5),
              border: Border(top: divider),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.emoji_events_outlined,
                  size: 17,
                  color: colors.textSecondary,
                ),
                const SizedBox(width: 6),
                Text(
                  milestones,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Eyebrow extends StatelessWidget {
  const _Eyebrow(this.text, {this.color});

  final String text;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Text(
      text.toUpperCase(),
      style: type.caption.copyWith(
        color: color ?? colors.textSecondary.withValues(alpha: 0.8),
        fontSize: 10,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.8,
      ),
    );
  }
}

class _InlineError extends StatelessWidget {
  const _InlineError({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.only(top: DriftSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, size: 16, color: colors.error),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              message,
              style: type.caption.copyWith(color: colors.error),
            ),
          ),
        ],
      ),
    );
  }
}

/// Small brand-coloured inline action ("Edit", "No deadline", "+ Add
/// custom milestone").
class _LinkButton extends StatelessWidget {
  const _LinkButton({required this.label, required this.onTap, this.icon});

  final String label;
  final IconData? icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        foregroundColor: colors.primary,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 17, color: colors.primary),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: type.label.copyWith(
              color: colors.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

/// Bottom-pinned CTA that fades the scrolling content out above it.
class _StickyAction extends StatelessWidget {
  const _StickyAction({
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final enabled = onPressed != null;
    return Container(
      padding: const EdgeInsets.fromLTRB(
        DriftSpacing.s5,
        DriftSpacing.s3,
        DriftSpacing.s5,
        DriftSpacing.s4,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: const [0, 0.2],
          colors: [colors.background.withValues(alpha: 0), colors.background],
        ),
      ),
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          boxShadow: enabled && !loading
              ? [
                  BoxShadow(
                    color: colors.primary.withValues(alpha: 0.25),
                    blurRadius: 28,
                    offset: const Offset(0, 12),
                  ),
                ]
              : null,
        ),
        child: DriftPrimaryButton(
          label: label,
          onPressed: onPressed,
          loading: loading,
          verticalPadding: 17,
          trailingIcon: Icons.chevron_right_rounded,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Success
// ═══════════════════════════════════════════════════════════════════════

class _SuccessView extends StatelessWidget {
  const _SuccessView({
    required this.goal,
    required this.deadline,
    required this.onView,
    required this.onCreateAnother,
  });

  final Goal goal;
  final DateTime? deadline;
  final VoidCallback onView;
  final VoidCallback onCreateAnother;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final skillLabel = pillarLabel(l, goal.skill);
    final focus = goal.focus;
    final goalDeadline = goal.deadline ?? deadline;

    Widget stat(String label, String value) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Eyebrow(label),
        const SizedBox(height: 4),
        Text(
          value,
          style: type.subtitle.copyWith(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );

    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: DriftSpacing.s5),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: DriftSpacing.s6),
              const Center(child: _SuccessArt()),
              const SizedBox(height: DriftSpacing.s6),
              Center(
                child: _Eyebrow(l.goalCreatedEyebrow, color: colors.primary),
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                l.goalCreatedTitle,
                textAlign: TextAlign.center,
                style: type.h1.copyWith(letterSpacing: -0.8),
              ),
              const SizedBox(height: DriftSpacing.s3),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: DriftSpacing.s4,
                ),
                child: Text(
                  l.goalCreatedBody(skillLabel.toLowerCase()),
                  textAlign: TextAlign.center,
                  style: type.body.copyWith(
                    color: colors.textSecondary,
                    height: 1.6,
                  ),
                ),
              ),
              const SizedBox(height: DriftSpacing.s6),
              Container(
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: BorderRadius.circular(17),
                  border: Border.all(color: colors.border),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          _SkillGlyphBox(skill: goal.skill, size: 46),
                          const SizedBox(width: DriftSpacing.s3),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  skillLabel,
                                  style: type.title.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                if (focus != null)
                                  Text(
                                    goalFocusLabel(l, focus),
                                    style: type.caption.copyWith(
                                      color: colors.textSecondary,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Divider(height: 1, color: colors.border),
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 4,
                            child: stat(
                              l.goalCreatedStart,
                              goal.baseline.toStringAsFixed(1),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(right: 12),
                            child: Icon(
                              Icons.chevron_right_rounded,
                              size: 20,
                              color: colors.textSecondary.withValues(
                                alpha: 0.7,
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 4,
                            child: stat(
                              l.goalTarget,
                              goal.target.toStringAsFixed(1),
                            ),
                          ),
                          Expanded(
                            flex: 5,
                            child: stat(
                              l.goalDeadline,
                              goalDeadline == null
                                  ? l.goalCreatedOpen
                                  : DateFormat.MMMd(
                                      context.localeTag,
                                    ).format(goalDeadline),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: DriftSpacing.s6),
              DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: colors.primary.withValues(alpha: 0.25),
                      blurRadius: 28,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: DriftPrimaryButton(
                  label: l.goalCreatedView,
                  onPressed: onView,
                  verticalPadding: 17,
                  trailingIcon: Icons.chevron_right_rounded,
                ),
              ),
              const SizedBox(height: DriftSpacing.s3),
              Center(
                child: TextButton(
                  onPressed: onCreateAnother,
                  style: TextButton.styleFrom(
                    foregroundColor: colors.textSecondary,
                  ),
                  child: Text(
                    l.goalCreatedAnother,
                    style: type.label.copyWith(color: colors.textSecondary),
                  ),
                ),
              ),
              const SizedBox(height: DriftSpacing.s6),
            ],
          ),
        ),
      ),
    );
  }
}

/// Check badge inside two faint orbits with a dot on each, popping in.
class _SuccessArt extends StatelessWidget {
  const _SuccessArt();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return SizedBox(
      width: 150,
      height: 150,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: const Size.square(150),
            painter: _OrbitPainter(
              ring: colors.primary.withValues(alpha: 0.18),
              dot: colors.primary,
            ),
          ),
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: colors.primary.withValues(alpha: 0.08),
            ),
          ),
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.5, end: 1),
            duration: const Duration(milliseconds: 550),
            curve: Curves.easeOutBack,
            builder: (context, t, child) => Opacity(
              opacity: ((t - 0.5) * 2).clamp(0.0, 1.0),
              child: Transform.scale(scale: t, child: child),
            ),
            child: Container(
              width: 74,
              height: 74,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colors.primary,
                border: Border.all(
                  color: colors.primaryDark.withValues(alpha: 0.6),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 40,
                    offset: const Offset(0, 20),
                  ),
                ],
              ),
              child: const Icon(
                Icons.check_rounded,
                size: 38,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OrbitPainter extends CustomPainter {
  _OrbitPainter({required this.ring, required this.dot});

  final Color ring;
  final Color dot;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final ringPaint = Paint()
      ..color = ring
      ..style = PaintingStyle.stroke;
    final dotPaint = Paint()..color = dot;
    final outer = size.width / 2;
    final inner = outer - 10;
    canvas.drawCircle(center, outer, ringPaint);
    canvas.drawCircle(center, inner, ringPaint);
    // One dot on each orbit, roughly upper-left and right as in the mock.
    canvas.drawCircle(center + Offset.fromDirection(-2.1, inner), 3, dotPaint);
    canvas.drawCircle(center + Offset.fromDirection(0.12, outer), 3, dotPaint);
  }

  @override
  bool shouldRepaint(_OrbitPainter old) => old.ring != ring || old.dot != dot;
}
