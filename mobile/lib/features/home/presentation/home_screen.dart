import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../news/application/news_providers.dart';
import '../application/home_feed_provider.dart';
import '../application/home_sections.dart';
import 'home_header.dart';
import 'sections/action_needed_rail.dart';
import 'sections/courts_near_you_list.dart';
import 'sections/next_match_card.dart';
import 'sections/players_near_you_rail.dart';
import 'sections/progress_card.dart';
import 'sections/quick_actions_grid.dart';
import 'sections/tennis_news_rail.dart';

/// Home Dashboard — `foundation/04-screen-inventory.md` §A.3 (redesign 2026-08).
///
/// Fixed sections instead of a flat list. Content still comes from
/// `/home/feed` + `/home/summary` — [HomeSections] just decides which section
/// each feed card belongs to. The core sections (Next match, Players/Courts
/// near you, Your progress) always render, with an empty state when the feed
/// gave them nothing; "Action needed" and "Tennis news" hide when empty.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(homeFeedProvider);

    Future<void> refresh() {
      ref.invalidate(homeSummaryProvider);
      ref.invalidate(newsFeedProvider);
      return ref.refresh(homeFeedProvider.future);
    }

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: refresh,
        child: switch (feed) {
          AsyncData(:final value) => _HomeBody(sections: HomeSections(value)),
          AsyncError() => _HomeError(
            onRetry: () => ref.invalidate(homeFeedProvider),
          ),
          _ => const _HomeLoading(),
        },
      ),
    );
  }
}

class _HomeBody extends StatelessWidget {
  const _HomeBody({required this.sections});

  final HomeSections sections;

  @override
  Widget build(BuildContext context) {
    const gap = SizedBox(height: 20);
    final actionNeeded = sections.actionNeeded;

    return ListView(
      padding: const EdgeInsets.only(top: 8, bottom: 32),
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: HomeHeader(),
        ),
        gap,
        if (actionNeeded.isNotEmpty) ...[
          ActionNeededRail(cards: actionNeeded),
          gap,
        ],
        const QuickActionsGrid(),
        gap,
        NextMatchSection(matchId: sections.nextMatch?.data?.matchId),
        gap,
        PlayersNearYouSection(
          players: sections.players?.data?.players ?? const [],
        ),
        gap,
        CourtsNearYouSection(courts: sections.courts?.data?.courts ?? const []),
        gap,
        const ProgressSection(),
        gap,
        const TennisNewsRail(),
      ],
    );
  }
}

class _HomeLoading extends StatelessWidget {
  const _HomeLoading();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(top: 8),
      children: const [
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: HomeHeader(),
        ),
        SizedBox(height: 40),
        Center(child: CircularProgressIndicator()),
      ],
    );
  }
}

class _HomeError extends StatelessWidget {
  const _HomeError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return ListView(
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: HomeHeader(),
        ),
        const SizedBox(height: 40),
        Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Text(
                "Couldn't load your Home feed. Please try again.",
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
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
