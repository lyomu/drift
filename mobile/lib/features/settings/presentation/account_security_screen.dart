import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';

/// Account & Security — `foundation/04-screen-inventory.md` §A.10.
/// Change password is new this phase; the logout endpoint has existed on
/// the backend since M3 but was never called from any mobile screen until
/// now — a real gap this phase closes, not a re-implementation.
class AccountSecurityScreen extends ConsumerStatefulWidget {
  const AccountSecurityScreen({super.key});

  @override
  ConsumerState<AccountSecurityScreen> createState() =>
      _AccountSecurityScreenState();
}

class _AccountSecurityScreenState extends ConsumerState<AccountSecurityScreen> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  bool _isChangingPassword = false;
  bool _isLoggingOut = false;
  String? _errorText;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    setState(() {
      _isChangingPassword = true;
      _errorText = null;
    });

    try {
      final tokens = await ref
          .read(authRepositoryProvider)
          .changePassword(
            currentPassword: _currentPasswordController.text,
            newPassword: _newPasswordController.text,
          );
      await ref
          .read(secureStorageProvider)
          .saveTokens(
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          );
      _currentPasswordController.clear();
      _newPasswordController.clear();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Password updated.')));
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isChangingPassword = false);
    }
  }

  Future<void> _logout() async {
    setState(() => _isLoggingOut = true);
    final storage = ref.read(secureStorageProvider);
    final refreshToken = await storage.readRefreshToken();
    if (refreshToken != null) {
      await ref.read(authRepositoryProvider).logout(refreshToken);
    }
    await storage.clear();
    if (!mounted) return;
    context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Account & Security',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Change password', style: type.title),
                const SizedBox(height: DriftSpacing.s3),
                DriftTextField(
                  label: 'Current password',
                  controller: _currentPasswordController,
                  obscureText: true,
                ),
                const SizedBox(height: DriftSpacing.s3),
                DriftTextField(
                  label: 'New password',
                  controller: _newPasswordController,
                  obscureText: true,
                ),
                if (_errorText != null) ...[
                  const SizedBox(height: DriftSpacing.s3),
                  Text(_errorText!, style: TextStyle(color: colors.error)),
                ],
                const SizedBox(height: DriftSpacing.s4),
                DriftButton(
                  label: _isChangingPassword ? 'Updating…' : 'Update password',
                  onPressed: _isChangingPassword ? null : _changePassword,
                ),
              ],
            ),
          ),
          const SizedBox(height: DriftSpacing.s5),
          DriftButton(
            label: _isLoggingOut ? 'Signing out…' : 'Log out',
            variant: DriftButtonVariant.text,
            foregroundColor: colors.error,
            onPressed: _isLoggingOut ? null : _logout,
          ),
        ],
      ),
    );
  }
}
