import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_community_card.dart';
import '../../auth/data/auth_repository.dart';
import '../application/communities_providers.dart';
import '../data/communities_repository.dart';

/// "Start a community" — what it is (Social / Training / Ladder), name,
/// city, how often, about, who can join and an optional photo. A new
/// community goes to Drift for review; the sheet closes onto its page,
/// which shows "Under review" until a platform admin approves it.
Future<void> showCreateCommunitySheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    builder: (_) => const _CreateCommunitySheet(),
  );
}

class _CreateCommunitySheet extends ConsumerStatefulWidget {
  const _CreateCommunitySheet();

  @override
  ConsumerState<_CreateCommunitySheet> createState() =>
      _CreateCommunitySheetState();
}

class _CreateCommunitySheetState extends ConsumerState<_CreateCommunitySheet> {
  CommunityType _type = CommunityType.social;
  CommunityFrequency _frequency = CommunityFrequency.weekly;
  CommunityJoinPolicy _joinPolicy = CommunityJoinPolicy.open;
  final _name = TextEditingController();
  final _city = TextEditingController();
  final _about = TextEditingController();
  XFile? _photo;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // "Nairobi, Nairobi County" → "Nairobi". Only a prefill; editable.
    final label = ref.read(communityViewerLocationProvider).valueOrNull?.label;
    if (label != null) _city.text = label.split(',').first.trim();
  }

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    _about.dispose();
    super.dispose();
  }

  bool get _valid =>
      _name.text.trim().length >= 2 && _city.text.trim().length >= 2;

  Future<void> _pickPhoto() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (picked != null) setState(() => _photo = picked);
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    final repo = ref.read(communitiesRepositoryProvider);
    final router = GoRouter.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final submitted = context.l10n.communitySubmitted;
    try {
      var community = await repo.create(
        type: _type,
        name: _name.text.trim(),
        city: _city.text.trim(),
        frequency: _frequency,
        about: _about.text,
        joinPolicy: _joinPolicy,
      );
      if (_photo != null) {
        // The community exists either way; a failed photo is not a failed
        // create, and the photo can be added from Manage.
        try {
          community = await repo.uploadPhoto(community.id, _photo!.path);
        } on AuthException catch (_) {}
      }
      ref.invalidate(myCommunitiesProvider);
      navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(submitted)));
      router.push('/communities/${community.id}');
    } on AuthException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final l10n = context.l10n;
    // Placeholders sit well back from typed text so an example never reads
    // as a value that's already filled in.
    final hintStyle = TextStyle(
      color: colors.textSecondary.withValues(alpha: 0.45),
    );

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: Text(l10n.communityStart, style: type.h3)),
                IconButton.filledTonal(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                  tooltip: l10n.commonClose,
                ),
              ],
            ),
            const SizedBox(height: 16),
            _Field(
              label: l10n.communityWhatItIs,
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final (i, option)
                        in CommunityType.creatable.indexed) ...[
                      if (i > 0) const SizedBox(width: 8),
                      Expanded(
                        child: _TypeTile(
                          icon: communityTypeIcon(option),
                          title: option.label,
                          hint: _typeHint(l10n, option),
                          selected: _type == option,
                          onTap: () => setState(() => _type = option),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            _Field(
              label: l10n.communityFormNameLabel,
              child: TextField(
                controller: _name,
                maxLength: 60,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: l10n.communityNameHint,
                  hintStyle: hintStyle,
                  counterText: '',
                ),
              ),
            ),
            _Field(
              label: l10n.communityFormCityLabel,
              child: TextField(
                controller: _city,
                maxLength: 80,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: l10n.communityFormCityHint,
                  hintStyle: hintStyle,
                  counterText: '',
                ),
              ),
            ),
            _Field(
              label: l10n.communityFormFrequencyLabel,
              child: CommunityFrequencyPicker(
                value: _frequency,
                onChanged: (value) => setState(() => _frequency = value),
              ),
            ),
            _Field(
              label: l10n.communityFormAboutLabel,
              optional: true,
              child: TextField(
                controller: _about,
                maxLines: 3,
                maxLength: 1000,
                decoration: InputDecoration(
                  hintText: l10n.communityAboutHint,
                  hintStyle: hintStyle,
                  counterText: '',
                ),
              ),
            ),
            _Field(
              label: l10n.communityFormJoinLabel,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CommunityOptionCard(
                    icon: Icons.public_rounded,
                    title: l10n.communityFormJoinOpen,
                    subtitle: l10n.communityFormJoinOpenHint,
                    selected: _joinPolicy == CommunityJoinPolicy.open,
                    onTap: () =>
                        setState(() => _joinPolicy = CommunityJoinPolicy.open),
                  ),
                  const SizedBox(height: 8),
                  CommunityOptionCard(
                    icon: Icons.lock_outline_rounded,
                    title: l10n.communityFormJoinRequest,
                    subtitle: l10n.communityFormJoinRequestHint,
                    selected: _joinPolicy == CommunityJoinPolicy.byRequest,
                    onTap: () => setState(
                      () => _joinPolicy = CommunityJoinPolicy.byRequest,
                    ),
                  ),
                ],
              ),
            ),
            OutlinedButton.icon(
              onPressed: _submitting ? null : _pickPhoto,
              icon: Icon(
                _photo == null
                    ? Icons.add_photo_alternate_outlined
                    : Icons.check_circle_outline_rounded,
              ),
              label: Text(
                _photo == null
                    ? l10n.communityAddPhotoOptional
                    : l10n.communityPhotoChosen,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              l10n.communityReviewNote,
              style: type.caption.copyWith(color: colors.textSecondary),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: type.bodySmall.copyWith(color: colors.error),
              ),
            ],
            const SizedBox(height: 16),
            DriftPrimaryButton(
              label: l10n.communityCreate,
              loading: _submitting,
              onPressed: _valid && !_submitting ? _submit : null,
            ),
          ],
        ),
      ),
    );
  }

  static String _typeHint(AppLocalizations l10n, CommunityType type) =>
      switch (type) {
        CommunityType.social => l10n.communityTypeSocialHint,
        CommunityType.training => l10n.communityTypeTrainingHint,
        CommunityType.ladder => l10n.communityTypeLadderHint,
        CommunityType.club => l10n.communityTypeClubHint,
      };
}

