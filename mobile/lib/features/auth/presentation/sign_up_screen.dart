import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';
import 'widgets/auth_form_widgets.dart';
import 'widgets/auth_page_scaffold.dart';

/// Sign Up — `foundation/04-screen-inventory.md` A.1 (redesign 2026-08).
/// Email-only for this checkpoint; phone signup is deferred until a real SMS
/// provider exists.
class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSubmitting = false;
  bool _obscure = true;
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
      final email = _emailController.text.trim();
      await ref
          .read(authControllerProvider.notifier)
          .signUp(email: email, password: _passwordController.text);
      if (!mounted) return;
      context.push('/verify', extra: email);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _notYet(String provider) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text('$provider sign-in isn\'t available yet.')),
      );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return AuthPageScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 32),
          Text(
            'Create account',
            textAlign: TextAlign.center,
            style: type.h1.copyWith(fontSize: 30),
          ),
          const SizedBox(height: 32),
          AuthInputField(
            controller: _emailController,
            hintText: 'Email',
            icon: Icons.mail_outline,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 12),
          AuthInputField(
            controller: _passwordController,
            hintText: 'Password',
            icon: Icons.lock_outline,
            obscureText: _obscure,
            onSubmitted: (_) => _isSubmitting ? null : _submit(),
            trailing: GestureDetector(
              onTap: () => setState(() => _obscure = !_obscure),
              child: Icon(
                _obscure
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                size: 20,
                color: colors.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Text(
              'Use at least 8 characters.',
              style: type.caption.copyWith(color: colors.textSecondary),
            ),
          ),
          if (_errorText != null) ...[
            const SizedBox(height: 12),
            Text(
              _errorText!,
              textAlign: TextAlign.center,
              style: type.body.copyWith(color: colors.error),
            ),
          ],
          const SizedBox(height: 22),
          AuthPrimaryButton(
            label: 'Create account',
            loading: _isSubmitting,
            onPressed: _isSubmitting ? null : _submit,
          ),
          const SizedBox(height: 18),
          AuthSocialButton(
            label: 'Continue with Google',
            icon: const GoogleGlyph(),
            onPressed: () => _notYet('Google'),
          ),
          const SizedBox(height: 10),
          AuthSocialButton(
            label: 'Continue with Apple',
            icon: const Icon(Icons.apple, size: 20, color: Color(0xFF1A1A1A)),
            onPressed: () => _notYet('Apple'),
          ),
          const SizedBox(height: 24),
          AuthFooterPrompt(
            lead: 'Already have an account? ',
            action: 'Log in',
            onTap: () => context.push('/login'),
          ),
        ],
      ),
    );
  }
}
