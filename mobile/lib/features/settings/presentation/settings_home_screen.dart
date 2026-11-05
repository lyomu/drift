import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/analytics/analytics.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_symbol.dart';
import '../../auth/data/auth_repository.dart';
import '../application/theme_mode_provider.dart';
import 'language_sheet.dart';

/// Drift's official readable text family.
const _font = 'Outfit';

const _chevron = Color(0xFFCBD5E1);
const _danger = Color(0xFFEF4444);

/// Shown in the footer. `pubspec.yaml` is not readable at runtime without
/// `package_info_plus`, so this tracks the `version:` field by hand.
const _appVersion = '0.8.3';

/// Settings Home — `foundation/04-screen-inventory.md` §A.10-11. "Manage
/// connection requests" links to the existing Pending Requests screen
/// (built M5/M6) rather than duplicating it.
String _appearanceLabel(AppLocalizations l10n, ThemeMode mode) =>
    switch (mode) {
      ThemeMode.system => l10n.settingsThemeDevice,
      ThemeMode.light => l10n.settingsThemeLight,
      ThemeMode.dark => l10n.settingsThemeDark,
    };

class SettingsHomeScreen extends ConsumerStatefulWidget {
  const SettingsHomeScreen({super.key});

  @override
  ConsumerState<SettingsHomeScreen> createState() => _SettingsHomeScreenState();
}

class _SettingsHomeScreenState extends ConsumerState<SettingsHomeScreen> {
  bool _isLoggingOut = false;

  /// Same flow as the app drawer's: revoke the refresh token, clear local
  /// storage, drop the analytics identity so the next person on this device
  /// isn't recorded as the one who just left.
  /// Lets the player pick Device, Light or Dark. The choice applies at once and
  /// is saved for the next launch (see `themeModeProvider`).
  Future<void> _pickAppearance() async {
    final current = ref.read(themeModeProvider);
    final picked = await showDialog<ThemeMode>(
      context: context,
      builder: (dialogContext) => SimpleDialog(
        title: Text(context.l10n.settingsAppearance),
        children: [
          for (final mode in ThemeMode.values)
            SimpleDialogOption(
              onPressed: () => Navigator.of(dialogContext).pop(mode),
              child: Row(
                children: [
                  Expanded(child: Text(_appearanceLabel(context.l10n, mode))),
                  if (mode == current) Icon(Symbols.check),
                ],
              ),
            ),
        ],
      ),
    );
    if (picked != null) {
      await ref.read(themeModeProvider.notifier).select(picked);
    }
  }

