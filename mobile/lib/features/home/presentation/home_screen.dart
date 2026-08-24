import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../notifications/application/notifications_providers.dart';
import '../application/home_feed_provider.dart';
import '../data/home_repository.dart';

/// Home Dashboard — `foundation/04-screen-inventory.md` §A.3. Every real
/// Drift user is currently in the "New user" state (no Match/Competition
/// data exists until M5+), so the feed is built entirely from onboarding
/// data — see `HomeService` on the backend for the card-priority logic.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final feed = ref.watch(homeFeedProvider);

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => ref.refresh(homeFeedProvider.future),
        child: switch (feed) {
          AsyncData(:final value) => _HomeFeedList(cards: value, type: type),
          AsyncError() => _HomeFeedError(
            onRetry: () => ref.invalidate(homeFeedProvider),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _HomeFeedList extends StatelessWidget {
  const _HomeFeedList({required this.cards, required this.type});

  final List<HomeCard> cards;
  final DriftTypography type;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      children: [
        Row(
          children: [
            Expanded(child: Text('Home', style: type.display)),
            const _NotificationBell(),
          ],
        ),
        const SizedBox(height: DriftSpacing.s4),
        for (final card in cards) ...[
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(card.title, style: type.h4),
                if (card.body.isNotEmpty) ...[
                  const SizedBox(height: DriftSpacing.s1),
                  Text(card.body, style: type.body),
                ],
              ],
            ),
          ),
          const SizedBox(height: DriftSpacing.s3),
        ],
      ],
    );
  }
}

/// The second of Notification Center's two documented entry points
/// (alongside Profile) — every user lands on Home, so it's the one place
/// the badge is guaranteed to be seen.
class _NotificationBell extends ConsumerWidget {
  const _NotificationBell();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final unreadCount = ref
        .watch(notificationsListProvider)
        .valueOrNull
        ?.unreadCount;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          onPressed: () => context.push('/notifications'),
          icon: const Icon(Icons.notifications_outlined),
          tooltip: 'Notifications',
        ),
        if (unreadCount != null && unreadCount > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(
                color: colors.error,
                borderRadius: BorderRadius.circular(999),
              ),
              constraints: const BoxConstraints(minWidth: 16),
              child: Text(
                unreadCount > 9 ? '9+' : '$unreadCount',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _HomeFeedError extends StatelessWidget {
  const _HomeFeedError({required this.onRetry});

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
              const SizedBox(height: DriftSpacing.s16),
              Text(
                "Couldn't load your Home feed. Please try again.",
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
