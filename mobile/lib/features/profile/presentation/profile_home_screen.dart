import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../users/application/current_user_provider.dart';
import '../application/profile_providers.dart';

/// Profile — `foundation/04-screen-inventory.md` §A.10. Gained its first
/// real content in M10 (the "Learn" entry point) and grew by one more row
/// in M11 ("News"). Phase M12 gives it a real identity header and the rest
/// of its documented nav surface: My Sports Hub, Notifications, Settings.
/// Achievements now links to the derived rule catalogue.
class ProfileHomeScreen extends ConsumerWidget {
  const ProfileHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final ownProfile = ref.watch(ownProfileProvider);
    final user = ref.watch(currentUserProvider);

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(DriftSpacing.s5),
        children: [
          Text('Profile', style: type.display),
          const SizedBox(height: DriftSpacing.s5),
          DriftCard(
            onTap: () => context.push('/profile/own'),
            child: Row(
              children: [
                switch (ownProfile) {
                  AsyncData(:final value) => DriftPlayerAvatar(
                    player: value.summary,
                    radius: 28,
                  ),
                  _ => const CircleAvatar(radius: 28),
                },
                const SizedBox(width: DriftSpacing.s3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.valueOrNull?.displayName ?? 'My Profile',
                        style: type.h4,
                      ),
                      const SizedBox(height: DriftSpacing.s1),
                      Text(
                        'View your profile',
                        style: type.bodySmall.copyWith(
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
          const SizedBox(height: DriftSpacing.s5),
          _NavRow(
            icon: Icons.sports_tennis_outlined,
            label: 'My Sports Hub',
            onTap: () => context.push('/profile/sports-hub'),
          ),
          const SizedBox(height: DriftSpacing.s3),
          _NavRow(
            icon: Icons.emoji_events_outlined,
            label: 'Achievements',
            onTap: () => context.push('/profile/achievements'),
          ),
          const SizedBox(height: DriftSpacing.s3),
          _NavRow(
            icon: Icons.school_outlined,
            label: 'Learn',
            onTap: () => context.push('/learn'),
          ),
          const SizedBox(height: DriftSpacing.s3),
          _NavRow(
            icon: Icons.article_outlined,
            label: 'News',
            onTap: () => context.push('/news'),
          ),
          const SizedBox(height: DriftSpacing.s3),
          _NavRow(
            icon: Icons.notifications_outlined,
            label: 'Notifications',
            onTap: () => context.push('/notifications'),
          ),
          const SizedBox(height: DriftSpacing.s3),
          _NavRow(
            icon: Icons.settings_outlined,
            label: 'Settings',
            onTap: () => context.push('/settings'),
          ),
        ],
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: colors.primary),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(child: Text(label, style: type.title)),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
