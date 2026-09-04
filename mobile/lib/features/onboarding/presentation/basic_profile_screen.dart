import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/widgets/phone_field.dart';
import '../../users/application/current_user_provider.dart';
import '../../users/data/users_repository.dart';

const _dominantHands = [
  ('LEFT', 'Left'),
  ('RIGHT', 'Right'),
  ('AMBIDEXTROUS', 'Ambidextrous'),
];

/// Basic Profile — `foundation/04-screen-inventory.md` A.2.
///
/// Every field here is prefilled from `/users/me` when the account already
/// knows it. That matters most for a Google or Apple sign-up: the provider's
/// verified `given_name`/`family_name` are persisted at account creation
/// (`AuthService.socialLogin`), so asking for the name again would be asking
/// for something already on file. Prefilled rather than skipped — the fields
/// stay editable, since the name on a Google account is not always the name
/// someone plays under, and this step is needed for the playing hand
/// regardless.
///
/// An email signup arrives with nothing known, so the fields simply start
/// empty. One code path, no branching on provider.
class BasicProfileScreen extends ConsumerWidget {
  const BasicProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    // The form seeds its controllers once from this value, so it can only be
    // built after the user resolves.
    return DriftScaffold(
      title: 'Basic Profile',
      body: switch (user) {
        AsyncData(:final value) => _BasicProfileForm(user: value),
        AsyncError() => const _LoadFailed(),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

/// The step can't be completed without knowing what is already on file —
/// submitting blind would overwrite a social provider's name with blanks.
class _LoadFailed extends ConsumerWidget {
  const _LoadFailed();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            "Couldn't load your details. Please try again.",
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: DriftSpacing.s4),
          DriftButton(
            label: 'Retry',
            variant: DriftButtonVariant.text,
            onPressed: () => ref.invalidate(currentUserProvider),
          ),
        ],
      ),
    );
  }
}

class _BasicProfileForm extends ConsumerStatefulWidget {
  const _BasicProfileForm({required this.user});

  final UserProfile user;

  @override
  ConsumerState<_BasicProfileForm> createState() => _BasicProfileFormState();
}

class _BasicProfileFormState extends ConsumerState<_BasicProfileForm> {
  late final _firstNameController = TextEditingController(
    text: widget.user.firstName ?? '',
  );
  late final _lastNameController = TextEditingController(
    text: widget.user.lastName ?? '',
  );
  late final _phoneController = TextEditingController(
    text: widget.user.phone ?? '',
  );
  late bool _phoneOnWhatsApp = widget.user.phoneOnWhatsApp;
  String? _dominantHand;
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_dominantHand == null) {
      setState(() => _errorText = 'Choose your playing hand to continue.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateBasicProfile(
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            phone: _phoneController.text.trim(),
            phoneOnWhatsApp: _phoneOnWhatsApp,
            dominantHand: _dominantHand!,
          );
      if (!mounted) return;
      // The names just changed on the server; anything already holding the
      // cached user would otherwise keep the pre-edit copy.
      ref.invalidate(currentUserProvider);
      goToOnboardingStep(context, nextStep);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftTextField(label: 'First name', controller: _firstNameController),
          const SizedBox(height: DriftSpacing.s4),
          DriftTextField(label: 'Last name', controller: _lastNameController),
          const SizedBox(height: DriftSpacing.s4),
          PhoneField(
            controller: _phoneController,
            onWhatsApp: _phoneOnWhatsApp,
            onWhatsAppChanged: (v) => setState(() => _phoneOnWhatsApp = v),
          ),
          const SizedBox(height: DriftSpacing.s6),
          Text('Playing hand', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: DriftSpacing.s2),
          Wrap(
            spacing: DriftSpacing.s2,
            children: _dominantHands
                .map(
                  (hand) => DriftFilterChip(
                    label: hand.$2,
                    selected: _dominantHand == hand.$1,
                    onTap: () => setState(() => _dominantHand = hand.$1),
                  ),
                )
                .toList(),
          ),
          if (_errorText != null) ...[
            const SizedBox(height: DriftSpacing.s3),
            Text(_errorText!, style: TextStyle(color: colors.error)),
          ],
          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: _isSubmitting ? 'Saving…' : 'Continue',
            onPressed: _isSubmitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}
