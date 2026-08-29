import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_scaffold.dart';
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
  final _durationController = TextEditingController(text: '30');
  final _notesController = TextEditingController();
  late DateTime _occurredAt = DateTime.now();
  late String? _skillFocus = widget.skillFocus;
  int? _perceivedPerformance;
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _durationController.dispose();
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

  Future<void> _submit() async {
    final duration = int.tryParse(_durationController.text.trim());
    if (_skillFocus == null) {
      setState(() => _errorText = 'Choose which skill you focused on.');
      return;
    }
    if (duration == null || duration <= 0) {
      setState(() => _errorText = 'Enter a valid duration in minutes.');
      return;
    }
    if (_perceivedPerformance == null) {
      setState(() => _errorText = 'Rate how it felt.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      await ref
          .read(learningRepositoryProvider)
          .logPracticeSession(
            occurredAt: _occurredAt,
            durationMinutes: duration,
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
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Log Practice',
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Skill focus', style: type.label),
            const SizedBox(height: DriftSpacing.s2),
            Wrap(
              spacing: DriftSpacing.s2,
              runSpacing: DriftSpacing.s2,
              children: [
                for (final option in _skillOptions)
                  DriftFilterChip(
                    label: option.label,
                    selected: _skillFocus == option.value,
                    onTap: () => setState(() => _skillFocus = option.value),
                  ),
              ],
            ),
            const SizedBox(height: DriftSpacing.s4),
            DriftButton(
              label:
                  'Date: ${_occurredAt.day}/${_occurredAt.month}/${_occurredAt.year}',
              variant: DriftButtonVariant.text,
              onPressed: _pickDate,
            ),
            const SizedBox(height: DriftSpacing.s3),
            DriftTextField(
              label: 'Duration (minutes)',
              controller: _durationController,
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: DriftSpacing.s4),
            Text('How did it feel?', style: type.label),
            const SizedBox(height: DriftSpacing.s2),
            Wrap(
              spacing: DriftSpacing.s2,
              children: [
                for (var i = 1; i <= 5; i++)
                  DriftFilterChip(
                    label: '$i',
                    selected: _perceivedPerformance == i,
                    onTap: () => setState(() => _perceivedPerformance = i),
                  ),
              ],
            ),
            const SizedBox(height: DriftSpacing.s4),
            DriftTextField(
              label: 'Notes (optional)',
              controller: _notesController,
              maxLines: 3,
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
    );
  }
}
