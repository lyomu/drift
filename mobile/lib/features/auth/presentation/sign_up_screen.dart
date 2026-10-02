import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../application/auth_controller.dart';
import '../data/auth_repository.dart';
import 'widgets/auth_form_widgets.dart';
import 'widgets/auth_page_scaffold.dart';
import 'widgets/phone_field.dart';
import 'widgets/social_auth_buttons.dart';

/// Sign Up — `foundation/04-screen-inventory.md` A.1 (redesign 2026-08).
///
/// Email is the credential. Name is collected here too, so Basic Profile
/// (which already prefills a Google/Apple name from `/users/me`) doesn't have
/// to ask an email sign-up to retype something just given. A phone number is
/// also collected, but purely as a contact detail — optional, and stored
/// unverified, since signing *up* by phone still waits on a real SMS
/// provider.
class SignUpScreen extends ConsumerStatefulWidget {
  const SignUpScreen({super.key});

  @override
  ConsumerState<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends ConsumerState<SignUpScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _phoneOnWhatsApp = false;
  bool _isSubmitting = false;
  bool _obscure = true;
  bool _acceptedAgePolicy = false;
  String? _errorText;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
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
          .signUp(
            email: email,
            password: _passwordController.text,
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            acceptedAgePolicy: _acceptedAgePolicy,
            phone: _phoneController.text.trim(),
            phoneOnWhatsApp: _phoneOnWhatsApp,
          );
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
          Row(
            children: [
              Expanded(
                child: AuthInputField(
                  controller: _firstNameController,
                  hintText: 'First name',
                  icon: Icons.person_outline,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AuthInputField(
                  controller: _lastNameController,
                  hintText: 'Last name',
                  icon: Icons.person_outline,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
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
              'Use 8 to 72 characters.',
              style: type.caption.copyWith(color: colors.textSecondary),
            ),
          ),
          const SizedBox(height: 12),
          PhoneField(
            controller: _phoneController,
            variant: PhoneFieldVariant.auth,
            onWhatsApp: _phoneOnWhatsApp,
            onWhatsAppChanged: (v) => setState(() => _phoneOnWhatsApp = v),
          ),
          const SizedBox(height: 4),
          AgePolicyAcceptance(
            value: _acceptedAgePolicy,
            onChanged: (value) => setState(() => _acceptedAgePolicy = value),
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
            onPressed: _isSubmitting || !_acceptedAgePolicy ? null : _submit,
          ),
          const SizedBox(height: 18),
          SocialAuthButtons(
            enabled: _acceptedAgePolicy,
            acceptedAgePolicy: _acceptedAgePolicy,
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
