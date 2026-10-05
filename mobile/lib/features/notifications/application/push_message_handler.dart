import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../domain/notification_deep_link.dart';
import '../data/notifications_repository.dart';
import 'notifications_providers.dart';

/// Wires the three states a push can arrive in. Installed once, from the app
/// root.
///
/// The terminated case is the one usually missed, and it is the one that
/// matters most here: a re-engagement feature exists precisely for people who
/// do not have the app running.
class PushMessageHandler {
  PushMessageHandler(this._ref, this._router, this._messengerKey);

  /// `WidgetRef` rather than `Ref` — this is installed from the app widget,
  /// not from inside a provider.
  final WidgetRef _ref;
  final GoRouter _router;
  final GlobalKey<ScaffoldMessengerState> _messengerKey;

  Future<void> start() async {
    try {
      // Terminated: the tap that launched the process. Returns null on a
      // normal launch.
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) _open(initial);

      // Background: the app was alive but not on screen.
      FirebaseMessaging.onMessageOpenedApp.listen(_open);

      // Foreground: system trays intentionally do not surface FCM here, so
      // show the same lightweight, tappable update people expect from modern
      // messaging apps while keeping the Notification Centre authoritative.
      FirebaseMessaging.onMessage.listen((message) {
        _ref.invalidate(notificationsListProvider);
        _showForegroundBanner(message);
      });
    } catch (e) {
      // No Firebase configuration in this build — expected until the console
      // work lands. Everything still reaches people through the Notification
      // Centre.
      debugPrint('[push] message handling unavailable: $e');
    }
  }

  void _open(RemoteMessage message) {
    final notificationId = message.data['notificationId'] as String?;
    if (notificationId != null) {
      // A push contains the server notification id, so opening it has the
      // same read semantics as tapping its Notification Centre row.
      _ref
          .read(notificationsRepositoryProvider)
          .markRead(notificationId)
          .catchError((_) {});
    }
    final path = notificationDeepLink(
      relatedEntityType: message.data['relatedEntityType'] as String?,
      relatedEntityId: message.data['relatedEntityId'] as String?,
    );
    // Same mapping the in-app row uses, so a push tap and a tap in the
    // Notification Centre can never disagree about where something opens.
    if (path != null) _router.push(path);
  }

  void _showForegroundBanner(RemoteMessage message) {
    final notification = message.notification;
    final title = notification?.title ?? 'New update from Drift Tennis';
    final body = notification?.body ?? 'Open to see what changed.';
    _messengerKey.currentState
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(body),
            ],
          ),
          action: SnackBarAction(
            label: 'Open',
            onPressed: () => _open(message),
          ),
        ),
      );
  }
}
