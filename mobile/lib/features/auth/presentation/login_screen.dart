import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../users/data/users_repository.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';

/// Login — `foundation/04-screen-inventory.md` A.1.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .login(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
      final user = await ref.read(usersRepositoryProvider).getMe();
      if (!mounted) return;
      goToOnboardingStep(context, user.onboardingStep, email: user.email);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Log In')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DriftTextField(
                label: 'Email',
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: 'Password',
                controller: _passwordController,
                obscureText: true,
              ),
              Align(
                alignment: Alignment.centerRight,
                child: DriftButton(
                  label: 'Forgot password?',
                  variant: DriftButtonVariant.text,
                  onPressed: () => context.push('/forgot-password'),
                ),
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(
                label: _isSubmitting ? 'Logging in…' : 'Log In',
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: DriftButton(
                  label: "Don't have an account? Sign Up",
                  variant: DriftButtonVariant.text,
                  onPressed: () => context.push('/sign-up'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
