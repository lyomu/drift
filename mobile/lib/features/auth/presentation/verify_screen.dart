import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../users/data/users_repository.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';

const _resendCooldown = Duration(seconds: 60);

/// Verify (OTP/Email) — `foundation/04-screen-inventory.md` A.1. Matches
/// the code entered against the account created on Sign Up.
class VerifyScreen extends ConsumerStatefulWidget {
  const VerifyScreen({super.key, required this.email});

  final String email;

  @override
  ConsumerState<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends ConsumerState<VerifyScreen> {
  final _codeController = TextEditingController();
  bool _isSubmitting = false;
  bool _isResending = false;
  String? _errorText;
  Timer? _cooldownTimer;
  int _cooldownSeconds = 0;

  @override
  void dispose() {
    _codeController.dispose();
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
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      await ref
          .read(authControllerProvider.notifier)
          .verify(email: widget.email, code: _codeController.text.trim());
      final user = await ref.read(usersRepositoryProvider).getMe();
      if (!mounted) return;
      goToOnboardingStep(context, user.onboardingStep, email: user.email);
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
          .resendCode(email: widget.email);
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
    final canResend = !_isResending && _cooldownSeconds == 0;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Verify'),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Enter the 6-digit code we sent to ${widget.email}.'),
                    const SizedBox(height: DriftSpacing.s4),
                    DriftTextField(
                      label: 'Code',
                      controller: _codeController,
                      keyboardType: TextInputType.number,
                    ),
                    if (_errorText != null) ...[
                      const SizedBox(height: DriftSpacing.s3),
                      Text(_errorText!, style: TextStyle(color: colors.error)),
                    ],
                    const SizedBox(height: DriftSpacing.s6),
                    DriftButton(
                      label: _isSubmitting ? 'Verifying…' : 'Verify',
                      onPressed: _isSubmitting ? null : _submit,
                    ),
                    const SizedBox(height: DriftSpacing.s2),
                    Center(
                      child: DriftButton(
                        label: canResend
                            ? 'Resend code'
                            : _isResending
                            ? 'Sending…'
                            : 'Resend in ${_cooldownSeconds}s',
                        variant: DriftButtonVariant.text,
                        onPressed: canResend ? _resend : null,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
