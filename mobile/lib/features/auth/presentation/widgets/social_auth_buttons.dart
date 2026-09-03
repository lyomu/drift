import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/onboarding/onboarding_step_route.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../users/data/users_repository.dart';
import '../../application/auth_controller.dart';
import '../../data/auth_repository.dart';
import '../../data/social_auth_service.dart';
import 'auth_form_widgets.dart';

/// The Google and Apple buttons plus the entire sign-in flow behind them.
///
/// This is one widget rather than a helper called from each screen because
/// Welcome, Login and Sign-up all need the identical behaviour — including
/// the account-linking prompt — and three copies of it would drift apart.
/// Screens stay stateless; the busy and error state lives here.
class SocialAuthButtons extends ConsumerStatefulWidget {
  const SocialAuthButtons({
    super.key,
    this.enabled = true,
    this.acceptedAgePolicy = false,
  });

  final bool enabled;
  final bool acceptedAgePolicy;

  @override
  ConsumerState<SocialAuthButtons> createState() => _SocialAuthButtonsState();
}

class _SocialAuthButtonsState extends ConsumerState<SocialAuthButtons> {
  SocialProvider? _busy;
  String? _error;

  Future<void> _start(SocialProvider provider) async {
    setState(() {
      _busy = provider;
      _error = null;
    });

    try {
      final controller = ref.read(authControllerProvider.notifier);
      final credential = await controller.acquireSocialCredential(provider);

      try {
        await controller.socialSignIn(
          credential,
          acceptedAgePolicy: widget.acceptedAgePolicy,
        );
      } on EmailLinkRequiredException catch (e) {
        // The address already has a password account that couldn't be
        // auto-linked. Prefer the server's address over the credential's:
        // Apple withholds the email after the first authorization.
        final email = e.email ?? credential.email;
        if (email == null) {
          setState(() => _error = e.message);
          return;
        }
        if (!mounted) return;
        // Stop the spinner while the dialog waits on a person — nothing is
        // in flight, and a button that spins behind a modal reads as a hang.
        setState(() => _busy = null);
        final password = await _askForPassword(email);
        if (password == null) return; // dismissed — no error, no session
        if (!mounted) return;
        setState(() => _busy = provider);
        await controller.linkWithPassword(
          credential: credential,
          email: email,
          password: password,
        );
      }

      await _routeIntoApp();
    } on SocialSignInCancelled {
      // Deliberate back-out. Saying "sign-in failed" here is the single most
      // common way this flow feels broken, so say nothing at all.
    } on SocialSignInUnavailable catch (e) {
      setState(() => _error = e.message);
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  /// A fresh social user has no tennis profile, so they must land in
  /// onboarding at `BASIC_PROFILE` rather than on an empty home feed. The
  /// server decides the step; this just follows it.
  Future<void> _routeIntoApp() async {
    final user = await ref.read(usersRepositoryProvider).getMe();
    if (!mounted) return;
    goToOnboardingStep(context, user.onboardingStep, email: user.email);
  }

  Future<String?> _askForPassword(String email) {
    return showDialog<String>(
      context: context,
      builder: (context) => _LinkAccountDialog(email: email),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final anyBusy = _busy != null;
    final enabled = widget.enabled && !anyBusy;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AuthSocialButton(
          label: 'Continue with Google',
          icon: const GoogleGlyph(),
          loading: _busy == SocialProvider.google,
          onPressed: enabled ? () => _start(SocialProvider.google) : null,
        ),
        const SizedBox(height: 10),
        AuthSocialButton(
          label: 'Continue with Apple',
          icon: const Icon(Icons.apple, size: 20, color: Color(0xFF1A1A1A)),
          loading: _busy == SocialProvider.apple,
          onPressed: enabled ? () => _start(SocialProvider.apple) : null,
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: type.body.copyWith(color: colors.error),
          ),
        ],
      ],
    );
  }
}

/// Collects the existing account's password so the social identity can be
/// attached to it. The server verifies it — nothing is decided here.
class _LinkAccountDialog extends StatefulWidget {
  const _LinkAccountDialog({required this.email});

  final String email;

  @override
  State<_LinkAccountDialog> createState() => _LinkAccountDialogState();
}

class _LinkAccountDialogState extends State<_LinkAccountDialog> {
  final _controller = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final value = _controller.text;
    if (value.isEmpty) return;
    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return AlertDialog(
      title: const Text('Link your account'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${widget.email} already has a Drift Tennis account. Enter its '
            'password once and the two will be linked — after that you can '
            'use either to sign in.',
            style: type.body,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            obscureText: _obscure,
            autofocus: true,
            onSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: 'Password',
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(onPressed: _submit, child: const Text('Link')),
      ],
    );
  }
}
