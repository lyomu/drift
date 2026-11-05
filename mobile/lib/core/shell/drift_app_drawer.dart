import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../analytics/analytics.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/profile/application/profile_providers.dart';
import '../../features/users/application/current_user_provider.dart';
import '../network/dio_client.dart';
import '../theme/drift_colors.dart';
import '../l10n/l10n.dart';

/// Drift's official readable text family.
const _font = 'Outfit';

const _danger = Color(0xFFEF4444);
const _dangerFill = Color(0xFFFEF2F2);
const _dangerBorder = Color(0xFFFECACA);

/// One drawer destination. Use Flutter's bundled Material Icons for both
/// states so optimized Android builds retain every navigation glyph.
typedef _NavItem = ({
  String Function(AppLocalizations) label,
  IconData activeIcon,
  IconData idleIcon,
  String route,
});

final _navItems = <_NavItem>[
  (
    label: (l) => l.navMyProfile,
    activeIcon: Icons.person_rounded,
    idleIcon: Icons.person_outline_rounded,
    route: '/profile/own',
  ),
  (
    label: (l) => l.navMySportsHub,
    activeIcon: Icons.sports_tennis_rounded,
    idleIcon: Icons.sports_tennis_rounded,
    route: '/profile/sports-hub',
  ),
  (
    label: (l) => l.navAchievements,
    activeIcon: Icons.emoji_events_rounded,
    idleIcon: Icons.emoji_events_outlined,
    route: '/profile/achievements',
  ),
  (
    label: (l) => l.navNews,
    activeIcon: Icons.newspaper_rounded,
    idleIcon: Icons.newspaper_outlined,
    route: '/news',
  ),
  (
    label: (l) => l.navMessages,
    activeIcon: Icons.forum_rounded,
    idleIcon: Icons.forum_outlined,
    route: '/messages',
  ),
  (
    label: (l) => l.navNotifications,
    activeIcon: Icons.notifications_rounded,
    idleIcon: Icons.notifications_outlined,
    route: '/notifications',
  ),
  (
    label: (l) => l.navSettings,
    activeIcon: Icons.settings_rounded,
    idleIcon: Icons.settings_outlined,
    route: '/settings',
  ),
];

/// The app drawer — everything that used to be the Profile tab.
///
/// The 2026-09 redesign gave the fifth bottom-nav slot to Learn, so the
/// profile navigation surface moved here, behind the header's hamburger. The
/// rows are the same set `ProfileHomeScreen` carried, minus Learn (now a tab
/// of its own).
class DriftAppDrawer extends ConsumerStatefulWidget {
  const DriftAppDrawer({super.key});

  @override
  ConsumerState<DriftAppDrawer> createState() => _DriftAppDrawerState();
}

class _DriftAppDrawerState extends ConsumerState<DriftAppDrawer> {
  bool _isLoggingOut = false;

  /// Closes the drawer before navigating — otherwise it stays open behind the
  /// pushed route and is still there on the way back.
  void _go(String location) {
    Navigator.of(context).pop();
    context.push(location);
  }

