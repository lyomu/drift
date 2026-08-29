import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';

/// The List segment of Court Finder Hub — `foundation/04-screen-inventory.md`
/// §A.6 (redesign 2026-08: `App.tsx` `DiscoverCourtsTab`). Shares
/// `courtSearchProvider`/`courtFiltersProvider` with the Map segment.
class CourtListView extends ConsumerWidget {
  const CourtListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final results = ref.watch(courtSearchProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(courtSearchProvider.future),
      child: switch (results) {
        AsyncData(:final value) =>
          value.courts.isEmpty
              ? const _Message(
                  icon: Icons.location_off_outlined,
                  text: 'No courts found in this area',
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                  itemCount: value.courts.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) =>
                      _CourtRow(court: value.courts[i]),
                ),
        AsyncError() => const _Message(
          icon: Icons.error_outline,
          text: "Couldn't load courts. Pull to retry.",
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _CourtRow extends StatelessWidget {
  const _CourtRow({required this.court});

  final CourtSummary court;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final verified =
        court.verificationStatus == ListingVerificationStatus.verified;

    final pills = <Widget>[
      if (court.indoorAvailable)
        const DriftPill(label: 'Indoor', tone: DriftPillTone.neutral),
      if (court.outdoorAvailable)
        const DriftPill(label: 'Outdoor', tone: DriftPillTone.neutral),
      for (final s in court.surfaces)
        DriftPill(label: s, tone: DriftPillTone.neutral),
      if (court.distanceKm != null)
        DriftPill(label: '${court.distanceKm!.toStringAsFixed(1)} km'),
    ];

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: () => context.push('/discover/courts/${court.id}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const DriftIconTile(
            icon: Icons.sports_tennis_outlined,
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
                        court.name,
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
                if (court.address != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    court.address!,
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
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
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
