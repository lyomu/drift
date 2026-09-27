import 'package:clarity_flutter/clarity_flutter.dart';
import 'package:flutter/material.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

/// Analytics for the app: Microsoft Clarity for session replay and heatmaps,
/// PostHog for events and funnels.
///
/// Configured by `--dart-define`, the same way the API base URL and the social
/// sign-in ids are (see `core/network/dio_client.dart`,
/// `features/auth/data/social_auth_service.dart`):
///
///   flutter build apk \
///     --dart-define=DRIFT_CLARITY_PROJECT_ID=xxxxxxxx \
///     --dart-define=DRIFT_POSTHOG_KEY=phc_xxxxxxxx \
///     --dart-define=DRIFT_POSTHOG_HOST=https://eu.i.posthog.com
///
/// Every entry point here is a no-op when its key is absent, and every call
/// into a vendor SDK is guarded, because an unconfigured or offline build must
/// still run normally — the same reasoning as the guarded `Firebase.initializeApp`
/// in `main.dart`. Analytics is the least important thing in the app and must
/// never be the reason it fails to start.
const clarityProjectId = String.fromEnvironment('DRIFT_CLARITY_PROJECT_ID');
const posthogKey = String.fromEnvironment('DRIFT_POSTHOG_KEY');
const posthogHost = String.fromEnvironment(
  'DRIFT_POSTHOG_HOST',
  defaultValue: 'https://eu.i.posthog.com',
);

bool get clarityEnabled => clarityProjectId.isNotEmpty;
bool get posthogEnabled => posthogKey.isNotEmpty;

/// Initialises PostHog. Clarity is not initialised here: its Flutter SDK works
/// by wrapping the widget tree, which `main.dart` does instead.
///
/// Screen views are sent by [AnalyticsNavigatorObserver] rather than by
/// PostHog's own capture, so `captureApplicationLifecycleEvents` is the only
/// automatic capture left on.
Future<void> initAnalytics() async {
  if (!posthogEnabled) return;
  try {
    await Posthog().setup(
      PostHogConfig(posthogKey)
        ..host = posthogHost
        ..captureApplicationLifecycleEvents = true,
    );
  } catch (e) {
    debugPrint('[analytics] PostHog setup failed: $e');
  }
}

/// Records a custom event. Safe to call unconditionally from feature code.
Future<void> trackEvent(
  String name, {
  Map<String, Object>? properties,
}) async {
  if (!posthogEnabled) return;
  try {
    await Posthog().capture(eventName: name, properties: properties);
  } catch (e) {
    debugPrint('[analytics] capture "$name" failed: $e');
  }
}

/// Ties the current person to their Drift user id, so a session in Clarity or
/// PostHog can be matched to an account. Call after a successful sign-in.
Future<void> identifyUser(String userId) async {
  if (posthogEnabled) {
    try {
      await Posthog().identify(userId: userId);
    } catch (e) {
      debugPrint('[analytics] identify failed: $e');
    }
  }
  if (clarityEnabled) {
    try {
      Clarity.setCustomUserId(userId);
    } catch (e) {
      debugPrint('[analytics] Clarity setCustomUserId failed: $e');
    }
  }
}

/// Clears the identity on sign-out so the next person on the device is not
/// recorded as the previous one.
Future<void> resetAnalyticsIdentity() async {
  if (posthogEnabled) {
    try {
      await Posthog().reset();
    } catch (e) {
      debugPrint('[analytics] reset failed: $e');
    }
  }
}

/// Reports route changes as screen views.
///
/// Without this a whole session arrives as one undifferentiated recording and
/// a single `$pageview`, because go_router pushes routes rather than reloading
/// a document. Registered on the router in `core/router/app_router.dart`.
class AnalyticsNavigatorObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _report(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    // After a pop the screen in view is the one underneath.
    _report(previousRoute);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    _report(newRoute);
  }

  void _report(Route<dynamic>? route) {
    final name = _screenName(route);
    if (name == null) return;

    if (posthogEnabled) {
      try {
        Posthog().screen(screenName: name);
      } catch (e) {
        debugPrint('[analytics] screen "$name" failed: $e');
      }
    }

    // Labels the replay, so a Clarity recording can be scrubbed by screen
    // instead of watched end to end.
    if (clarityEnabled) {
      try {
        Clarity.setCurrentScreenName(name);
      } catch (e) {
        debugPrint('[analytics] Clarity screen "$name" failed: $e');
      }
    }
  }

  /// go_router names each page `state.name ?? state.path`. None of this app's
  /// 89 routes declare a `name:`, so what arrives here is the path PATTERN —
  /// `/match/:id`, not `/match/7f3a…`. That is what you want: every match
  /// detail view groups under one screen instead of becoming thousands of
  /// one-visit screens.
  ///
  /// Anything without a name is skipped rather than reported as "unknown",
  /// which would bury real screens under one meaningless bucket.
  String? _screenName(Route<dynamic>? route) {
    final name = route?.settings.name;
    if (name == null || name.isEmpty) return null;
    return name;
  }
}
