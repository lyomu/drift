import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../data/safety_repository.dart';

/// Block / Report Sheet — `foundation/04-screen-inventory.md` §A.4. Safety
/// actions are required wherever a player is surfaced
/// (`foundation/06-domain-technical-architecture.md` §4).
Future<void> showBlockReportSheet(
  BuildContext context,
  WidgetRef ref, {
  required String playerId,
  required VoidCallback onBlocked,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _BlockReportSheet(playerId: playerId, onBlocked: onBlocked),
  );
}

class _BlockReportSheet extends ConsumerStatefulWidget {
  const _BlockReportSheet({required this.playerId, required this.onBlocked});

  final String playerId;
  final VoidCallback onBlocked;

  @override
  ConsumerState<_BlockReportSheet> createState() => _BlockReportSheetState();
}

class _BlockReportSheetState extends ConsumerState<_BlockReportSheet> {
  bool _isReporting = false;
  bool _isSubmitting = false;
  ReportReason? _reason;
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit(
    Future<void> Function() action,
    String successMessage,
  ) async {
    setState(() => _isSubmitting = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await action();
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(successMessage)));
    } on AuthException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _confirmBlock() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Block this player?'),
        content: const Text(
          "They won't be able to find you or contact you, and any existing "
          'connection between you will be removed.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Block'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    await _submit(
      () => ref.read(safetyRepositoryProvider).block(widget.playerId),
      'Player blocked.',
    );
    widget.onBlocked();
  }

  Future<void> _submitReport() async {
    if (_reason == null) return;
    await _submit(
      () => ref
          .read(safetyRepositoryProvider)
          .report(
            reportedUserId: widget.playerId,
            reason: _reason!,
            notes: _notesController.text.trim(),
          ),
      'Report submitted. Thank you.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          DriftSpacing.s6,
          0,
          DriftSpacing.s6,
          DriftSpacing.s6 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: _isReporting
                ? _reportForm(type, colors)
                : _actionList(type, colors),
          ),
        ),
      ),
    );
  }

  List<Widget> _actionList(DriftTypography type, DriftColors colors) => [
    Text('Safety', style: type.h2),
    const SizedBox(height: DriftSpacing.s4),
    ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(Icons.flag_outlined, color: colors.textSecondary),
      title: Text('Report player', style: type.body),
      subtitle: Text(
        'Tell us what went wrong',
        style: type.caption.copyWith(color: colors.textSecondary),
      ),
      onTap: () => setState(() => _isReporting = true),
    ),
    ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(Icons.block, color: colors.error),
      title: Text(
        'Block player',
        style: type.body.copyWith(color: colors.error),
      ),
      subtitle: Text(
        'They can no longer find or contact you',
        style: type.caption.copyWith(color: colors.textSecondary),
      ),
      onTap: _isSubmitting ? null : _confirmBlock,
    ),
  ];

  List<Widget> _reportForm(DriftTypography type, DriftColors colors) => [
    Text('Report player', style: type.h2),
    const SizedBox(height: DriftSpacing.s2),
    Text(
      "Reports go to our moderation team. They're never shared with the "
      'player you report.',
      style: type.bodySmall.copyWith(color: colors.textSecondary),
    ),
    const SizedBox(height: DriftSpacing.s4),
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
    const SizedBox(height: DriftSpacing.s5),
    DriftButton(
      label: _isSubmitting ? 'Submitting…' : 'Submit report',
      onPressed: _reason == null || _isSubmitting ? null : _submitReport,
    ),
    const SizedBox(height: DriftSpacing.s2),
    Center(
      child: DriftButton(
        label: 'Back',
        variant: DriftButtonVariant.text,
        onPressed: _isSubmitting
            ? null
            : () => setState(() => _isReporting = false),
      ),
    ),
  ];
}
