import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/clubs_providers.dart';
import '../data/clubs_repository.dart';

/// Announcements — `foundation/04-screen-inventory.md` §A.9. Official club
/// posts, deliberately separate from the conversational Club Feed.
///
/// Members only: the endpoint sits behind the club membership guard, so a
/// pending request gets a 403 until an admin approves it. Drafts are
/// filtered server-side — an ordinary member never sees one.
class ClubAnnouncementsScreen extends ConsumerWidget {
  const ClubAnnouncementsScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final announcements = ref.watch(clubAnnouncementsProvider(clubId));

    return DriftScaffold(
      title: 'Announcements',
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(clubAnnouncementsProvider(clubId));
          await ref.read(clubAnnouncementsProvider(clubId).future);
        },
        child: switch (announcements) {
          AsyncData(:final value) when value.isEmpty => const _Empty(),
          AsyncData(:final value) => ListView.separated(
            padding: const EdgeInsets.all(DriftSpacing.s5),
            itemCount: value.length,
            separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s3),
            itemBuilder: (context, i) => _AnnouncementCard(value[i]),
          ),
          AsyncError() => const _NotAvailable(),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard(this.announcement);

  final Announcement announcement;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (announcement.pinned) ...[
                Icon(Icons.push_pin, size: 16, color: colors.primary),
                const SizedBox(width: DriftSpacing.s2),
              ],
              Expanded(child: Text(announcement.title, style: type.title)),
            ],
          ),
          const SizedBox(height: DriftSpacing.s2),
          Text(announcement.body, style: type.body),
          if (announcement.publishedAt != null) ...[
            const SizedBox(height: DriftSpacing.s3),
            Text(
              _formatDate(announcement.publishedAt!),
              style: type.caption.copyWith(color: colors.textSecondary),
            ),
          ],
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final local = date.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        const SizedBox(height: DriftSpacing.s8),
        Center(
          child: Text(
            'No announcements yet',
            style: TextStyle(color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}

class _NotAvailable extends StatelessWidget {
  const _NotAvailable();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        const SizedBox(height: DriftSpacing.s8),
        Center(
          child: Text(
            'Join this club to see its announcements.',
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}
