import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
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

    return Scaffold(
      appBar: AppBar(title: const Text('Delete Account')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('This will deactivate your account', style: type.h3),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                "You'll be signed out on every device immediately, and "
                "other players will no longer be able to find or contact "
                "you. Your account data is kept, deactivated, rather than "
                "immediately erased — contact support if you'd like it "
                "fully removed.",
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              const SizedBox(height: DriftSpacing.s5),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                value: _confirmed,
                onChanged: (value) =>
                    setState(() => _confirmed = value ?? false),
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
      ),
    );
  }
}
