import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Delete Account — `foundation/04-screen-inventory.md` §A.11. A real
/// soft-delete (`AccountStatus.DELETED`) — no cascading data purge this
/// phase, documented in PROGRESS.md as a separate GDPR-shaped project.
class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() =>
      _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  bool _confirmed = false;
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _delete() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      await ref.read(usersRepositoryProvider).deleteAccount();
      await ref.read(secureStorageProvider).clear();
      if (!mounted) return;
      context.go('/welcome');
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
      title: context.l10n.settingsDeleteAccount,
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(context.l10n.deleteTitle, style: type.h3),
            const SizedBox(height: DriftSpacing.s3),
            // Copy corrected 2026-09-03: this previously said data was kept
            // unless you contacted support. It is now erased automatically
            // after 30 days, and saying otherwise would be untrue as well as
            // a transparency failure.
            Text(
              context.l10n.deleteBody,
              style: type.body.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s5),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _confirmed,
              onChanged: (value) => setState(() => _confirmed = value ?? false),
              title: Text(context.l10n.deleteConfirm),
            ),
            if (_errorText != null) ...[
              const SizedBox(height: DriftSpacing.s3),
              Text(_errorText!, style: TextStyle(color: colors.error)),
            ],
            const SizedBox(height: DriftSpacing.s4),
            DriftButton(
              label: _isSubmitting
                  ? context.l10n.deleteDeleting
                  : context.l10n.deleteButton,
              backgroundColor: colors.error,
              onPressed: (_confirmed && !_isSubmitting) ? _delete : null,
            ),
          ],
        ),
      ),
    );
  }
}
