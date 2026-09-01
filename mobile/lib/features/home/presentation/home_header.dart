import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../notifications/application/notifications_providers.dart';
import '../application/home_feed_provider.dart';
import 'sections/home_stat_card.dart';

const _weekdays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// Date · greeting · notification bell, then the gradient stat card. Degrades
/// quietly: the greeting still renders while `/home/summary` loads or fails.
class HomeHeader extends ConsumerWidget {
  const HomeHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final summary = ref.watch(homeSummaryProvider).valueOrNull;

    final now = DateTime.now();
    final dateLine =
        '${_weekdays[now.weekday - 1]}, ${now.day} '
        '${_months[now.month - 1]}';
    final greeting = summary?.firstName == null
        ? 'Welcome back'
        : 'Hi, ${summary!.firstName}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dateLine,
                    style: type.caption.copyWith(color: colors.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    greeting,
                    style: type.h2.copyWith(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            const _NotificationBell(),
          ],
        ),
        const SizedBox(height: 20),
        HomeStatCard(summary: summary),
      ],
    );
  }
}

/// The second of Notification Center's two entry points (with Profile) —
/// every user lands on Home, so the badge is guaranteed to be seen here.
class _NotificationBell extends ConsumerWidget {
  const _NotificationBell();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final unread = ref
        .watch(notificationsListProvider)
        .valueOrNull
        ?.unreadCount;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: colors.surface,
          shape: CircleBorder(side: BorderSide(color: colors.border)),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => context.push('/notifications'),
            child: SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.notifications_outlined,
                size: 20,
                color: colors.textPrimary,
              ),
            ),
          ),
        ),
        if (unread != null && unread > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: colors.error,
                shape: BoxShape.circle,
                border: Border.all(color: colors.background, width: 2),
              ),
            ),
          ),
      ],
    );
  }
}
