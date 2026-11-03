import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../data/matches_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Match Reflection — `foundation/04-screen-inventory.md` §A.2. Optional,
/// lightweight, Skip is always available. Stored but not consumed by
/// anything yet — feeding the Skill Development Profile needs the Learning
/// module (Phase M10).
class MatchReflectionScreen extends ConsumerStatefulWidget {
  const MatchReflectionScreen({super.key, required this.matchId});

  final String matchId;

  @override
  ConsumerState<MatchReflectionScreen> createState() =>
      _MatchReflectionScreenState();
}

class _MatchReflectionScreenState extends ConsumerState<MatchReflectionScreen> {
  int _confidence = 3;
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSubmitting = true);
    try {
      await ref
          .read(matchesRepositoryProvider)
          .submitReflection(
            widget.matchId,
            confidence: _confidence,
            notes: _notesController.text.trim(),
          );
      if (mounted) context.pop();
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
      setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.matchHowDidItFeel,
      trailing: DriftButton(
        label: context.l10n.commonSkip,
        variant: DriftButtonVariant.text,
        onPressed: _isSubmitting ? null : () => context.pop(),
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(context.l10n.matchConfidence, style: type.label),
            const SizedBox(height: DriftSpacing.s2),
            Row(
              children: [
                for (var i = 1; i <= 5; i++)
                  Expanded(
                    child: IconButton(
                      onPressed: () => setState(() => _confidence = i),
                      icon: Icon(
                        i <= _confidence ? Icons.star : Icons.star_border,
                        color: colors.primary,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: DriftSpacing.s5),
            DriftTextField(
              label: context.l10n.commonNotesOptional,
              controller: _notesController,
              maxLines: 4,
            ),
            const SizedBox(height: DriftSpacing.s6),
            DriftButton(
              label: _isSubmitting
                  ? context.l10n.commonSaving
                  : context.l10n.commonSave,
              onPressed: _isSubmitting ? null : _save,
            ),
          ],
        ),
      ),
    );
  }
}
