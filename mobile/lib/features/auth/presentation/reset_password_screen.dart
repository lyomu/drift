import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';

const _resendCooldown = Duration(seconds: 60);

/// Reset Password — `foundation/04-screen-inventory.md` A.1.
///
/// Takes the code from Forgot Password together with the new password in one
/// step; a separate "verify code" screen would have to consume the code
/// without setting a password. On success every session is already revoked
/// server-side, so this routes to Login rather than into the app.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, required this.email});

  final String email;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isSubmitting = false;
  bool _isResending = false;
  String? _errorText;
  Timer? _cooldownTimer;
  int _cooldownSeconds = 0;

  @override
  void initState() {
    super.initState();
    // A code was just sent on the way in, so the resend button starts cold.
    _startCooldown();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _cooldownSeconds = _resendCooldown.inSeconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_cooldownSeconds <= 1) {
        timer.cancel();
        setState(() => _cooldownSeconds = 0);
      } else {
        setState(() => _cooldownSeconds -= 1);
      }
    });
  }

  Future<void> _submit() async {
    if (_passwordController.text != _confirmController.text) {
      setState(() => _errorText = 'Those passwords don’t match.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .resetPassword(
            email: widget.email,
            code: _codeController.text.trim(),
            newPassword: _passwordController.text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Password updated. Log in with your new password.'),
        ),
      );
      context.go('/login');
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _resend() async {
    setState(() {
      _isResending = true;
      _errorText = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .forgotPassword(email: widget.email);
      _startCooldown();
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final canResend = _cooldownSeconds == 0 && !_isResending;

    return Scaffold(
      appBar: AppBar(title: const Text('Reset Password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'If an account exists for ${widget.email}, a six-digit code '
                'is on its way. Enter it below with your new password.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: DriftSpacing.s6),
              DriftTextField(
                label: 'Six-digit code',
                controller: _codeController,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: 'New password',
                controller: _passwordController,
                obscureText: true,
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: 'Confirm new password',
                controller: _confirmController,
                obscureText: true,
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(
                label: _isSubmitting ? 'Updating…' : 'Set New Password',
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: DriftButton(
                  label: _cooldownSeconds > 0
                      ? 'Resend code in ${_cooldownSeconds}s'
                      : 'Resend code',
                  variant: DriftButtonVariant.text,
                  onPressed: canResend ? _resend : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
