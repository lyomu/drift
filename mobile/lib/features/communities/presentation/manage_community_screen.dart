import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_community_card.dart';
import '../../../shared/widgets/drift_error_retry.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/application/current_user_provider.dart';
import '../application/communities_providers.dart';
import '../data/communities_repository.dart';
import 'community_member_tile.dart';
import 'create_community_sheet.dart';

final _disputesProvider = FutureProvider.autoDispose
    .family<List<CommunityDispute>, String>((ref, id) {
      return ref.watch(communitiesRepositoryProvider).disputes(id);
    });

/// Manage community — the owner's and admins' WhatsApp-style group settings:
/// details and photo, who can join, join requests, members and admins,
/// new ladders and leagues, disputed league results, and (owner only)
/// handing over ownership or deleting the community.
class ManageCommunityScreen extends ConsumerWidget {
  const ManageCommunityScreen({
    super.key,
    required this.communityId,
    this.openLadderSheet = false,
  });

  final String communityId;

  /// `?create=ladder` from the Competitions tab's "New ladder" button.
  final bool openLadderSheet;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final detail = ref.watch(communityDetailProvider(communityId));
    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Column(
          children: [
            DriftBackHeader(title: context.l10n.communityManage),
            Expanded(
              child: switch (detail) {
                AsyncData(:final value) => _ManageBody(
                  community: value,
                  openLadderSheet: openLadderSheet,
                ),
                AsyncError() => DriftErrorRetry(
                  message: context.l10n.communityLoadOneFailed,
                  onRetry: () =>
                      ref.invalidate(communityDetailProvider(communityId)),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ManageBody extends ConsumerStatefulWidget {
  const _ManageBody({required this.community, required this.openLadderSheet});

  final Community community;
  final bool openLadderSheet;

  @override
  ConsumerState<_ManageBody> createState() => _ManageBodyState();
}

class _ManageBodyState extends ConsumerState<_ManageBody> {
  late final _name = TextEditingController(text: widget.community.name);
  late final _city = TextEditingController(text: widget.community.city);
  late final _about = TextEditingController(text: widget.community.about ?? '');
  late CommunityFrequency _frequency = widget.community.frequency;
  late CommunityJoinPolicy _joinPolicy = widget.community.joinPolicy;
  bool _busy = false;

  Community get c => widget.community;
  bool get _isOwner => c.myMembership?.isOwner ?? false;
  bool get _approved => c.status == CommunityStatus.approved;

  @override
  void initState() {
    super.initState();
    if (widget.openLadderSheet && _approved) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _newLadder());
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _city.dispose();
    _about.dispose();
    super.dispose();
  }

  Future<bool> _run(Future<void> Function() action, {String? done}) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
      invalidateCommunity(ref, c.id);
      if (done != null) messenger.showSnackBar(SnackBar(content: Text(done)));
      return true;
    } on AuthException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save() => _run(
    () => ref
        .read(communitiesRepositoryProvider)
        .update(
          c.id,
          name: _name.text.trim(),
          city: _city.text.trim(),
          frequency: _frequency,
          about: _about.text.trim(),
          joinPolicy: _joinPolicy,
        ),
    done: context.l10n.communitySaved,
  );

  Future<void> _changePhoto() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 85,
    );
    if (picked == null) return;
    await _run(
      () => ref.read(communitiesRepositoryProvider).uploadPhoto(c.id, picked.path),
    );
  }

  Future<bool> _confirm(String title, String body, String action) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(context.l10n.commonCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(action),
          ),
        ],
      ),
    );
    return ok == true;
  }

  Future<void> _newLadder() async {
    final l10n = context.l10n;
    final result = await showDialog<(String, int)>(
      context: context,
      builder: (_) => const _NewLadderDialog(),
    );
    if (result == null) return;
    await _run(
      () => ref
          .read(communitiesRepositoryProvider)
          .createLadder(c.id, name: result.$1, challengeRange: result.$2),
      done: l10n.communityLadderCreated,
    );
  }

  Future<void> _delete() async {
    final l10n = context.l10n;
    if (!await _confirm(
      l10n.communityDeleteTitle(c.name),
      l10n.communityDeleteBody,
      l10n.communityDelete,
    )) {
      return;
    }
    if (!mounted) return;
    final router = GoRouter.of(context);
    final ok = await _run(
      () => ref.read(communitiesRepositoryProvider).delete(c.id),
      done: l10n.communityDeleted,
    );
    if (ok) router.go('/home?tab=community');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final members = ref.watch(communityMembersProvider(c.id));
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        // ---------------------------------------------------------- details
        _SectionTitle(l10n.communityDetails),
        DriftSoftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  DriftCommunityAvatar(community: c, size: 56),
                  const SizedBox(width: 12),
                  TextButton.icon(
                    onPressed: _busy ? null : _changePhoto,
                    icon: const Icon(Icons.photo_camera_outlined),
                    label: Text(
                      c.photoUrl == null
                          ? l10n.communityAddPhoto
                          : l10n.communityChangePhoto,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _name,
                maxLength: 60,
                decoration: InputDecoration(
                  labelText: l10n.communityFormNameLabel,
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _city,
                maxLength: 80,
                decoration: InputDecoration(
                  labelText: l10n.communityFormCityLabel,
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              Text(l10n.communityFormFrequencyLabel, style: type.label),
              const SizedBox(height: 6),
              CommunityFrequencyPicker(
                value: _frequency,
                onChanged: (v) => setState(() => _frequency = v),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _about,
                maxLines: 3,
                maxLength: 1000,
                decoration: InputDecoration(
                  labelText: l10n.communityFormAboutLabel,
                  counterText: '',
                ),
              ),
              const SizedBox(height: 12),
              Text(l10n.communityFormJoinLabel, style: type.label),
              const SizedBox(height: 6),
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
              const SizedBox(height: 16),
              DriftPrimaryButton(
                label: l10n.communitySave,
                loading: _busy,
                onPressed: _busy ? null : _save,
              ),
            ],
          ),
        ),

        // --------------------------------------------------- requests + members
        if (_approved || c.status == CommunityStatus.suspended)
          switch (members) {
            AsyncData(:final value) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (value.requests.isNotEmpty) ...[
                  _SectionTitle(
                    l10n.communityJoinRequests(value.requests.length),
                  ),
                  for (final request in value.requests) ...[
                    CommunityMemberTile(
                      member: request,
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: l10n.communityDecline,
                            onPressed: _busy
                                ? null
                                : () => _run(
                                    () => ref
                                        .read(communitiesRepositoryProvider)
                                        .declineRequest(c.id, request.userId),
                                  ),
                            icon: const Icon(Icons.close_rounded),
                          ),
                          IconButton.filled(
                            tooltip: l10n.communityApprove,
                            onPressed: _busy
                                ? null
                                : () => _run(
                                    () => ref
                                        .read(communitiesRepositoryProvider)
                                        .approveRequest(c.id, request.userId),
                                  ),
                            icon: const Icon(Icons.check_rounded),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ],
                _SectionTitle(l10n.communityMembersCount(value.members.length)),
                for (final member in value.members) ...[
                  CommunityMemberTile(
                    member: member,
                    trailing: member.userId == viewerId
                        ? null
                        : _MemberMenu(
                            member: member,
                            viewerIsOwner: _isOwner,
                            busy: _busy,
                            onAction: (action) => _memberAction(action, member),
                          ),
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
            AsyncError() => DriftErrorRetry(
              message: l10n.communityLoadMembersFailed,
              onRetry: () => ref.invalidate(communityMembersProvider(c.id)),
            ),
            _ => const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            ),
          },

        // ------------------------------------------------------ competitions
        if (_approved) ...[
          _SectionTitle(l10n.communityTabCompetitions),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : _newLadder,
                  icon: const Icon(Icons.stairs_outlined),
                  label: Text(l10n.communityNewLadder),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () =>
                      context.push('/communities/${c.id}/leagues/new'),
                  icon: const Icon(Icons.emoji_events_outlined),
                  label: Text(l10n.communityNewLeague),
                ),
              ),
            ],
          ),
          _Disputes(communityId: c.id, onResolve: _run),
        ],

        // --------------------------------------------------------- owner only
        if (_isOwner) ...[
          _SectionTitle(l10n.communityOwnerZone),
          OutlinedButton.icon(
            onPressed: _busy ? null : _delete,
            style: OutlinedButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            icon: const Icon(Icons.delete_outline_rounded),
            label: Text(l10n.communityDelete),
          ),
        ],
      ],
    );
  }

  Future<void> _memberAction(_MemberAction action, CommunityMember member) async {
    final l10n = context.l10n;
    final repo = ref.read(communitiesRepositoryProvider);
    switch (action) {
      case _MemberAction.makeAdmin:
        await _run(() => repo.setRole(c.id, member.userId, CommunityRole.admin));
      case _MemberAction.removeAdmin:
        await _run(
          () => repo.setRole(c.id, member.userId, CommunityRole.member),
        );
      case _MemberAction.makeOwner:
        if (await _confirm(
          l10n.communityTransferTitle(member.displayName),
          l10n.communityTransferBody,
          l10n.communityTransfer,
        )) {
          await _run(
            () => repo.transferOwnership(c.id, member.userId),
            done: l10n.communityTransferred(member.displayName),
          );
        }
      case _MemberAction.remove:
        if (await _confirm(
          l10n.communityRemoveTitle(member.displayName),
          l10n.communityRemoveBody,
          l10n.communityRemove,
        )) {
          await _run(() => repo.removeMember(c.id, member.userId));
        }
    }
  }
}