  Future<void> _logout() async {
    if (_isLoggingOut) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(context.l10n.settingsLogoutConfirmTitle),
        content: Text(context.l10n.settingsLogoutConfirmBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(context.l10n.commonCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(context.l10n.settingsLogout),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _isLoggingOut = true);
    final storage = ref.read(secureStorageProvider);
    final refreshToken = await storage.readRefreshToken();
    if (refreshToken != null) {
      await ref.read(authRepositoryProvider).logout(refreshToken);
    }
    await storage.clear();
    await resetAnalyticsIdentity();
    if (!mounted) return;
    context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final l10n = context.l10n;
    final language = AppLanguage.of(Localizations.localeOf(context));

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Header(),
            Expanded(
              child: ListView(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                children: [
                  _Section(
                    title: l10n.settingsAppearance,
                    rows: [
                      _Row(
                        icon: Symbols.contrast,
                        accent: colors.primary,
                        label: l10n.settingsThemeValue(
                          _appearanceLabel(l10n, ref.watch(themeModeProvider)),
                        ),
                        onTap: _pickAppearance,
                      ),
                      _Row(
                        icon: Symbols.translate,
                        accent: colors.primary,
                        label: l10n.settingsLanguage,
                        value: '${language.flag} ${language.nativeName}',
                        onTap: () => showLanguageSheet(context),
                      ),
                    ],
                  ),
                  _Section(
                    title: l10n.settingsPrivacySafety,
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.verifiedUser,
                        accent: colors.primary,
                        label: l10n.settingsPrivacySettings,
                        onTap: () => context.push('/settings/privacy'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.doNotDisturbOn,
                        accent: const Color(0xFFF97316),
                        label: l10n.settingsBlockedUsers,
                        onTap: () => context.push('/settings/blocked-users'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.groupAdd,
                        accent: const Color(0xFF22C55E),
                        label: l10n.settingsManageConnectionRequests,
                        onTap: () => context.push('/connections/pending'),
                      ),
                    ],
                  ),
                  _Section(
                    title: l10n.settingsNotifications,
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.notificationsActive,
                        accent: const Color(0xFF8B5CF6),
                        label: l10n.settingsNotificationPreferences,
                        onTap: () => context.push('/notifications/preferences'),
                      ),
                    ],
                  ),
                  _Section(
                    title: l10n.settingsPlanBilling,
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.cardMembership,
                        accent: const Color(0xFFEAB308),
                        label: l10n.settingsSubscriptionPlan,
                        onTap: () => context.push('/settings/subscription'),
                      ),
                    ],
                  ),
                  _Section(
                    title: l10n.settingsAccount,
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.manageAccounts,
                        accent: colors.primary,
                        label: l10n.settingsAccountSecurity,
                        onTap: () => context.push('/settings/account-security'),
                      ),
                    ],
                  ),
                  _Section(
                    title: l10n.settingsSupport,
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.contactSupport,
                        accent: const Color(0xFF22C55E),
                        label: l10n.settingsHelpFaq,
                        onTap: () => context.push('/settings/help'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.supportAgent,
                        accent: colors.primary,
                        label: l10n.settingsContactSupport,
                        onTap: () => context.push('/settings/contact-support'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.policy,
                        accent: colors.textSecondary,
                        label: l10n.settingsLegalDocuments,
                        onTap: () => context.push('/settings/legal'),
                      ),
                    ],
                  ),
                  // Untitled trailing group, per the mock. Delete Account is
                  // not in the mock but is a live GDPR route, so it sits with
                  // the other destructive action rather than being dropped.
                  _Section(
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.logout,
                        accent: _danger,
                        label: l10n.settingsLogOutRow,
                        danger: true,
                        onTap: _logout,
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.delete,
                        accent: _danger,
                        label: l10n.settingsDeleteAccount,
                        danger: true,
                        onTap: () => context.push('/settings/delete-account'),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      l10n.settingsVersion(_appVersion),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: _font,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        height: 1.2,
                        color: _chevron,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(bottom: BorderSide(color: _hairline(colors), width: 1)),
      ),
      child: Row(
        children: [
          Material(
            color: _tintedFill(colors),
            borderRadius: BorderRadius.circular(12),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () {
                if (context.canPop()) context.pop();
              },
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _tintedBorder(colors), width: 1.5),
                ),
                child: Icon(
                  DriftSymbolsFilled.arrowBack,
                  size: 20,
                  color: colors.textPrimary,
                ),
              ),
            ),
          ),
          SizedBox(width: 12),
          Text(
            context.l10n.settingsTitle,
            style: TextStyle(
              fontFamily: _font,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              height: 1.2,
              color: colors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

/// A titled group of rows in one bordered, clipped card.
class _Section extends StatelessWidget {
  const _Section({this.title, required this.rows});

  final String? title;
  final List<_Row> rows;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null)
            Padding(
              padding: EdgeInsets.only(left: 2, bottom: 4),
              child: Text(
                title!,
                style: TextStyle(
                  fontFamily: _font,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  height: 1.3,
                  color: colors.textPrimary,
                ),
              ),
            ),
          DecoratedBox(
            decoration: BoxDecoration(
              color: colors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _groupBorder(colors), width: 1.5),
            ),
            child: ClipRRect(
              // 14 minus the 1.5 border, so the ripple hugs the card's inner
              // edge instead of bleeding past the corner.
              borderRadius: BorderRadius.circular(12.5),
              child: Column(
                children: [
                  for (var i = 0; i < rows.length; i++) ...[
                    if (i > 0)
                      Divider(
                        height: 1,
                        thickness: 1,
                        color: _hairline(colors),
                      ),
                    rows[i],
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.accent,
    required this.label,
    required this.onTap,
    this.value,
    this.danger = false,
  });

  final IconData icon;
  final Color accent;
  final String label;

  /// The current setting, shown muted before the chevron.
  final String? value;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(
                    color: accent.withValues(alpha: 0.15),
                    width: 1.5,
                  ),
                ),
                child: Icon(icon, size: 16, color: accent),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: _font,
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    height: 1.3,
                    color: danger ? _danger : colors.textPrimary,
                  ),
                ),
              ),
              if (value != null)
                Padding(
                  padding: EdgeInsets.only(right: 6),
                  child: Text(
                    value!,
                    style: TextStyle(
                      fontFamily: _font,
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      height: 1.3,
                      color: colors.textSecondary,
                    ),
                  ),
                ),
              // Straight from the package: the mock draws the chevron at
              // wght 400 / FILL 0, which is this font's default master, so
              // nothing here depends on an axis Impeller would ignore.
              Icon(Symbols.chevron_right_rounded, size: 16, color: _chevron),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Brand-tinted neutrals — the mock's #F0F4FF / #F7F9FF / #E2EAFF / #E8EEFF are
// its blue at low opacity, derived here so they track the theme's primary.
// ---------------------------------------------------------------------------

Color _hairline(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.07), colors.surface);

Color _tintedFill(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.04), colors.surface);

Color _tintedBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.18), colors.surface);

Color _groupBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.12), colors.surface);
