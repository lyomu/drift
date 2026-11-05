import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../data/courts_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Report / Update Court Info — `foundation/03-user-journeys.md` §6,
/// `foundation/04-screen-inventory.md` §A.6. Write-only, same shape as M5's
/// PlayerReport — the moderation queue that reads these (Club Admin if
/// claimed, else Platform Admin) doesn't exist until its own later phase.
Future<void> showReportCourtSheet(
  BuildContext context,
  WidgetRef ref,
  String courtId,
) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _ReportCourtSheet(courtId: courtId),
  );
}

final _reasons = <({String value, String Function(AppLocalizations) label})>[
  (value: 'INCORRECT_INFO', label: (l) => l.reportIncorrectInfo),
  (value: 'PERMANENTLY_CLOSED', label: (l) => l.reportPermanentlyClosed),
  (value: 'DUPLICATE_LISTING', label: (l) => l.reportDuplicate),
  (value: 'INAPPROPRIATE_CONTENT', label: (l) => l.reportInappropriate),
  (value: 'OTHER', label: (l) => l.reportOther),
];

class _ReportCourtSheet extends ConsumerStatefulWidget {
  const _ReportCourtSheet({required this.courtId});

  final String courtId;

  @override
  ConsumerState<_ReportCourtSheet> createState() => _ReportCourtSheetState();
}

class _ReportCourtSheetState extends ConsumerState<_ReportCourtSheet> {
  final _notesController = TextEditingController();
  String? _reason;
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reason == null) {
      setState(() => _errorText = context.l10n.reportChooseReason);
      return;
    }
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      await ref
          .read(courtsRepositoryProvider)
          .report(
            widget.courtId,
            reason: _reason!,
            notes: _notesController.text.trim().isEmpty
                ? null
                : _notesController.text.trim(),
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.l10n.reportThanks)),
      );
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

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s6,
          0,
          DriftSpacing.s6,
          DriftSpacing.s6,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(context.l10n.reportCourtTitle, style: type.h2),
              const SizedBox(height: DriftSpacing.s5),
              Wrap(
                spacing: DriftSpacing.s2,
                runSpacing: DriftSpacing.s2,
                children: [
                  for (final option in _reasons)
                    DriftFilterChip(
                      label: option.label(context.l10n),
                      selected: _reason == option.value,
                      onTap: () => setState(() => _reason = option.value),
                    ),
                ],
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: context.l10n.commonNotesOptional,
                controller: _notesController,
                maxLines: 3,
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s5),
              DriftButton(
                label: _isSubmitting
                    ? context.l10n.commonSubmitting
                    : context.l10n.commonSubmit,
                onPressed: _isSubmitting ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
