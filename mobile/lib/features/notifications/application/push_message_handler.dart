import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../domain/notification_deep_link.dart';
import 'notifications_providers.dart';

/// Wires the three states a push can arrive in. Installed once, from the app
/// root.
///
/// The terminated case is the one usually missed, and it is the one that
/// matters most here: a re-engagement feature exists precisely for people who
/// do not have the app running.
class PushMessageHandler {
  PushMessageHandler(this._ref, this._router);

  /// `WidgetRef` rather than `Ref` — this is installed from the app widget,
  /// not from inside a provider.
  final WidgetRef _ref;
  final GoRouter _router;

  Future<void> start() async {
    try {
      // Terminated: the tap that launched the process. Returns null on a
      // normal launch.
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) _open(initial);

      // Background: the app was alive but not on screen.
      FirebaseMessaging.onMessageOpenedApp.listen(_open);

      // Foreground: Android does not display these itself, and a heads-up
      // banner over the app someone is already using is noise. Refreshing the
      // Notification Centre instead keeps the bell count honest without
      // interrupting anyone.
      FirebaseMessaging.onMessage.listen((_) {
        _ref.invalidate(notificationsListProvider);
      });
    } catch (e) {
      // No Firebase configuration in this build — expected until the console
      // work lands. Everything still reaches people through the Notification
      // Centre.
      debugPrint('[push] message handling unavailable: $e');
    }
  }

  void _open(RemoteMessage message) {
    final path = notificationDeepLink(
      relatedEntityType: message.data['relatedEntityType'] as String?,
      relatedEntityId: message.data['relatedEntityId'] as String?,
    );
    // Same mapping the in-app row uses, so a push tap and a tap in the
    // Notification Centre can never disagree about where something opens.
    if (path != null) _router.push(path);
  }
}
