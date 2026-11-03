import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../safety/data/safety_repository.dart';
import '../application/communities_providers.dart';
import '../data/communities_repository.dart';

/// Report a community to Drift, like WhatsApp's "Report group": a reason,
/// optional notes, and — for members other than the owner — "Also leave
/// this community". Reviewed in platform-admin's Reported Content Queue.
Future<void> showReportCommunitySheet(
  BuildContext context,
  WidgetRef ref, {
  required Community community,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _ReportCommunitySheet(community: community),
  );
}

class _ReportCommunitySheet extends ConsumerStatefulWidget {
  const _ReportCommunitySheet({required this.community});

  final Community community;

  @override
  ConsumerState<_ReportCommunitySheet> createState() =>
      _ReportCommunitySheetState();
}

class _ReportCommunitySheetState extends ConsumerState<_ReportCommunitySheet> {
  ReportReason? _reason;
  bool _leave = false;
  bool _submitting = false;
  String? _error;
  final _notes = TextEditingController();

  bool get _canLeave =>
      widget.community.isMember && !(widget.community.myMembership!.isOwner);

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_reason == null) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final router = GoRouter.of(context);
    final l10n = context.l10n;
    try {
      final left = await ref
          .read(communitiesRepositoryProvider)
          .report(
            widget.community.id,
            reason: _reason!.wireValue,
            notes: _notes.text,
            leave: _leave && _canLeave,
          );
      navigator.pop();
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            left ? l10n.communityReportedAndLeft : l10n.communityReported,
          ),
        ),
      );
      if (left) {
        ref.invalidate(myCommunitiesProvider);
        ref.invalidate(communitySearchProvider);
        if (router.canPop()) router.pop();
      }
    } on AuthException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;

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
            Text(
              l10n.communityReportTitle(widget.community.name),
              style: type.h4,
            ),
            const SizedBox(height: DriftSpacing.s2),
            Text(l10n.communityReportBody, style: type.bodySmall),
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
              label: l10n.safetyAnythingElse,
              controller: _notes,
              maxLines: 3,
            ),
            if (_canLeave)
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: _leave,
                onChanged: (value) => setState(() => _leave = value ?? false),
                title: Text(l10n.communityReportAlsoLeave, style: type.body),
              ),
            if (_error != null) ...[
              const SizedBox(height: DriftSpacing.s3),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: DriftSpacing.s5),
            DriftButton(
              label: _submitting
                  ? l10n.safetyReporting
                  : l10n.safetySubmitReport,
              onPressed: _reason == null || _submitting ? null : _submit,
            ),
          ],
        ),
      ),
    );
  }
}
