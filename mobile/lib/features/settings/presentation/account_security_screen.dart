import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/analytics/analytics.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../notifications/data/push_service.dart';
import '../../../core/l10n/l10n.dart';

/// Account & Security — `foundation/04-screen-inventory.md` §A.10.
/// Change password is new this phase; the logout endpoint has existed on
/// the backend since M3 but was never called from any mobile screen until
/// now — a real gap this phase closes, not a re-implementation.
/// Small, muted label for the password fields — matches the 14px row-label
/// size used on Settings Home, so these fields read as quieter secondary
/// inputs rather than competing for attention with the heading above them.
TextStyle _fieldLabelStyle(DriftColors colors) =>
    TextStyle(fontSize: 14, color: colors.textSecondary);

class AccountSecurityScreen extends ConsumerStatefulWidget {
  const AccountSecurityScreen({super.key});

  @override
  ConsumerState<AccountSecurityScreen> createState() =>
      _AccountSecurityScreenState();
}

class _AccountSecurityScreenState extends ConsumerState<AccountSecurityScreen> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _isChangingPassword = false;
  bool _isLoggingOut = false;
  String? _errorText;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (_newPasswordController.text != _confirmPasswordController.text) {
      setState(() => _errorText = context.l10n.authPasswordsDontMatch);
      return;
    }

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
      _confirmPasswordController.clear();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(
        SnackBar(content: Text(context.l10n.securityPasswordUpdated)),
      );
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isChangingPassword = false);
    }
  }

  Future<void> _logout() async {
    setState(() => _isLoggingOut = true);
    final storage = ref.read(secureStorageProvider);
    // Before the session is cleared, while the call can still authenticate.
    // Leaving the device token behind would deliver this account's
    // notifications to whoever signs in on this handset next.
    //
    // Guarded because signing out must never depend on it: a Firebase or
    // network failure here would otherwise trap someone in a session they
    // asked to leave. The token then lingers until it is reclaimed by the
    // next sign-in on this device, or pruned when FCM reports it retired.
    try {
      await ref.read(pushServiceProvider).unregister();
    } catch (_) {
      // Deliberately swallowed — see above.
    }
    final refreshToken = await storage.readRefreshToken();
    if (refreshToken != null) {
      await ref.read(authRepositoryProvider).logout(refreshToken);
    }
    await storage.clear();
    // Clears the analytics identity so the next person on this device is not
    // recorded as the one who just left.
    await resetAnalyticsIdentity();
    if (!mounted) return;
    context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.settingsAccountSecurity,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(context.l10n.securityChangePassword, style: type.title),
                const SizedBox(height: DriftSpacing.s3),
                DriftTextField(
                  label: context.l10n.securityCurrentPassword,
                  controller: _currentPasswordController,
                  obscureText: true,
                  labelStyle: _fieldLabelStyle(colors),
                ),
                const SizedBox(height: DriftSpacing.s3),
                DriftTextField(
                  label: context.l10n.authNewPassword,
                  controller: _newPasswordController,
                  obscureText: true,
                  labelStyle: _fieldLabelStyle(colors),
                ),
                const SizedBox(height: DriftSpacing.s3),
                DriftTextField(
                  label: context.l10n.authConfirmNewPassword,
                  controller: _confirmPasswordController,
                  obscureText: true,
                  labelStyle: _fieldLabelStyle(colors),
                ),
                if (_errorText != null) ...[
                  const SizedBox(height: DriftSpacing.s3),
                  Text(_errorText!, style: TextStyle(color: colors.error)),
                ],
                const SizedBox(height: DriftSpacing.s4),
                DriftButton(
                  label: _isChangingPassword
                      ? context.l10n.commonUpdating
                      : context.l10n.securityUpdatePassword,
                  onPressed: _isChangingPassword ? null : _changePassword,
                ),
              ],
            ),
          ),
          const SizedBox(height: DriftSpacing.s5),
          DriftButton(
            label: _isLoggingOut
                ? context.l10n.drawerSigningOut
                : context.l10n.settingsLogout,
            variant: DriftButtonVariant.text,
            foregroundColor: colors.error,
            onPressed: _isLoggingOut ? null : _logout,
          ),
        ],
      ),
    );
  }
}