/// One labelled block of the form: a sentence-case question above its
/// input, with an "Optional" pill when the block can be skipped.
class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.child,
    this.optional = false,
  });

  final String label;
  final Widget child;
  final bool optional;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Flexible(
                child: Text(
                  label,
                  style: type.title.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              if (optional) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: colors.surfaceRaised,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: colors.border),
                  ),
                  child: Text(
                    context.l10n.communityFormOptional,
                    style: type.caption.copyWith(color: colors.textSecondary),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

/// Filled circle with a ✓, shown on whichever option is chosen.
class _CheckBadge extends StatelessWidget {
  const _CheckBadge({this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: colors.primary, shape: BoxShape.circle),
      child: Icon(
        Icons.check_rounded,
        size: size * 0.68,
        color: Theme.of(context).colorScheme.onPrimary,
      ),
    );
  }
}

/// Selected / unselected surface shared by the type tiles and option cards:
/// a soft primary tint and border when chosen, a plain raised card when not.
BoxDecoration _optionDecoration(DriftColors colors, bool selected) =>
    BoxDecoration(
      color: selected
          ? Color.alphaBlend(
              colors.primary.withValues(alpha: 0.12),
              colors.surfaceRaised,
            )
          : colors.surfaceRaised,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: selected ? colors.primary : colors.border,
        width: selected ? 1.5 : 1,
      ),
    );

/// Rounded-square icon holder for option cards and type tiles.
class _OptionIcon extends StatelessWidget {
  const _OptionIcon({required this.icon, required this.selected});

  final IconData icon;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: selected
            ? colors.primary.withValues(alpha: 0.18)
            : colors.background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        icon,
        size: 20,
        color: selected ? colors.primary : colors.textSecondary,
      ),
    );
  }
}

/// One of the side-by-side "What kind of community" choices.
class _TypeTile extends StatelessWidget {
  const _TypeTile({
    required this.icon,
    required this.title,
    required this.hint,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String hint;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            decoration: _optionDecoration(colors, selected),
            padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _OptionIcon(icon: icon, selected: selected),
                    const Spacer(),
                    if (selected) const _CheckBadge(size: 20),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  hint,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A selectable full-width card with an icon, two lines of text and a ✓
/// badge when chosen. "Who can join" in the create sheet, reused by Manage.
class CommunityOptionCard extends StatelessWidget {
  const CommunityOptionCard({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            padding: const EdgeInsets.all(14),
            decoration: _optionDecoration(colors, selected),
            child: Row(
              children: [
                _OptionIcon(icon: icon, selected: selected),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: type.title.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: type.bodySmall.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Keep the row's width stable whether or not it's chosen.
                SizedBox(
                  width: 22,
                  child: selected ? const _CheckBadge() : null,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Weekly / Every two weeks / Monthly / Other, as wrapping pill chips so
/// every label shows in full.
class CommunityFrequencyPicker extends StatelessWidget {
  const CommunityFrequencyPicker({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final CommunityFrequency value;
  final ValueChanged<CommunityFrequency> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final f in CommunityFrequency.values)
          ChoiceChip(
            label: Text(f.label),
            selected: value == f,
            onSelected: (_) => onChanged(f),
            showCheckmark: true,
            checkmarkColor: colors.primary,
            shape: const StadiumBorder(),
            side: BorderSide(
              color: value == f ? colors.primary : colors.border,
              width: value == f ? 1.5 : 1,
            ),
            backgroundColor: colors.surfaceRaised,
            selectedColor: Color.alphaBlend(
              colors.primary.withValues(alpha: 0.12),
              colors.surfaceRaised,
            ),
            labelStyle: TextStyle(
              fontWeight: value == f ? FontWeight.w700 : FontWeight.w500,
              color: value == f ? colors.primary : colors.textPrimary,
            ),
          ),
      ],
    );
  }
}
