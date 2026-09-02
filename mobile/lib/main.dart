import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

    return MaterialApp.router(
      title: 'Drift Tennis',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      routerConfig: router,
    );
  }
}
