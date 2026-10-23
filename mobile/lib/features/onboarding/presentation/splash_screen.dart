import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/onboarding/onboarding_step_route.dart';
import '../../users/data/users_repository.dart';

/// Brand moment + session check (`foundation/04-screen-inventory.md` A.1) —
/// resumes onboarding at exactly the step `GET /users/me` reports, or lands
/// on Home if it's already `COMPLETE`. Temporary network errors keep the
/// stored session and offer a retry; only a confirmed invalid refresh token
/// sends the user back to sign-in.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  bool _connectionError = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _resume());
  }

  /// Dev-only: `--dart-define=DRIFT_DEV_ACCESS=… --dart-define=DRIFT_DEV_REFRESH=…`
  /// seeds a session so a redesign screen can be QA'd without hand-driving the
  /// whole onboarding flow. Empty in every real build.
  static const _devAccess = String.fromEnvironment('DRIFT_DEV_ACCESS');
  static const _devRefresh = String.fromEnvironment('DRIFT_DEV_REFRESH');

  Future<void> _resume() async {
    final storage = ref.read(secureStorageProvider);
    if (mounted) setState(() => _connectionError = false);

    if (_devAccess.isNotEmpty && _devRefresh.isNotEmpty) {
      await storage.saveTokens(
        accessToken: _devAccess,
        refreshToken: _devRefresh,
      );
    }
    if (const bool.fromEnvironment('DRIFT_FORCE_HOME')) {
      if (mounted) context.go('/home');
      return;
    }
    final token = await storage.readAccessToken();

    if (!mounted) return;

    if (token == null) {
      context.go('/intro');
      return;
    }

    try {
      final user = await ref.read(usersRepositoryProvider).getMe();
      if (!mounted) return;
      goToOnboardingStep(
        context,
        user.onboardingStep,
        email: user.email,
        replace: true,
      );
    } catch (_) {
      if (!mounted) return;
      // The network, server, or profile endpoint may be temporarily down.
      // The Dio session manager clears credentials only after the refresh
      // endpoint confirms they are invalid.
      if (await storage.readRefreshToken() == null) {
        if (mounted) context.go('/login');
      } else if (mounted) {
        setState(() => _connectionError = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // White rather than the theme background: the mark is drawn for a light
    // surface (a black shape sits on it) and doesn't hold up on colors.primary
    // or a dark background.
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 240,
              height: 240,
              child: Image(
                image: AssetImage('assets/images/branding/drift_logo.png'),
                fit: BoxFit.contain,
              ),
            ),
            if (_connectionError) ...[
              const SizedBox(height: 24),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'Could not connect. Your session is still saved.',
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 12),
              TextButton(onPressed: _resume, child: const Text('Try again')),
            ],
          ],
        ),
      ),
    );
  }
}
