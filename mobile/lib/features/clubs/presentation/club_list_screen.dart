import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_club_card.dart';
import '../application/clubs_providers.dart';
import '../data/clubs_repository.dart';

/// Club List — `foundation/04-screen-inventory.md` §A.6. Read-only browse;
/// Join/Follow, Club Feed, and Announcements need the Club Admin app (P1)
/// and are deliberately out of scope this phase (see PROGRESS.md).
class ClubListScreen extends ConsumerWidget {
  const ClubListScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final results = ref.watch(clubSearchProvider);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!embedded)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s2,
            ),
            child: Text('Clubs', style: type.display),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(clubSearchProvider.future),
            child: switch (results) {
              AsyncData(:final value) =>
                value.clubs.isEmpty
                    ? const _EmptyResults()
                    : _ResultsList(clubs: value.clubs),
              AsyncError() => _SearchError(
                onRetry: () => ref.invalidate(clubSearchProvider),
              ),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );

    return embedded ? content : SafeArea(child: content);
  }
}

class _ResultsList extends StatelessWidget {
  const _ResultsList({required this.clubs});

  final List<ClubSummary> clubs;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        DriftSpacing.s4,
        0,
        DriftSpacing.s4,
        DriftSpacing.s4,
      ),
      itemCount: clubs.length,
      separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s3),
      itemBuilder: (context, index) {
        final club = clubs[index];
        return DriftClubCard(
          club: club,
          onTap: () => context.push('/discover/clubs/${club.id}'),
        );
      },
    );
  }
}

class _EmptyResults extends StatelessWidget {
  const _EmptyResults();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    // `foundation/04-screen-inventory.md` §A.6's exact empty-state copy.
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Icon(
                Icons.groups_outlined,
                size: 40,
                color: colors.textSecondary,
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                'No clubs nearby yet',
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

class _SearchError extends StatelessWidget {
  const _SearchError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Text(
                "Couldn't load clubs. Please try again.",
                style: type.body,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftButton(
                label: 'Retry',
                variant: DriftButtonVariant.text,
                onPressed: onRetry,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
