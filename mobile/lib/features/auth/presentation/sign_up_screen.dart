import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';

/// Sign Up — `foundation/04-screen-inventory.md` A.1. Email-only for this
/// checkpoint; phone signup is deferred until a real SMS provider exists.
class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
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

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Create Account')),
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
                hintText: 'At least 8 characters',
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(
                label: _isSubmitting ? 'Creating account…' : 'Create Account',
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: DriftButton(
                  label: 'Already have an account? Log In',
                  variant: DriftButtonVariant.text,
                  onPressed: () => context.push('/login'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
