import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';
import '../../core/network/media_url.dart';
import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/communities/data/communities_repository.dart';
import 'drift_pill.dart';
import 'drift_soft_card.dart';

/// A community in a list: photo (or the type's icon), name, type · city ·
/// how often, member count / distance, and a status pill for the viewer's
/// own relationship to it (under review, requested, admin…).
class DriftCommunityCard extends StatelessWidget {
  const DriftCommunityCard({super.key, required this.community, this.onTap});

  final Community community;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;
    final pill = _pill(context);

    final meta = [
      l10n.communityMemberCount(community.memberCount),
      if (community.distanceKm != null)
        l10n.commonKmAway(community.distanceKm.toString()),
    ].join(' · ');

    return DriftSoftCard(
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        children: [
          DriftCommunityAvatar(community: community, size: 52),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        community.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: type.title.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    if (pill != null) ...[const SizedBox(width: 8), pill],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    community.type.label,
                    community.city,
                    community.frequency.label,
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
                const SizedBox(height: 2),
                Text(
                  meta,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget? _pill(BuildContext context) {
    final l10n = context.l10n;
    switch (community.status) {
      case CommunityStatus.pending:
        return DriftPill(
          label: l10n.communityStatusUnderReview,
          tone: DriftPillTone.warning,
        );
      case CommunityStatus.rejected:
        return DriftPill(
          label: l10n.communityStatusNotApproved,
          tone: DriftPillTone.error,
        );
      case CommunityStatus.suspended:
        return DriftPill(
          label: l10n.communityStatusSuspended,
          tone: DriftPillTone.error,
        );
      case CommunityStatus.approved:
        break;
    }
    if (community.hasPendingRequest) {
      return DriftPill(
        label: l10n.communityRequested,
        tone: DriftPillTone.neutral,
      );
    }
    final membership = community.myMembership;
    if (membership != null && membership.canManage) {
      return DriftPill(label: membership.role.label);
    }
    if (community.isMember) {
      return DriftPill(
        label: l10n.communityJoined,
        tone: DriftPillTone.success,
      );
    }
    return null;
  }
}

/// The community's photo, or its type's icon on a tinted tile.
class DriftCommunityAvatar extends StatelessWidget {
  const DriftCommunityAvatar({
    super.key,
    required this.community,
    this.size = 52,
  });

  final Community community;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final url = driftMediaUrl(community.photoUrl);
    final icon = Icon(
      communityTypeIcon(community.type),
      size: size * 0.46,
      color: colors.primary,
    );
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: colors.primaryLight,
        borderRadius: BorderRadius.circular(size * 0.28),
      ),
      child: url == null
          ? icon
          : Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => icon,
            ),
    );
  }
}

IconData communityTypeIcon(CommunityType type) => switch (type) {
  CommunityType.social => Icons.groups_outlined,
  CommunityType.training => Icons.fitness_center_outlined,
  CommunityType.ladder => Icons.emoji_events_outlined,
  CommunityType.club => Icons.apartment_outlined,
};
