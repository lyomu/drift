import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../data/safety_repository.dart';

/// Report a single chat message — Chat Thread's "Report" secondary action
/// (`foundation/04-screen-inventory.md` §A.9).
///
/// Narrower than [showBlockReportSheet], which reports a *player* and can
/// also block them. This reports one message and nothing else; blocking the
/// person is still done from their profile.
Future<void> showMessageReportSheet(
  BuildContext context,
  WidgetRef ref, {
  required String messageId,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _MessageReportSheet(messageId: messageId),
  );
}

class _MessageReportSheet extends ConsumerStatefulWidget {
  const _MessageReportSheet({required this.messageId});

  final String messageId;

  @override
  ConsumerState<_MessageReportSheet> createState() =>
      _MessageReportSheetState();
}

class _MessageReportSheetState extends ConsumerState<_MessageReportSheet> {
  ReportReason? _reason;
  bool _isSubmitting = false;
  String? _errorText;
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reason == null) return;

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    try {
      await ref
          .read(safetyRepositoryProvider)
          .reportMessage(
            messageId: widget.messageId,
            reason: _reason!,
            notes: _notesController.text.trim(),
          );
      navigator.pop();
      messenger.showSnackBar(
        const SnackBar(content: Text('Thanks — this message was reported.')),
      );
    } on AuthException catch (e) {
      if (mounted) {
        setState(() {
          _errorText = e.message;
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Padding(
      padding: EdgeInsets.only(
        left: DriftSpacing.s5,
        right: DriftSpacing.s5,
        bottom: MediaQuery.of(context).viewInsets.bottom + DriftSpacing.s5,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Report this message', style: type.h4),
            const SizedBox(height: DriftSpacing.s3),
            RadioGroup<ReportReason>(
              groupValue: _reason,
              onChanged: (value) => setState(() => _reason = value),
              child: Column(
                children: [
                  for (final reason in ReportReason.values)
                    RadioListTile<ReportReason>(
                      contentPadding: EdgeInsets.zero,
                      value: reason,
                      title: Text(reason.label, style: type.body),
                    ),
                ],
              ),
            ),
            const SizedBox(height: DriftSpacing.s3),
            DriftTextField(
              label: 'Anything else? (optional)',
              controller: _notesController,
              maxLines: 3,
            ),
            if (_errorText != null) ...[
              const SizedBox(height: DriftSpacing.s3),
              Text(
                _errorText!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: DriftSpacing.s5),
            DriftButton(
              label: _isSubmitting ? 'Reporting…' : 'Submit report',
              onPressed: _reason == null || _isSubmitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }
}
