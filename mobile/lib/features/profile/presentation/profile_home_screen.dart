import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/application/current_user_provider.dart';
import '../application/profile_providers.dart';

/// Profile — `foundation/04-screen-inventory.md` §A.10 (redesign 2026-08:
/// `App.tsx` `ProfileScreen`). Identity card + the nav surface: My Sports
/// Hub, Achievements, Learn, News, Notifications, Settings.
class ProfileHomeScreen extends ConsumerStatefulWidget {
  const ProfileHomeScreen({super.key});

  @override
  ConsumerState<ProfileHomeScreen> createState() => _ProfileHomeScreenState();
}

class _ProfileHomeScreenState extends ConsumerState<ProfileHomeScreen> {
  bool _isLoggingOut = false;

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
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final ownProfile = ref.watch(ownProfileProvider);
    final user = ref.watch(currentUserProvider);

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text('Profile', style: type.h2),
          const SizedBox(height: 16),
          DriftSoftCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            onTap: () => context.push('/profile/own'),
            child: Row(
              children: [
                switch (ownProfile) {
                  AsyncData(:final value) => DriftPlayerAvatar(
                    player: value.summary,
                    radius: 22,
                  ),
                  _ => CircleAvatar(
                    radius: 22,
                    backgroundColor: colors.primaryLight,
                  ),
                },
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.valueOrNull?.displayName ?? 'My Profile',
                        style: type.title.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'View your profile',
                        style: type.caption.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: colors.textSecondary),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _MenuRow(
            icon: Icons.sports_tennis_outlined,
            label: 'My Sports Hub',
            onTap: () => context.push('/profile/sports-hub'),
          ),
          const SizedBox(height: 8),
          _MenuRow(
            icon: Icons.emoji_events_outlined,
            label: 'Achievements',
            onTap: () => context.push('/profile/achievements'),
          ),
          const SizedBox(height: 8),
          _MenuRow(
            icon: Icons.school_outlined,
            label: 'Learn',
            onTap: () => context.push('/learn'),
          ),
          const SizedBox(height: 8),
          _MenuRow(
            icon: Icons.article_outlined,
            label: 'News',
            onTap: () => context.push('/news'),
          ),
          const SizedBox(height: 8),
          _MenuRow(
            icon: Icons.notifications_outlined,
            label: 'Notifications',
            onTap: () => context.push('/notifications'),
          ),
          const SizedBox(height: 8),
          _MenuRow(
            icon: Icons.settings_outlined,
            label: 'Settings',
            onTap: () => context.push('/settings'),
          ),
          const SizedBox(height: 20),
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

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: onTap,
      child: Row(
        children: [
          DriftIconTile(icon: icon),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: type.title.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