  Future<void> _logout() async {
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
    // Clears the analytics identity so the next person on this device is not
    // recorded as the one who just left.
    await resetAnalyticsIdentity();
    if (!mounted) return;
    context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    // The mock marks one row as current. This reads the router's *global*
    // location, not `GoRouterState.of(context)` — the latter would report
    // the route that built this drawer's Scaffold, which is always `/home`.
    //
    // Note that today no row ever matches: `AppShell` lives at `/home` and
    // every destination below is pushed on top of it, so the drawer is only
    // ever on screen while the location is `/home`. The comparison is here
    // so the highlight starts working by itself if these become shell tabs.
    final location = GoRouter.of(
      context,
    ).routeInformationProvider.value.uri.path;

    return Drawer(
      backgroundColor: colors.surface,
      width: 280,
      shape: RoundedRectangleBorder(),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _DrawerIdentity(onTap: () => _go('/profile/own')),
            Expanded(
              child: ListView(
                padding: EdgeInsets.all(12),
                children: [
                  for (final item in _navItems) ...[
                    _DrawerRow(
                      activeIcon: item.activeIcon,
                      idleIcon: item.idleIcon,
                      label: item.label(context.l10n),
                      active: location == item.route,
                      onTap: () => _go(item.route),
                    ),
                    SizedBox(height: 2),
                  ],
                  // Clip analysis isn't ready yet: the row only shows a
                  // "Coming soon" tooltip and never navigates.
                  const _ComingSoonRow(),
                ],
              ),
            ),
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: _hairline(colors), width: 1),
                ),
              ),
              child: _DrawerRow(
                activeIcon: Icons.logout_rounded,
                idleIcon: Icons.logout_rounded,
                label: _isLoggingOut
                    ? context.l10n.drawerSigningOut
                    : context.l10n.settingsLogout,
                active: false,
                danger: true,
                onTap: _isLoggingOut ? null : _logout,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ComingSoonRow extends StatefulWidget {
  const _ComingSoonRow();

  @override
  State<_ComingSoonRow> createState() => _ComingSoonRowState();
}

class _ComingSoonRowState extends State<_ComingSoonRow> {
  final _tooltipKey = GlobalKey<TooltipState>();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final l10n = context.l10n;

    return Tooltip(
      key: _tooltipKey,
      message: l10n.commonComingSoon,
      triggerMode: TooltipTriggerMode.manual,
      preferBelow: false,
      showDuration: const Duration(seconds: 2),
      child: Stack(
        alignment: Alignment.centerRight,
        children: [
          _DrawerRow(
            activeIcon: Icons.videocam_rounded,
            idleIcon: Icons.videocam_outlined,
            label: l10n.settingsAnalyseClip,
            active: false,
            onTap: () => _tooltipKey.currentState?.ensureTooltipVisible(),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: IgnorePointer(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: colors.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  l10n.drawerSoonBadge,
                  style: TextStyle(
                    fontFamily: _font,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: colors.primary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DrawerIdentity extends ConsumerWidget {
  const _DrawerIdentity({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final ownProfile = ref.watch(ownProfileProvider);
    final user = ref.watch(currentUserProvider).valueOrNull;
    final photoUrl = ownProfile.valueOrNull?.summary.photoUrl;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.fromLTRB(20, 20, 20, 20),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: _hairline(colors), width: 1),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colors.primary.withValues(alpha: 0.09),
                border: Border.all(
                  color: colors.primary.withValues(alpha: 0.19),
                  width: 2,
                ),
              ),
              child: photoUrl != null && photoUrl.isNotEmpty
                  ? Image.network(
                      photoUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          _Initials(name: user?.displayName),
                    )
                  : _Initials(name: user?.displayName),
            ),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user?.displayName ?? context.l10n.navMyProfile,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: _font,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                      color: colors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    user?.email ?? context.l10n.drawerViewProfile,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontFamily: _font,
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      height: 1.3,
                      color: colors.textSecondary,
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

class _Initials extends StatelessWidget {
  const _Initials({required this.name});

  final String? name;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final parts = (name ?? '')
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList();
    final letters = parts.isEmpty
        ? '?'
        : parts.take(2).map((p) => p[0].toUpperCase()).join();

    return Center(
      child: Text(
        letters,
        style: TextStyle(
          fontFamily: _font,
          fontSize: 17,
          fontWeight: FontWeight.w900,
          height: 1,
          color: colors.primary,
        ),
      ),
    );
  }
}

class _DrawerRow extends StatelessWidget {
  const _DrawerRow({
    required this.activeIcon,
    required this.idleIcon,
    required this.label,
    required this.active,
    required this.onTap,
    this.danger = false,
  });

  final IconData activeIcon;
  final IconData idleIcon;
  final String label;
  final bool active;
  final VoidCallback? onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final foreground = danger
        ? _danger
        : active
        ? colors.primary
        : colors.textPrimary;

    return Material(
      color: active
          ? colors.primary.withValues(alpha: 0.07)
          : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: danger
                      ? _dangerFill
                      : active
                      ? colors.primary.withValues(alpha: 0.09)
                      : colors.background,
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(
                    color: danger
                        ? _dangerBorder
                        : active
                        ? colors.primary.withValues(alpha: 0.19)
                        : Colors.transparent,
                    width: 1.5,
                  ),
                ),
                child: Icon(
                  active || danger ? activeIcon : idleIcon,
                  size: 18,
                  color: danger
                      ? _danger
                      : active
                      ? colors.primary
                      : colors.textSecondary,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: _font,
                    fontSize: 14,
                    fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                    height: 1.3,
                    color: foreground,
                  ),
                ),
              ),
              if (active) ...[
                SizedBox(width: 8),
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: colors.primary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

Color _hairline(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.07), colors.surface);
