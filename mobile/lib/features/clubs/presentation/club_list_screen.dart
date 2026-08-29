import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../auth/data/auth_repository.dart';
import '../../courts/data/courts_repository.dart';
import '../application/clubs_providers.dart';
import '../data/clubs_repository.dart';

/// Club List — `foundation/04-screen-inventory.md` §A.6 (redesign 2026-08:
/// `App.tsx` `DiscoverClubsTab`). Browse + request-to-join; the feed and
/// announcements live on the club detail screen for active members.
class ClubListScreen extends ConsumerWidget {
  const ClubListScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final results = ref.watch(clubSearchProvider);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!embedded)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Text(
              'Clubs',
              style: type.h2.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(clubSearchProvider.future),
            child: switch (results) {
              AsyncData(:final value) =>
                value.clubs.isEmpty
                    ? _message(
                        colors,
                        type,
                        Icons.groups_outlined,
                        'No clubs nearby yet',
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: value.clubs.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, i) =>
                            _ClubRow(club: value.clubs[i]),
                      ),
              AsyncError() => _message(
                colors,
                type,
                Icons.error_outline,
                "Couldn't load clubs. Pull to retry.",
              ),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );

    return embedded ? content : SafeArea(child: content);
  }

  Widget _message(
    DriftColors colors,
    DriftTypography type,
    IconData icon,
    String text,
  ) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Column(
            children: [
              Icon(icon, size: 40, color: colors.textSecondary),
              const SizedBox(height: 12),
              Text(
                text,
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ClubRow extends ConsumerStatefulWidget {
  const _ClubRow({required this.club});

  final ClubSummary club;

  @override
  ConsumerState<_ClubRow> createState() => _ClubRowState();
}

class _ClubRowState extends ConsumerState<_ClubRow> {
  bool _busy = false;
  bool _requested = false;

  Future<void> _join() async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(clubsRepositoryProvider).requestToJoin(widget.club.id);
      if (mounted) setState(() => _requested = true);
      messenger.showSnackBar(
        const SnackBar(content: Text('Join request sent.')),
      );
    } on AuthException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final club = widget.club;
    final verified =
        club.verificationStatus == ListingVerificationStatus.verified;

    final pills = <Widget>[
      if (club.courtCount > 0)
        DriftPill(
          label: '${club.courtCount} courts',
          tone: DriftPillTone.neutral,
        ),
      if (club.distanceKm != null)
        DriftPill(label: '${club.distanceKm!.toStringAsFixed(1)} km'),
    ];

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: () => context.push('/discover/clubs/${club.id}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const DriftIconTile(
            icon: Icons.apartment_outlined,
            size: 42,
            radius: 12,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        club.name,
                        style: type.title.copyWith(fontWeight: FontWeight.w700),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (verified) ...[
                      const SizedBox(width: 6),
                      const DriftPill(
                        label: 'Verified',
                        tone: DriftPillTone.success,
                      ),
                    ],
                  ],
                ),
                if (club.address != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    club.address!,
                    style: type.caption.copyWith(color: colors.textSecondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                if (pills.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Wrap(spacing: 6, runSpacing: 6, children: pills),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          _JoinButton(busy: _busy, requested: _requested, onTap: _join),
        ],
      ),
    );
  }
}

class _JoinButton extends StatelessWidget {
  const _JoinButton({
    required this.busy,
    required this.requested,
    required this.onTap,
  });

  final bool busy;
  final bool requested;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    if (requested) {
      return Text(
        'Requested',
        style: type.caption.copyWith(
          color: colors.textSecondary,
          fontWeight: FontWeight.w600,
        ),
      );
    }

    return Material(
      color: colors.primary,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: busy ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          child: busy
              ? const SizedBox(
                  width: 13,
                  height: 13,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(
                  'Join',
                  style: type.caption.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
      ),
    );
  }
}
