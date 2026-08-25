import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_coach_card.dart';
import '../application/coaches_providers.dart';
import '../data/coaches_repository.dart';
import 'coach_filters_sheet.dart';

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
    final results = ref.watch(coachSearchProvider);
    final filters = ref.watch(coachFiltersProvider);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            DriftSpacing.s4,
            DriftSpacing.s2,
            DriftSpacing.s4,
            DriftSpacing.s3,
          ),
          child: Row(
            children: [
              if (widget.embedded)
                Expanded(child: Text('Coaches', style: type.h4))
              else
                const Spacer(),
              IconButton(
                onPressed: () => showCoachFiltersSheet(context, ref),
                tooltip: 'Filter coaches',
                icon: Icon(
                  filters.isEmpty
                      ? Icons.tune_outlined
                      : Icons.filter_alt_outlined,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(coachSearchProvider.future),
            child: switch (results) {
              AsyncData(:final value) => value.isEmpty
                  ? const _EmptyCoaches()
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(
                        DriftSpacing.s4,
                        0,
                        DriftSpacing.s4,
                        DriftSpacing.s4,
                      ),
                      itemCount: value.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: DriftSpacing.s3),
                      itemBuilder: (context, index) => DriftCoachCard(
                        coach: value[index],
                        onTap: () => context.push(
                          '/discover/coaches/${value[index].id}',
                        ),
                      ),
                    ),
              AsyncError() => _CoachError(
                  onRetry: () => ref.invalidate(coachSearchProvider),
                ),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );

    if (widget.embedded) return content;
    return Scaffold(
      appBar: AppBar(title: const Text('Coaches')),
      body: SafeArea(child: content),
    );
  }
}

class _EmptyCoaches extends StatelessWidget {
  const _EmptyCoaches();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Icon(
                Icons.sports_tennis_outlined,
                size: 42,
                color: colors.textSecondary,
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                'No coaches listed near you yet',
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Text(
                'Try clearing a filter or browsing another club.',
                style: type.bodySmall.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CoachError extends StatelessWidget {
  const _CoachError({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              const Text("Couldn't load coaches. Please try again."),
              const SizedBox(height: DriftSpacing.s3),
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
