import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/application/current_user_provider.dart';
import '../../users/data/users_repository.dart';
import '../application/profile_providers.dart';

const _dominantHands = [
  ('LEFT', 'Left'),
  ('RIGHT', 'Right'),
  ('AMBIDEXTROUS', 'Ambidextrous'),
];

/// Edit Profile — `foundation/04-screen-inventory.md` §A.10. No photo field
/// — no upload flow exists anywhere in this app (same gap Basic Profile
/// documented in onboarding).
class EditProfileScreen extends ConsumerWidget {
  const EditProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final ownProfile = ref.watch(ownProfileProvider);

    if (user.hasError || ownProfile.hasError) {
      return const Center(child: Text("Couldn't load your profile."));
    }
    final userValue = user.valueOrNull;
    final ownProfileValue = ownProfile.valueOrNull;
    if (userValue == null || ownProfileValue == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Edit Profile')),
      body: SafeArea(
        child: _EditForm(
          user: userValue,
          dominantHand: ownProfileValue.dominantHand,
        ),
      ),
    );
  }
}

class _EditForm extends ConsumerStatefulWidget {
  const _EditForm({required this.user, required this.dominantHand});

  final UserProfile user;
  final String? dominantHand;

  @override
  ConsumerState<_EditForm> createState() => _EditFormState();
}

class _EditFormState extends ConsumerState<_EditForm> {
  late final _firstNameController = TextEditingController(
    text: widget.user.firstName ?? '',
  );
  late final _lastNameController = TextEditingController(
    text: widget.user.lastName ?? '',
  );
  late final _bioController = TextEditingController(
    text: widget.user.bio ?? '',
  );
  late String? _dominantHand = widget.dominantHand;
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      await ref
          .read(usersRepositoryProvider)
          .updateProfile(
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            dominantHand: _dominantHand,
            bio: _bioController.text.trim(),
          );
      ref.invalidate(currentUserProvider);
      ref.invalidate(ownProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
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
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftTextField(label: 'First name', controller: _firstNameController),
          const SizedBox(height: DriftSpacing.s4),
          DriftTextField(label: 'Last name', controller: _lastNameController),
          const SizedBox(height: DriftSpacing.s4),
          DriftTextField(
            label: 'Bio',
            controller: _bioController,
            maxLines: 4,
            hintText: 'Tell other players a bit about yourself',
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
            label: _isSubmitting ? 'Saving…' : 'Save',
            onPressed: _isSubmitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}
