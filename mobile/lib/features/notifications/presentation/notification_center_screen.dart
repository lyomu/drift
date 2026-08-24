import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../auth/data/auth_repository.dart';
import '../application/notifications_providers.dart';
import '../data/notifications_repository.dart';

/// Notification Center — `foundation/04-screen-inventory.md` §A.11. Delivery
/// is in-app-fetch only this phase (no FCM/APNs credentials); see
/// PROGRESS.md. Entry points: the Home app bar bell and Profile.
class NotificationCenterScreen extends ConsumerWidget {
  const NotificationCenterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(notificationsListProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            onPressed: () => context.push('/notifications/preferences'),
            icon: const Icon(Icons.tune),
            tooltip: 'Notification Preferences',
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(notificationsListProvider.future),
          child: switch (page) {
            AsyncData(:final value) =>
              value.notifications.isEmpty
                  ? ListView(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(DriftSpacing.s6),
                          child: Column(
                            children: [
                              const SizedBox(height: DriftSpacing.s12),
                              Text(
                                "You're all caught up.",
                                style: type.body.copyWith(
                                  color: colors.textSecondary,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(DriftSpacing.s4),
                      itemCount: value.notifications.length + 1,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: DriftSpacing.s2),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          return _MarkAllReadRow(
                            unreadCount: value.unreadCount,
                          );
                        }
                        final notification = value.notifications[index - 1];
                        return _NotificationTile(notification: notification);
                      },
                    ),
            AsyncError() => ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(DriftSpacing.s6),
                  child: Column(
                    children: [
                      const SizedBox(height: DriftSpacing.s12),
                      Text(
                        "Couldn't load notifications.",
                        style: type.body,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: DriftSpacing.s4),
                      DriftButton(
                        label: 'Retry',
                        variant: DriftButtonVariant.text,
                        onPressed: () =>
                            ref.invalidate(notificationsListProvider),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _MarkAllReadRow extends ConsumerWidget {
  const _MarkAllReadRow({required this.unreadCount});

  final int unreadCount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (unreadCount == 0) return const SizedBox.shrink();

    return Align(
      alignment: Alignment.centerRight,
      child: DriftButton(
        label: 'Mark all as read',
        variant: DriftButtonVariant.text,
        onPressed: () async {
          try {
            await ref.read(notificationsRepositoryProvider).markAllRead();
            ref.invalidate(notificationsListProvider);
          } on AuthException catch (_) {
            // Best-effort — the list simply won't refresh; no field to
            // surface the message in from this small a row.
          }
        },
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.notification});

  final DriftNotification notification;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Material(
      color: notification.isUnread ? colors.primaryLight : colors.surface,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _open(context, ref),
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s4),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (notification.isUnread)
                Padding(
                  padding: const EdgeInsets.only(
                    top: 6,
                    right: DriftSpacing.s2,
                  ),
                  child: CircleAvatar(
                    radius: 4,
                    backgroundColor: colors.primary,
                  ),
                ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(notification.title, style: type.title),
                    const SizedBox(height: DriftSpacing.s1),
                    Text(
                      notification.body,
                      style: type.bodySmall.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _open(BuildContext context, WidgetRef ref) async {
    if (notification.isUnread) {
      try {
        await ref
            .read(notificationsRepositoryProvider)
            .markRead(notification.id);
        ref.invalidate(notificationsListProvider);
      } on AuthException catch (_) {
        // Best-effort — still navigate even if the read-receipt failed.
      }
    }
    if (!context.mounted) return;

    final path = _deepLinkFor(notification);
    if (path != null) context.push(path);
  }

  String? _deepLinkFor(DriftNotification notification) {
    final id = notification.relatedEntityId;
    return switch (notification.relatedEntityType) {
      'MATCH' when id != null => '/matches/$id',
      'CONNECTION' => '/connections/pending',
      'CONVERSATION' when id != null => '/messages/$id',
      'SEASON' when id != null => '/compete/seasons/$id',
      // Both carry the club id — an announcement deep link opens that
      // club's Announcements list, where the new item sorts to the top.
      'CLUB' when id != null => '/discover/clubs/$id',
      'CLUB_ANNOUNCEMENT' when id != null =>
        '/discover/clubs/$id/announcements',
      _ => null,
    };
  }
}