enum _MemberAction { makeAdmin, removeAdmin, makeOwner, remove }

/// What the viewer may do to [member]: the owner can change roles, hand over
/// ownership and remove anyone; an admin can only remove plain members.
class _MemberMenu extends StatelessWidget {
  const _MemberMenu({
    required this.member,
    required this.viewerIsOwner,
    required this.busy,
    required this.onAction,
  });

  final CommunityMember member;
  final bool viewerIsOwner;
  final bool busy;
  final ValueChanged<_MemberAction> onAction;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (member.role == CommunityRole.owner) return const SizedBox.shrink();
    final items = <(_MemberAction, String)>[
      if (viewerIsOwner && member.role == CommunityRole.member)
        (_MemberAction.makeAdmin, l10n.communityMakeAdmin),
      if (viewerIsOwner && member.role == CommunityRole.admin)
        (_MemberAction.removeAdmin, l10n.communityRemoveAdmin),
      if (viewerIsOwner) (_MemberAction.makeOwner, l10n.communityMakeOwner),
      if (viewerIsOwner || member.role == CommunityRole.member)
        (_MemberAction.remove, l10n.communityRemove),
    ];
    if (items.isEmpty) return const SizedBox.shrink();
    return PopupMenuButton<_MemberAction>(
      enabled: !busy,
      onSelected: onAction,
      itemBuilder: (_) => [
        for (final (action, label) in items)
          PopupMenuItem(value: action, child: Text(label)),
      ],
    );
  }
}

