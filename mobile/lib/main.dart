import 'package:clarity_flutter/clarity_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/analytics/analytics.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/notifications/application/push_message_handler.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Guarded on purpose. Until `google-services.json` /
  // `GoogleService-Info.plist` are added (see docs/PUSH_NOTIFICATIONS_PLAN.md)
  // this throws, and an unconfigured build must still start — push is the only
  // thing that goes missing, and everything it would have delivered is still
  // in the Notification Centre.
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('[push] Firebase not configured in this build: $e');
  }

  // Guarded for the same reason as Firebase above: analytics is the least
  // important thing in the app and must never stop it starting. A build with
  // no keys skips this entirely.
  try {
    await initAnalytics();
  } catch (e) {
    debugPrint('[analytics] not configured in this build: $e');
  }

  runApp(const ProviderScope(child: DriftTennisApp()));
}

class DriftTennisApp extends ConsumerStatefulWidget {
  const DriftTennisApp({super.key});

  @override
  ConsumerState<DriftTennisApp> createState() => _DriftTennisAppState();
}

class _DriftTennisAppState extends ConsumerState<DriftTennisApp> {
  @override
  void initState() {
    super.initState();
    // After the first frame so the router is built and can be navigated.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      PushMessageHandler(ref, ref.read(appRouterProvider)).start();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);

    final app = MaterialApp.router(
      title: 'Drift Tennis',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: router,
    );

    // Clarity records by wrapping the tree, so it has to sit above the app
    // rather than being started in `main`. Without a project id the wrapper is
    // not introduced at all — an unconfigured build renders exactly the tree it
    // rendered before analytics existed.
    if (!clarityEnabled) return app;

    return ClarityWidget(
      app: app,
      clarityConfig: ClarityConfig(projectId: clarityProjectId),
    );
  }
}
