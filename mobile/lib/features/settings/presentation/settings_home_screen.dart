import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/analytics/analytics.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_symbol.dart';
import '../../auth/data/auth_repository.dart';

/// The prototype's family. Only the ported screens are on Outfit — the rest
/// of the app is still DM Sans, so this cannot go in the global theme yet.
const _font = 'Outfit';

const _ink = Color(0xFF0F172A);
const _chevron = Color(0xFFCBD5E1);
const _danger = Color(0xFFEF4444);

/// Shown in the footer. `pubspec.yaml` is not readable at runtime without
/// `package_info_plus`, so this tracks the `version:` field by hand.
const _appVersion = '1.0.0';

/// Settings Home — `foundation/04-screen-inventory.md` §A.10-11. "Manage
/// connection requests" links to the existing Pending Requests screen
/// (built M5/M6) rather than duplicating it.
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
  Future<void> _logout() async {
    if (_isLoggingOut) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You can sign back in any time.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Log out'),
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

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Header(),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                children: [
                  // Reachable from Settings rather than a tab: the feature is
                  // a Phase 0 spike that cannot analyse anything yet, and
                  // promoting it to primary navigation would promise a great
                  // deal more than it does.
                  _Section(
                    title: 'Labs',
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.videocam,
                        accent: colors.primary,
                        label: 'Analyse a clip',
                        onTap: () => context.push('/video-analysis'),
                      ),
                    ],
                  ),
                  _Section(
                    title: 'Privacy & Safety',
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.verifiedUser,
                        accent: colors.primary,
                        label: 'Privacy Settings',
                        onTap: () => context.push('/settings/privacy'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.doNotDisturbOn,
                        accent: const Color(0xFFF97316),
                        label: 'Blocked Users',
                        onTap: () => context.push('/settings/blocked-users'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.groupAdd,
                        accent: const Color(0xFF22C55E),
                        label: 'Manage Connection Requests',
                        onTap: () => context.push('/connections/pending'),
                      ),
                    ],
                  ),
                  _Section(
                    title: 'Notifications',
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.notificationsActive,
                        accent: const Color(0xFF8B5CF6),
                        label: 'Notification Preferences',
                        onTap: () =>
                            context.push('/notifications/preferences'),
                      ),
                    ],
                  ),
                  _Section(
                    title: 'Plan & Billing',
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.cardMembership,
                        accent: const Color(0xFFEAB308),
                        label: 'Subscription & Plan',
                        onTap: () => context.push('/settings/subscription'),
                      ),
                    ],
                  ),
                  _Section(
                    title: 'Account',
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.manageAccounts,
                        accent: colors.primary,
                        label: 'Account & Security',
                        onTap: () =>
                            context.push('/settings/account-security'),
                      ),
                    ],
                  ),
                  _Section(
                    title: 'Support',
                    rows: [
                      _Row(
                        icon: DriftSymbolsFilled.contactSupport,
                        accent: const Color(0xFF22C55E),
                        label: 'Help & FAQ',
                        onTap: () => context.push('/settings/help'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.supportAgent,
                        accent: colors.primary,
                        label: 'Contact Support',
                        onTap: () =>
                            context.push('/settings/contact-support'),
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.policy,
                        accent: const Color(0xFF64748B),
                        label: 'Terms & Privacy Policy',
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
                        label: 'Log Out',
                        danger: true,
                        onTap: _logout,
                      ),
                      _Row(
                        icon: DriftSymbolsFilled.delete,
                        accent: _danger,
                        label: 'Delete Account',
                        danger: true,
                        onTap: () =>
                            context.push('/settings/delete-account'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      'Drift Tennis v$_appVersion',
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
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
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
                child: const Icon(
                  DriftSymbolsFilled.arrowBack,
                  size: 20,
                  color: _ink,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'Settings',
            style: TextStyle(
              fontFamily: _font,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              height: 1.2,
              color: _ink,
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
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null)
            Padding(
              padding: const EdgeInsets.only(left: 2, bottom: 4),
              child: Text(
                title!,
                style: const TextStyle(
                  fontFamily: _font,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  height: 1.3,
                  color: _ink,
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
                      Divider(height: 1, thickness: 1, color: _hairline(colors)),
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
    this.danger = false,
  });

  final IconData icon;
  final Color accent;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontFamily: _font,
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    height: 1.3,
                    color: danger ? _danger : _ink,
                  ),
                ),
              ),
              // Straight from the package: the mock draws the chevron at
              // wght 400 / FILL 0, which is this font's default master, so
              // nothing here depends on an axis Impeller would ignore.
              const Icon(
                Symbols.chevron_right_rounded,
                size: 16,
                color: _chevron,
              ),
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
