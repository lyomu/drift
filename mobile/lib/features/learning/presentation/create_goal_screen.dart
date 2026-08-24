import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../application/learning_providers.dart';
import '../data/learning_repository.dart';

const _skillOptions = [
  (value: 'FOREHAND', label: 'Forehand'),
  (value: 'BACKHAND', label: 'Backhand'),
  (value: 'SERVE', label: 'Serve'),
  (value: 'RETURN', label: 'Return'),
  (value: 'NET_PLAY', label: 'Net Play'),
  (value: 'MOVEMENT', label: 'Movement'),
  (value: 'MATCH_PLAY', label: 'Match Play'),
];

/// Create Goal — `foundation/04-screen-inventory.md` §A.7. Milestones are
/// simple labels added before saving — the backend snapshots the goal's
/// baseline at creation time from the player's current computed score.
class CreateGoalScreen extends ConsumerStatefulWidget {
  const CreateGoalScreen({super.key, this.initialSkill});

  final String? initialSkill;

  @override
  ConsumerState<CreateGoalScreen> createState() => _CreateGoalScreenState();
}

class _CreateGoalScreenState extends ConsumerState<CreateGoalScreen> {
  final _milestoneController = TextEditingController();
  late String? _skill = widget.initialSkill;
  double _target = 4.0;
  DateTime? _deadline;
  final List<String> _milestones = [];
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _milestoneController.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (picked != null) setState(() => _deadline = picked);
  }

  void _addMilestone() {
    final label = _milestoneController.text.trim();
    if (label.isEmpty) return;
    setState(() {
      _milestones.add(label);
      _milestoneController.clear();
    });
  }

  Future<void> _submit() async {
    if (_skill == null) {
      setState(() => _errorText = 'Choose which skill this goal targets.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      await ref
          .read(learningRepositoryProvider)
          .createGoal(
            skill: _skill!,
            target: _target,
            deadline: _deadline,
            milestones: _milestones,
          );
      ref.invalidate(goalsProvider);
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
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('New Goal')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Skill', style: type.label),
              const SizedBox(height: DriftSpacing.s2),
              Wrap(
                spacing: DriftSpacing.s2,
                runSpacing: DriftSpacing.s2,
                children: [
                  for (final option in _skillOptions)
                    DriftFilterChip(
                      label: option.label,
                      selected: _skill == option.value,
                      onTap: () => setState(() => _skill = option.value),
                    ),
                ],
              ),
              const SizedBox(height: DriftSpacing.s4),
              Text(
                'Target: ${_target.toStringAsFixed(1)}/6',
                style: type.label,
              ),
              Slider(
                value: _target,
                min: 0,
                max: 6,
                divisions: 12,
                label: _target.toStringAsFixed(1),
                onChanged: (v) => setState(() => _target = v),
              ),
              const SizedBox(height: DriftSpacing.s2),
              DriftButton(
                label: _deadline == null
                    ? 'Set a deadline (optional)'
                    : 'Deadline: ${_deadline!.day}/${_deadline!.month}/${_deadline!.year}',
                variant: DriftButtonVariant.text,
                onPressed: _pickDeadline,
              ),
              const SizedBox(height: DriftSpacing.s4),
              Text('Milestones (optional)', style: type.label),
              const SizedBox(height: DriftSpacing.s2),
              for (final milestone in _milestones)
                Padding(
                  padding: const EdgeInsets.only(bottom: DriftSpacing.s1),
                  child: Row(
                    children: [
                      Expanded(child: Text(milestone, style: type.body)),
                      IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () =>
                            setState(() => _milestones.remove(milestone)),
                      ),
                    ],
                  ),
                ),
              Row(
                children: [
                  Expanded(
                    child: DriftTextField(
                      label: 'Add a milestone',
                      controller: _milestoneController,
                    ),
                  ),
                  const SizedBox(width: DriftSpacing.s2),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline),
                    onPressed: _addMilestone,
                  ),
                ],
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(
                label: _isSubmitting ? 'Saving…' : 'Save',
                onPressed: _isSubmitting ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
