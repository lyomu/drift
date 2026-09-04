import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/auth_repository.dart';
import '../../features/profile/application/profile_providers.dart';
import '../../features/users/application/current_user_provider.dart';
import '../../shared/widgets/drift_icon_tile.dart';
import '../../shared/widgets/drift_pill.dart';
import '../../shared/widgets/drift_player_card.dart';
import '../network/dio_client.dart';
import '../theme/drift_colors.dart';
import '../theme/drift_typography.dart';

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
    if (!mounted) return;
    context.go('/welcome');
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Drawer(
      backgroundColor: colors.background,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _DrawerIdentity(onTap: () => _go('/profile/own')),
            Divider(color: colors.border, height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                children: [
                  _DrawerRow(
                    icon: Icons.person_outline,
                    label: 'My Profile',
                    onTap: () => _go('/profile/own'),
                  ),
                  _DrawerRow(
                    icon: Icons.sports_tennis_outlined,
                    label: 'My Sports Hub',
                    onTap: () => _go('/profile/sports-hub'),
                  ),
                  _DrawerRow(
                    icon: Icons.emoji_events_outlined,
                    label: 'Achievements',
                    onTap: () => _go('/profile/achievements'),
                  ),
                  _DrawerRow(
                    icon: Icons.article_outlined,
                    label: 'News',
                    onTap: () => _go('/news'),
                  ),
                  _DrawerRow(
                    icon: Icons.notifications_outlined,
                    label: 'Notifications',
                    onTap: () => _go('/notifications'),
                  ),
                  _DrawerRow(
                    icon: Icons.settings_outlined,
                    label: 'Settings',
                    onTap: () => _go('/settings'),
                  ),
                ],
              ),
            ),
            Divider(color: colors.border, height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: _DrawerRow(
                icon: Icons.logout,
                label: _isLoggingOut ? 'Signing out…' : 'Log out',
                tone: DriftPillTone.error,
                foregroundColor: colors.error,
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
    final type = Theme.of(context).extension<DriftTypography>()!;
    final ownProfile = ref.watch(ownProfileProvider);
    final user = ref.watch(currentUserProvider).valueOrNull;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 16, 20),
        child: Row(
          children: [
            switch (ownProfile) {
              AsyncData(:final value) => DriftPlayerAvatar(
                player: value.summary,
                radius: 26,
              ),
              _ => CircleAvatar(
                radius: 26,
                backgroundColor: colors.primaryLight,
              ),
            },
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user?.displayName ?? 'My Profile',
                    style: type.title.copyWith(fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    user?.email ?? 'View your profile',
                    style: type.caption.copyWith(color: colors.textSecondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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

class _DrawerRow extends StatelessWidget {
  const _DrawerRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.tone = DriftPillTone.info,
    this.foregroundColor,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final DriftPillTone tone;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            children: [
              DriftIconTile(icon: icon, tone: tone),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: type.title.copyWith(
                    fontWeight: FontWeight.w600,
                    color: foregroundColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
