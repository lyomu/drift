import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';

/// Forgot Password — `foundation/04-screen-inventory.md` A.1.
///
/// The endpoint behind this is deliberately non-enumerating, so the screen
/// must be too: entering an address with no account has to look exactly like
/// entering one that has. We always continue to Reset Password rather than
/// reporting "no account found".
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    final email = _emailController.text.trim();

    try {
      await ref
          .read(authControllerProvider.notifier)
          .forgotPassword(email: email);
      if (!mounted) return;
      context.push('/reset-password', extra: email);
    } on AuthException catch (e) {
      // Only reachable for a malformed address — the API doesn't fail on an
      // unknown one.
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Forgot Password'),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Enter the email address on your account and we’ll send a '
                      'six-digit code you can use to set a new password.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: DriftSpacing.s6),
                    DriftTextField(
                      label: 'Email',
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                    ),
                    if (_errorText != null) ...[
                      const SizedBox(height: DriftSpacing.s3),
                      Text(_errorText!, style: TextStyle(color: colors.error)),
                    ],
                    const SizedBox(height: DriftSpacing.s6),
                    DriftButton(
                      label: _isSubmitting ? 'Sending…' : 'Send Code',
                      onPressed: _isSubmitting ? null : _submit,
                    ),
                    const SizedBox(height: DriftSpacing.s2),
                    Center(
                      child: DriftButton(
                        label: 'Back to Log In',
                        variant: DriftButtonVariant.text,
                        onPressed: () => context.pop(),
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
