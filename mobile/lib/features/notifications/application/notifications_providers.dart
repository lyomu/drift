import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/notifications_repository.dart';

// `.autoDispose` throughout — the M9 convention (see PROGRESS.md).

final notificationsListProvider = FutureProvider.autoDispose<NotificationsPage>(
  (ref) {
    return ref.watch(notificationsRepositoryProvider).list();
  },
);

final notificationPreferencesProvider =
    FutureProvider.autoDispose<NotificationPreferences>((ref) {
      return ref.watch(notificationsRepositoryProvider).getPreferences();
    });
