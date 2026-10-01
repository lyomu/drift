import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../analytics/analytics.dart';
import '../../features/auth/data/auth_repository.dart';
import '../../features/profile/application/profile_providers.dart';
import '../../features/users/application/current_user_provider.dart';
import '../../shared/widgets/drift_symbol.dart';
import '../network/dio_client.dart';
import '../theme/drift_colors.dart';

/// The prototype's family. Only the ported screens are on Outfit — the rest
/// of the app is still DM Sans, so this cannot go in the global theme yet.
const _font = 'Outfit';

const _ink = Color(0xFF0F172A);
const _slate = Color(0xFF64748B);
const _idleTile = Color(0xFFF4F6FA);
const _danger = Color(0xFFEF4444);
const _dangerFill = Color(0xFFFEF2F2);
const _dangerBorder = Color(0xFFFECACA);

/// One drawer destination. [activeIcon] is the filled cut, [idleIcon] the
/// package's outlined default.
typedef _NavItem = ({
  String label,
  IconData activeIcon,
  IconData idleIcon,
  String route,
});

const _navItems = <_NavItem>[
  (
    label: 'My Profile',
    activeIcon: DriftSymbolsFilled.person,
    idleIcon: Symbols.person_rounded,
    route: '/profile/own',
  ),
  (
    label: 'My Sports Hub',
    activeIcon: DriftSymbolsFilled.sportsTennis,
    idleIcon: Symbols.sports_tennis_rounded,
    route: '/profile/sports-hub',
  ),
  (
    label: 'Achievements',
    activeIcon: DriftSymbolsFilled.emojiEvents,
    idleIcon: Symbols.emoji_events_rounded,
    route: '/profile/achievements',
  ),
  (
    label: 'News',
    activeIcon: DriftSymbolsFilled.newspaper,
    idleIcon: Symbols.newspaper_rounded,
    route: '/news',
  ),
  (
    label: 'Notifications',
    activeIcon: DriftSymbolsFilled.notifications,
    idleIcon: Symbols.notifications_rounded,
    route: '/notifications',
  ),
  (
    label: 'Settings',
    activeIcon: DriftSymbolsFilled.settings,
    idleIcon: Symbols.settings_rounded,
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
    final location =
        GoRouter.of(context).routeInformationProvider.value.uri.path;

    return Drawer(
      backgroundColor: colors.surface,
      width: 280,
      shape: const RoundedRectangleBorder(),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _DrawerIdentity(onTap: () => _go('/profile/own')),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  for (final item in _navItems) ...[
                    _DrawerRow(
                      activeIcon: item.activeIcon,
                      idleIcon: item.idleIcon,
                      label: item.label,
                      active: location == item.route,
                      onTap: () => _go(item.route),
                    ),
                    const SizedBox(height: 2),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: _hairline(colors), width: 1),
                ),
              ),
              child: _DrawerRow(
                activeIcon: DriftSymbolsFilled.logout,
                idleIcon: DriftSymbolsFilled.logout,
                label: _isLoggingOut ? 'Signing out…' : 'Log out',
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
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
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
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user?.displayName ?? 'My Profile',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: _font,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                      color: _ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    user?.email ?? 'View your profile',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: _font,
                      fontSize: 12,
                      fontWeight: FontWeight.w400,
                      height: 1.3,
                      color: _slate,
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
        : _ink;

    return Material(
      color: active
          ? colors.primary.withValues(alpha: 0.07)
          : Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
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
                      : _idleTile,
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
                      : _slate,
                ),
              ),
              const SizedBox(width: 12),
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
                const SizedBox(width: 8),
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
