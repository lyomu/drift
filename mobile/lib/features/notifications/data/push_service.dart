import 'dart:io' show Platform;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'notifications_repository.dart';

/// Owns this installation's FCM token: permission, registration with our
/// backend, refresh, and removal on logout.
///
/// Every method is best-effort and swallows its failures. Push is a
/// re-engagement path — everything it delivers is already in the Notification
/// Centre — so a Firebase outage or a missing `google-services.json` must
/// never block signing in or, worse, signing out.
class PushService {
  PushService(this._repository);

  final NotificationsRepository _repository;

  String? _registeredToken;

  String get _platform => Platform.isIOS ? 'IOS' : 'ANDROID';

  /// Called once the session is authenticated — never before. A token
  /// registered while signed out has no user to attach to.
  ///
  /// Asking for permission here rather than at first launch is deliberate:
  /// people decline a prompt that arrives before they know what the app does,
  /// and on iOS that refusal is effectively permanent.
  Future<void> registerForUser() async {
    try {
      final messaging = FirebaseMessaging.instance;

      final settings = await messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        return;
      }

      final token = await messaging.getToken();
      if (token == null) return;

      await _repository.registerDevice(token: token, platform: _platform);
      _registeredToken = token;

      // Tokens rotate — on reinstall, restore, or at Firebase's discretion.
      // Without this the app keeps a token the server thinks is live and
      // notifications simply stop, with nothing to show for it.
      messaging.onTokenRefresh.listen((refreshed) async {
        try {
          await _repository.registerDevice(
            token: refreshed,
            platform: _platform,
          );
          _registeredToken = refreshed;
        } catch (e) {
          debugPrint('[push] token refresh registration failed: $e');
        }
      });
    } catch (e) {
      debugPrint('[push] registration failed: $e');
    }
  }

  /// Called on logout, **before** the local session is cleared — the call is
  /// authenticated.
  ///
  /// Leaving the token behind would deliver this user's notifications to
  /// whoever signs in on the handset next, so this is a correctness
  /// requirement, not cleanup.
  Future<void> unregister() async {
    final token = _registeredToken ?? await _currentToken();
    if (token == null) return;
    try {
      await _repository.removeDevice(token: token, platform: _platform);
    } catch (e) {
      debugPrint('[push] deregistration failed: $e');
    }
    _registeredToken = null;
  }

  Future<String?> _currentToken() async {
    try {
      return await FirebaseMessaging.instance.getToken();
    } catch (_) {
      return null;
    }
  }
}

final pushServiceProvider = Provider<PushService>((ref) {
  return PushService(ref.watch(notificationsRepositoryProvider));
});
