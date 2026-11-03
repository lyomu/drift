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
    final label = ref
        .read(communityViewerLocationProvider)
        .valueOrNull
        ?.label;
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
            _SectionLabel(l10n.communityWhatItIs),
            for (final option in CommunityType.creatable) ...[
              CommunityOptionCard(
                icon: communityTypeIcon(option),
                title: option.label,
                subtitle: _typeHint(l10n, option),
                selected: _type == option,
                onTap: () => setState(() => _type = option),
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 8),
            _Field(
              label: l10n.communityName,
              child: TextField(
                controller: _name,
                maxLength: 60,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: l10n.communityNameHint,
                  counterText: '',
                ),
              ),
            ),
            _Field(
              label: l10n.communityCity,
              child: TextField(
                controller: _city,
                maxLength: 80,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: l10n.communityCityHint,
                  counterText: '',
                ),
              ),
            ),
            _SectionLabel(l10n.communityHowOften),
            CommunityFrequencyPicker(
              value: _frequency,
              onChanged: (value) => setState(() => _frequency = value),
            ),
            const SizedBox(height: 16),
            _Field(
              label: l10n.communityAboutOptional,
              child: TextField(
                controller: _about,
                maxLines: 3,
                maxLength: 1000,
                decoration: InputDecoration(
                  hintText: l10n.communityAboutHint,
                  counterText: '',
                ),
              ),
            ),
            _SectionLabel(l10n.communityWhoCanJoin),
            CommunityOptionCard(
              icon: Icons.public_rounded,
              title: l10n.communityJoinAnyone,
              subtitle: l10n.communityJoinAnyoneHint,
              selected: _joinPolicy == CommunityJoinPolicy.open,
              onTap: () =>
                  setState(() => _joinPolicy = CommunityJoinPolicy.open),
            ),
            const SizedBox(height: 10),
            CommunityOptionCard(
              icon: Icons.lock_outline_rounded,
              title: l10n.communityJoinByRequest,
              subtitle: l10n.communityJoinByRequestHint,
              selected: _joinPolicy == CommunityJoinPolicy.byRequest,
              onTap: () =>
                  setState(() => _joinPolicy = CommunityJoinPolicy.byRequest),
            ),
            const SizedBox(height: 16),
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
              Text(_error!, style: type.bodySmall.copyWith(color: colors.error)),
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        text.toUpperCase(),
        style: type.label.copyWith(
          color: colors.textSecondary,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: type.title.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

/// A selectable option card with an icon, two lines of text and a radio —
/// "What it is" and "Who can join" in the create sheet, reused by Manage.
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
        color: colors.surfaceRaised,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: selected ? colors.primary : colors.border,
                width: selected ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: selected ? colors.primaryLight : colors.background,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon,
                    size: 22,
                    color: selected ? colors.primary : colors.textSecondary,
                  ),
                ),
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
                Icon(
                  selected
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_off_rounded,
                  color: selected ? colors.primary : colors.border,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Weekly / Every two weeks / Monthly / Other, as a segmented control.
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
    return SizedBox(
      width: double.infinity,
      child: SegmentedButton<CommunityFrequency>(
        showSelectedIcon: false,
        segments: [
          for (final f in CommunityFrequency.values)
            ButtonSegment(
              value: f,
              label: Text(
                f.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
              ),
            ),
        ],
        selected: {value},
        onSelectionChanged: (selection) => onChanged(selection.first),
      ),
    );
  }
}
