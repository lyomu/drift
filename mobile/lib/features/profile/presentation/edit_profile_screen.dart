import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
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

/// Edit Profile — `foundation/04-screen-inventory.md` §A.10. Name, bio,
/// playing hand, and the profile photo (uploaded through
/// `POST /users/me/photo`, added in the 2026-09 redesign).
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

    return DriftScaffold(
      title: 'Edit Profile',
      body: _EditForm(
        user: userValue,
        dominantHand: ownProfileValue.dominantHand,
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
          const Center(child: _PhotoField()),
          const SizedBox(height: DriftSpacing.s6),
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

/// Tap-to-change profile photo.
///
/// Picking is capped at 1024px / 85% quality on the way out: the upload
/// endpoint rejects anything over 5MB, and a modern phone camera clears that
/// on its own. Falls back to initials via [DriftPlayerAvatar] when no photo
/// has been set, and offers removal only when there is one.
class _PhotoField extends ConsumerStatefulWidget {
  const _PhotoField();

  @override
  ConsumerState<_PhotoField> createState() => _PhotoFieldState();
}

class _PhotoFieldState extends ConsumerState<_PhotoField> {
  bool _isBusy = false;
  String? _errorText;

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _isBusy = true;
      _errorText = null;
    });
    try {
      await action();
      // Both the avatar here and every other place the photo shows (app
      // header, drawer, own profile) read these two.
      ref.invalidate(currentUserProvider);
      ref.invalidate(ownProfileProvider);
    } on AuthException catch (e) {
      if (mounted) setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _pick() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (picked == null) return;
    await _run(
      () => ref.read(usersRepositoryProvider).uploadPhoto(picked.path),
    );
  }

  Future<void> _remove() =>
      _run(() => ref.read(usersRepositoryProvider).deletePhoto());

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final ownProfile = ref.watch(ownProfileProvider);
    final hasPhoto =
        ref.watch(currentUserProvider).valueOrNull?.photoUrl?.isNotEmpty ??
        false;

    return Column(
      children: [
        Stack(
          children: [
            switch (ownProfile) {
              AsyncData(:final value) => DriftPlayerAvatar(
                player: value.summary,
                radius: 44,
              ),
              _ => CircleAvatar(
                radius: 44,
                backgroundColor: colors.primaryLight,
              ),
            },
            Positioned(
              right: 0,
              bottom: 0,
              child: Material(
                color: colors.primary,
                shape: CircleBorder(
                  side: BorderSide(color: colors.background, width: 2),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: _isBusy ? null : _pick,
                  child: SizedBox(
                    width: 30,
                    height: 30,
                    child: _isBusy
                        ? const Padding(
                            padding: EdgeInsets.all(7),
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(
                            Icons.photo_camera_outlined,
                            size: 16,
                            color: Colors.white,
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: DriftSpacing.s2),
        DriftButton(
          label: hasPhoto ? 'Remove photo' : 'Add a photo',
          variant: DriftButtonVariant.text,
          foregroundColor: hasPhoto ? colors.error : null,
          onPressed: _isBusy ? null : (hasPhoto ? _remove : _pick),
        ),
        if (_errorText != null)
          Text(_errorText!, style: TextStyle(color: colors.error)),
      ],
    );
  }
}