class _Disputes extends ConsumerWidget {
  const _Disputes({required this.communityId, required this.onResolve});

  final String communityId;
  final Future<bool> Function(Future<void> Function() action, {String? done})
  onResolve;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final disputes = ref.watch(_disputesProvider(communityId)).valueOrNull;
    if (disputes == null || disputes.isEmpty) return const SizedBox.shrink();

    Future<void> resolve(CommunityDispute d, bool keepSubmitted) async {
      final ok = await onResolve(
        () => ref
            .read(communitiesRepositoryProvider)
            .resolveDispute(communityId, d.fixtureId, keepSubmitted: keepSubmitted),
        done: l10n.communityDisputeResolved,
      );
      if (ok) ref.invalidate(_disputesProvider(communityId));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SectionTitle(l10n.communityDisputes(disputes.length)),
        for (final d in disputes) ...[
          DriftSoftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  d.sideBName == null
                      ? d.sideAName
                      : l10n.communityDisputeVs(d.sideAName, d.sideBName!),
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(l10n.communityDisputeHint, style: type.bodySmall),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => resolve(d, true),
                        child: Text(l10n.communityDisputeKeep),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => resolve(d, false),
                        child: Text(l10n.communityDisputeUseDisputed),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(2, 24, 2, 10),
      child: Text(text, style: type.h4),
    );
  }
}

class _NewLadderDialog extends StatefulWidget {
  const _NewLadderDialog();

  @override
  State<_NewLadderDialog> createState() => _NewLadderDialogState();
}

class _NewLadderDialogState extends State<_NewLadderDialog> {
  final _name = TextEditingController();
  int _range = 2;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return AlertDialog(
      title: Text(l10n.communityNewLadder),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _name,
            autofocus: true,
            maxLength: 60,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: l10n.communityLadderName,
              counterText: '',
            ),
          ),
          const SizedBox(height: 16),
          Text(l10n.communityChallengeRange(_range), style: type.body),
          Slider(
            value: _range.toDouble(),
            min: 1,
            max: 10,
            divisions: 9,
            label: '$_range',
            onChanged: (v) => setState(() => _range = v.round()),
          ),
          Text(l10n.communityChallengeRangeHint, style: type.caption),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.commonCancel),
        ),
        TextButton(
          onPressed: _name.text.trim().length < 2
              ? null
              : () => Navigator.of(context).pop((_name.text.trim(), _range)),
          child: Text(l10n.communityCreate),
        ),
      ],
    );
  }
}
