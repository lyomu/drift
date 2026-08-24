import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../users/data/users_repository.dart';

/// Brand moment + session check (`foundation/04-screen-inventory.md` A.1) —
/// resumes onboarding at exactly the step `GET /users/me` reports, or lands
/// on Home if it's already `COMPLETE`. No stored token routes to Welcome; a
/// stored-but-invalid token (expired/revoked) is treated the same way.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _resume());
  }

  Future<void> _resume() async {
    final storage = ref.read(secureStorageProvider);
    final token = await storage.readAccessToken();

    if (!mounted) return;

    if (token == null) {
      context.go('/welcome');
      return;
    }

    try {
      final user = await ref.read(usersRepositoryProvider).getMe();
      if (!mounted) return;
      goToOnboardingStep(context, user.onboardingStep, email: user.email);
    } catch (_) {
      await storage.clear();
      if (!mounted) return;
      context.go('/welcome');
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      backgroundColor: colors.primary,
      body: const Center(
        child: Icon(Icons.sports_tennis_rounded, color: Colors.white, size: 56),
      ),
    );
  }
}
