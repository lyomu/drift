import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/media_url.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../data/communities_repository.dart';

/// One community member: avatar, name, role / level. Tapping opens their
/// profile; [trailing] carries Manage's actions.
class CommunityMemberTile extends StatelessWidget {
  const CommunityMemberTile({super.key, required this.member, this.trailing});

  final CommunityMember member;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;
    final photo = driftMediaUrl(member.photoUrl);
    final initials = member.displayName
        .trim()
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    final sub = [
      if (member.role != CommunityRole.member) member.role.label,
      if (member.level != null) l10n.commonLevel(member.level!.toStringAsFixed(1)),
    ].join(' · ');

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      onTap: () => context.push('/players/${member.userId}'),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: colors.primaryLight,
            foregroundImage: photo == null ? null : NetworkImage(photo),
            child: Text(
              initials.isEmpty ? '?' : initials,
              style: type.label.copyWith(
                color: colors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: type.title.copyWith(fontWeight: FontWeight.w600),
                ),
                if (sub.isNotEmpty)
                  Text(
                    sub,
                    style: type.caption.copyWith(color: colors.textSecondary),
                  ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}
