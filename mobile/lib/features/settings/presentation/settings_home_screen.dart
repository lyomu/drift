import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_scaffold.dart';

/// Settings Home — `foundation/04-screen-inventory.md` §A.10-11. "Manage
/// connection requests" links to the existing Pending Requests screen
/// (built M5/M6) rather than duplicating it.
class SettingsHomeScreen extends StatelessWidget {
  const SettingsHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DriftScaffold(
      title: 'Settings',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          _SectionLabel('Privacy & Safety'),
          _NavRow(
            icon: Icons.privacy_tip_outlined,
            label: 'Privacy Settings',
            onTap: () => context.push('/settings/privacy'),
          ),
          const SizedBox(height: DriftSpacing.s2),
          _NavRow(
            icon: Icons.block,
            label: 'Blocked Users',
            onTap: () => context.push('/settings/blocked-users'),
          ),
          const SizedBox(height: DriftSpacing.s2),
          _NavRow(
            icon: Icons.person_add_outlined,
            label: 'Manage Connection Requests',
            onTap: () => context.push('/connections/pending'),
          ),
          const SizedBox(height: DriftSpacing.s5),
          _SectionLabel('Notifications'),
          _NavRow(
            icon: Icons.notifications_outlined,
            label: 'Notification Preferences',
            onTap: () => context.push('/notifications/preferences'),
          ),
          const SizedBox(height: DriftSpacing.s5),
          _SectionLabel('Plan & Billing'),
          _NavRow(
            icon: Icons.workspace_premium_outlined,
            label: 'Subscription & Plan',
            onTap: () => context.push('/settings/subscription'),
          ),
          const SizedBox(height: DriftSpacing.s5),
          _SectionLabel('Account'),
          _NavRow(
            icon: Icons.security_outlined,
            label: 'Account & Security',
            onTap: () => context.push('/settings/account-security'),
          ),
          const SizedBox(height: DriftSpacing.s5),
          _SectionLabel('Support'),
          _NavRow(
            icon: Icons.help_outline,
            label: 'Help & FAQ',
            onTap: () => context.push('/settings/help'),
          ),
          const SizedBox(height: DriftSpacing.s2),
          _NavRow(
            icon: Icons.mail_outline,
            label: 'Contact Support',
            onTap: () => context.push('/settings/contact-support'),
          ),
          const SizedBox(height: DriftSpacing.s2),
          _NavRow(
            icon: Icons.gavel_outlined,
            label: 'Terms & Privacy Policy',
            onTap: () => context.push('/settings/legal'),
          ),
          const SizedBox(height: DriftSpacing.s5),
          _NavRow(
            icon: Icons.delete_outline,
            label: 'Delete Account',
            onTap: () => context.push('/settings/delete-account'),
            destructive: true,
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
      child: Text(
        label,
        style: type.label.copyWith(color: colors.textSecondary),
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: onTap,
      child: Row(
        children: [
          DriftIconTile(
            icon: icon,
            tone: destructive ? DriftPillTone.error : DriftPillTone.info,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: type.title.copyWith(
                fontWeight: FontWeight.w600,
                color: destructive ? colors.error : null,
              ),
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
