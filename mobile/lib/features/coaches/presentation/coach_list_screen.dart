import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/media_url.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/coaches_providers.dart';
import '../data/coaches_repository.dart';
import 'coach_filters_sheet.dart';

/// Coach List — `foundation/04-screen-inventory.md` §A.6 (redesign 2026-08:
/// `App.tsx` `DiscoverCoachesTab`).
class CoachListScreen extends ConsumerStatefulWidget {
  const CoachListScreen({
    super.key,
    this.embedded = false,
    this.initialClubId,
    this.initialClubName,
  });

  final bool embedded;
  final String? initialClubId;
  final String? initialClubName;

  @override
  ConsumerState<CoachListScreen> createState() => _CoachListScreenState();
}

class _CoachListScreenState extends ConsumerState<CoachListScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.initialClubId != null) {
      ref.read(coachFiltersProvider.notifier).state = CoachFilters(
        clubId: widget.initialClubId,
        clubName: widget.initialClubName,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final results = ref.watch(coachSearchProvider);
    final filters = ref.watch(coachFiltersProvider);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Coaches',
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              _FilterSquare(
                active: !filters.isEmpty,
                onTap: () => showCoachFiltersSheet(context, ref),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(coachSearchProvider.future),
            child: switch (results) {
              AsyncData(:final value) =>
                value.isEmpty
                    ? _message(colors, type, 'No coaches listed near you yet')
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        itemCount: value.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (context, i) =>
                            _CoachCard(coach: value[i]),
                      ),
              AsyncError() => _message(
                colors,
                type,
                "Couldn't load coaches. Pull to retry.",
              ),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );

    if (widget.embedded) return content;
    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Coaches'),
            Expanded(child: content),
          ],
        ),
      ),
    );
  }

  Widget _message(DriftColors colors, DriftTypography type, String text) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Column(
            children: [
              Icon(
                Icons.sports_tennis_outlined,
                size: 40,
                color: colors.textSecondary,
              ),
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

class _FilterSquare extends StatelessWidget {
  const _FilterSquare({required this.active, required this.onTap});

  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(9),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: colors.border),
          ),
          child: Icon(
            Icons.tune,
            size: 17,
            color: active ? colors.primary : colors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _CoachCard extends StatelessWidget {
  const _CoachCard({required this.coach});

  final CoachSummary coach;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final initials = coach.displayName
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();
    final photoUrl = driftMediaUrl(coach.photoUrl);

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: () => context.push('/discover/coaches/${coach.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: colors.primary,
                foregroundImage: photoUrl == null
                    ? null
                    : NetworkImage(photoUrl),
                onForegroundImageError: photoUrl == null ? null : (_, _) {},
                child: Text(
                  initials.isEmpty ? 'C' : initials,
                  style: type.label.copyWith(color: Colors.white),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      coach.displayName,
                      style: type.title.copyWith(fontWeight: FontWeight.w700),
                    ),
                    if (coach.specialisations.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: [
                          for (final s in coach.specialisations)
                            DriftPill(label: s),
                        ],
                      ),
                    ],
                    if (coach.levels.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        coach.levels.map((l) => l.label).join(' · '),
                        style: type.caption.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                    if (coach.clubs.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.place_outlined,
                            size: 12,
                            color: colors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              coach.clubs.first.name,
                              style: type.caption.copyWith(
                                color: colors.textSecondary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Material(
            color: colors.primaryLight,
            borderRadius: BorderRadius.circular(10),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => context.push('/discover/coaches/${coach.id}'),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Center(
                  child: Text(
                    'View profile',
                    style: type.button.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
