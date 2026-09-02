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
      title: 'Delete Account',
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('This will delete your account', style: type.h3),
            const SizedBox(height: DriftSpacing.s3),
            // Copy corrected 2026-09-03: this previously said data was kept
            // unless you contacted support. It is now erased automatically
            // after 30 days, and saying otherwise would be untrue as well as
            // a transparency failure.
            Text(
              "You'll be signed out on every device immediately and other "
              "players will no longer be able to find or contact you.\n\n"
              "Your personal information is then permanently erased after "
              "30 days. Until then, contact support if you change your "
              "mind — after that it cannot be undone.\n\n"
              "Matches you played stay on record for the other players "
              "involved, but they will no longer be linked to you.",
              style: type.body.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s5),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _confirmed,
              onChanged: (value) => setState(() => _confirmed = value ?? false),
              title: const Text('I understand, delete my account'),
            ),
            if (_errorText != null) ...[
              const SizedBox(height: DriftSpacing.s3),
              Text(_errorText!, style: TextStyle(color: colors.error)),
            ],
            const SizedBox(height: DriftSpacing.s4),
            DriftButton(
              label: _isSubmitting ? 'Deleting…' : 'Delete my account',
              backgroundColor: colors.error,
              onPressed: (_confirmed && !_isSubmitting) ? _delete : null,
            ),
          ],
        ),
      ),
    );
  }
}
