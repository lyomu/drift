import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_court_card.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';

/// The List segment of Court Finder Hub — `foundation/04-screen-inventory.md`
/// §A.6. Shares `courtSearchProvider`/`courtFiltersProvider` with the Map
/// segment, so toggling Map ↔ List doesn't refetch or lose filters.
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
              ? const _EmptyResults()
              : _ResultsList(courts: value.courts),
        AsyncError() => _SearchError(
          onRetry: () => ref.invalidate(courtSearchProvider),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _ResultsList extends StatelessWidget {
  const _ResultsList({required this.courts});

  final List<CourtSummary> courts;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        DriftSpacing.s4,
        0,
        DriftSpacing.s4,
        DriftSpacing.s4,
      ),
      itemCount: courts.length,
      separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s3),
      itemBuilder: (context, index) {
        final court = courts[index];
        return DriftCourtCard(
          court: court,
          onTap: () => context.push('/discover/courts/${court.id}'),
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
                Icons.location_off_outlined,
                size: 40,
                color: colors.textSecondary,
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                'No courts found in this area',
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
                "Couldn't load courts. Please try again.",
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
