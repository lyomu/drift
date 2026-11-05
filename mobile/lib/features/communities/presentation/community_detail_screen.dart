import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_community_card.dart';
import '../../../shared/widgets/drift_error_retry.dart';
import '../../../shared/widgets/drift_league_card.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../auth/data/auth_repository.dart';
import '../../messaging/presentation/chat_thread_screen.dart';
import '../application/communities_providers.dart';
import '../data/communities_repository.dart';
import 'community_member_tile.dart';
import 'report_community_sheet.dart';

/// Community Detail (2026-11). Header with the community's photo, type, city
/// and how often it meets; a button that follows the viewer's state (Join /
/// Request to join / Requested); and tabs. Members get Chat · Competitions ·
/// Members · About; everyone else sees About · Members · Competitions. A
/// community under review or rejected is only ever shown to its creator,
/// with the status explained in place of the tabs.
class CommunityDetailScreen extends ConsumerWidget {
  const CommunityDetailScreen({super.key, required this.communityId});

  final String communityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final detail = ref.watch(communityDetailProvider(communityId));

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: switch (detail) {
          AsyncData(:final value) => _Loaded(community: value),
          AsyncError() => Column(
            children: [
              DriftBackHeader(title: context.l10n.navCommunity),
              Expanded(
                child: DriftErrorRetry(
                  message: context.l10n.communityLoadOneFailed,
                  onRetry: () =>
                      ref.invalidate(communityDetailProvider(communityId)),
                ),
              ),
            ],
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Loaded extends ConsumerStatefulWidget {
  const _Loaded({required this.community});

  final Community community;

  @override
  ConsumerState<_Loaded> createState() => _LoadedState();
}

class _LoadedState extends ConsumerState<_Loaded> {
  bool _busy = false;

  Community get c => widget.community;

  Future<void> _run(Future<void> Function() action, {String? done}) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
      invalidateCommunity(ref, c.id);
      if (done != null) messenger.showSnackBar(SnackBar(content: Text(done)));
    } on AuthException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _join() => _run(
    () => ref.read(communitiesRepositoryProvider).join(c.id),
    done: c.joinPolicy == CommunityJoinPolicy.open
        ? context.l10n.communityJoinedToast(c.name)
        : context.l10n.communityRequestSent,
  );

  Future<void> _cancelRequest() => _run(
    () => ref.read(communitiesRepositoryProvider).cancelRequest(c.id),
  );

  Future<void> _leave() async {
    final l10n = context.l10n;
    final lastOwner = c.myMembership?.isOwner == true && c.memberCount <= 1;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.communityLeaveTitle(c.name)),
        content: Text(
          lastOwner ? l10n.communityLeaveLastOwner : l10n.communityLeaveBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(l10n.commonCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(l10n.communityLeave),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final router = GoRouter.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref.read(communitiesRepositoryProvider).leave(c.id);
      ref.invalidate(myCommunitiesProvider);
      ref.invalidate(communitySearchProvider);
      messenger.showSnackBar(SnackBar(content: Text(l10n.communityLeft)));
      if (router.canPop()) router.pop();
    } on AuthException catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  void _openMenu() {
    final l10n = context.l10n;
    final membership = c.myMembership;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (c.isMember)
              ListTile(
                leading: Icon(
                  membership!.muted
                      ? Icons.notifications_active_outlined
                      : Icons.notifications_off_outlined,
                ),
                title: Text(
                  membership.muted ? l10n.communityUnmute : l10n.communityMute,
                ),
                subtitle: Text(l10n.communityMuteHint),
                onTap: () {
                  Navigator.of(sheet).pop();
                  _run(
                    () => ref
                        .read(communitiesRepositoryProvider)
                        .setMuted(c.id, !membership.muted),
                  );
                },
              ),
            ListTile(
              leading: const Icon(Icons.flag_outlined),
              title: Text(l10n.communityReport),
              onTap: () {
                Navigator.of(sheet).pop();
                showReportCommunitySheet(context, ref, community: c);
              },
            ),
            if (c.isMember)
              ListTile(
                leading: Icon(
                  Icons.logout_rounded,
                  color: Theme.of(context).colorScheme.error,
                ),
                title: Text(
                  l10n.communityLeave,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                onTap: () {
                  Navigator.of(sheet).pop();
                  _leave();
                },
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final reviewing =
        c.status == CommunityStatus.pending ||
        c.status == CommunityStatus.rejected;
    final canManage = c.myMembership?.canManage ?? false;

    final header = DriftBackHeader(
      title: c.name,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (canManage) ...[
            DriftHeaderSquareButton(
              icon: Icons.settings_outlined,
              onTap: () => context.push('/communities/${c.id}/manage'),
            ),
            const SizedBox(width: 8),
          ],
          if (!reviewing)
            DriftHeaderSquareButton(
              icon: Icons.more_horiz_rounded,
              onTap: _openMenu,
            ),
        ],
      ),
    );

    if (reviewing) {
      return Column(
        children: [
          header,
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              children: [
                _Hero(community: c),
                const SizedBox(height: 16),
                _ReviewBanner(community: c),
                const SizedBox(height: 16),
                _AboutBody(community: c),
              ],
            ),
          ),
        ],
      );
    }

    final tabs = c.isMember
        ? [
            (l10n.communityTabChat, _Tab.chat),
            (l10n.communityTabCompetitions, _Tab.competitions),
            (l10n.communityTabMembers, _Tab.members),
            (l10n.communityTabAbout, _Tab.about),
          ]
        : [
            (l10n.communityTabAbout, _Tab.about),
            (l10n.communityTabMembers, _Tab.members),
            (l10n.communityTabCompetitions, _Tab.competitions),
          ];

    return DefaultTabController(
      length: tabs.length,
      child: Column(
        children: [
          header,
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: _Hero(community: c),
          ),
          if (!c.isMember) ...[
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _JoinButton(
                community: c,
                busy: _busy,
                onJoin: _join,
                onCancel: _cancelRequest,
              ),
            ),
          ],
          if (c.status == CommunityStatus.suspended) ...[
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _ReviewBanner(community: c),
            ),
          ],
          const SizedBox(height: 8),
          TabBar(
            isScrollable: false,
            tabs: [for (final (label, _) in tabs) Tab(text: label)],
          ),
          Expanded(
            child: TabBarView(
              children: [
                for (final (_, tab) in tabs)
                  switch (tab) {
                    _Tab.chat =>
                      c.conversationId == null
                          ? _Centered(text: l10n.communityChatUnavailable)
                          : ChatThreadScreen(
                              conversationId: c.conversationId!,
                              embedded: true,
                            ),
                    _Tab.competitions => _CompetitionsTab(community: c),
                    _Tab.members => _MembersTab(community: c),
                    _Tab.about => ListView(
                      padding: const EdgeInsets.all(16),
                      children: [_AboutBody(community: c)],
                    ),
                  },
              ],
            ),
          ),
        ],
      ),
    );
  }
}

enum _Tab { chat, competitions, members, about }

class _Hero extends StatelessWidget {
  const _Hero({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;
    return Row(
      children: [
        DriftCommunityAvatar(community: community, size: 68),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  DriftPill(label: community.type.label),
                  if (community.myMembership?.canManage ?? false)
                    DriftPill(
                      label: community.myMembership!.role.label,
                      tone: DriftPillTone.neutral,
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                [community.city, community.frequency.label].join(' · '),
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              const SizedBox(height: 2),
              Text(
                l10n.communityMemberCount(community.memberCount),
                style: type.bodySmall.copyWith(color: colors.textSecondary),
              ),
              if (community.clubName != null) ...[
                const SizedBox(height: 2),
                Text(
                  l10n.communityRunBy(community.clubName!),
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _JoinButton extends StatelessWidget {
  const _JoinButton({
    required this.community,
    required this.busy,
    required this.onJoin,
    required this.onCancel,
  });

  final Community community;
  final bool busy;
  final VoidCallback onJoin;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (community.status != CommunityStatus.approved) {
      return const SizedBox.shrink();
    }
    if (community.hasPendingRequest) {
      return OutlinedButton.icon(
        onPressed: busy ? null : onCancel,
        icon: const Icon(Icons.hourglass_top_rounded),
        label: Text(l10n.communityRequestedCancel),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: const StadiumBorder(),
        ),
      );
    }
    return FilledButton(
      onPressed: busy ? null : onJoin,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        shape: const StadiumBorder(),
      ),
      child: Text(
        community.joinPolicy == CommunityJoinPolicy.open
            ? l10n.communityJoin
            : l10n.communityRequestToJoin,
      ),
    );
  }
}

/// Under review / not approved / suspended, explained where the tabs would
/// be (or above them, for suspended).
class _ReviewBanner extends StatelessWidget {
  const _ReviewBanner({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;
    final (bg, fg, icon, title, body) = switch (community.status) {
      CommunityStatus.pending => (
        colors.warningSurface,
        colors.warning,
        Icons.hourglass_top_rounded,
        l10n.communityStatusUnderReview,
        l10n.communityUnderReviewBody,
      ),
      CommunityStatus.rejected => (
        colors.errorSurface,
        colors.error,
        Icons.block_rounded,
        l10n.communityStatusNotApproved,
        community.decisionNote ?? l10n.communityNotApprovedBody,
      ),
      _ => (
        colors.errorSurface,
        colors.error,
        Icons.pause_circle_outline_rounded,
        l10n.communityStatusSuspended,
        l10n.communitySuspendedBody,
      ),
    };
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: fg),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: type.title.copyWith(
                    color: fg,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(body, style: type.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AboutBody extends StatelessWidget {
  const _AboutBody({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;
    Widget row(IconData icon, String text) => Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Row(
        children: [
          Icon(icon, size: 18, color: colors.textSecondary),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: type.body)),
        ],
      ),
    );
    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            community.about?.isNotEmpty == true
                ? community.about!
                : l10n.communityNoAbout,
            style: type.body.copyWith(
              color: community.about?.isNotEmpty == true
                  ? colors.textPrimary
                  : colors.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
          row(Icons.place_outlined, community.city),
          row(Icons.event_repeat_outlined, community.frequency.label),
          row(
            community.joinPolicy == CommunityJoinPolicy.open
                ? Icons.public_rounded
                : Icons.lock_outline_rounded,
            community.joinPolicy == CommunityJoinPolicy.open
                ? l10n.communityJoinAnyone
                : l10n.communityJoinByRequest,
          ),
        ],
      ),
    );
  }
}

class _MembersTab extends ConsumerWidget {
  const _MembersTab({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final members = ref.watch(communityMembersProvider(community.id));
    return RefreshIndicator(
      onRefresh: () =>
          ref.refresh(communityMembersProvider(community.id).future),
      child: switch (members) {
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            for (final member in value.members) ...[
              CommunityMemberTile(member: member),
              const SizedBox(height: 8),
            ],
          ],
        ),
        AsyncError() => DriftErrorRetry(
          message: context.l10n.communityLoadMembersFailed,
          onRetry: () => ref.invalidate(communityMembersProvider(community.id)),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _CompetitionsTab extends ConsumerWidget {
  const _CompetitionsTab({required this.community});

  final Community community;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final competitions = ref.watch(communityCompetitionsProvider(community.id));
    final canManage = community.myMembership?.canManage ?? false;

    return RefreshIndicator(
      onRefresh: () =>
          ref.refresh(communityCompetitionsProvider(community.id).future),
      child: switch (competitions) {
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (canManage) ...[
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push(
                        '/communities/${community.id}/manage?create=ladder',
                      ),
                      icon: const Icon(Icons.stairs_outlined),
                      label: Text(l10n.communityNewLadder),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push(
                        '/communities/${community.id}/leagues/new',
                      ),
                      icon: const Icon(Icons.emoji_events_outlined),
                      label: Text(l10n.communityNewLeague),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            if (value.isEmpty)
              _Centered(
                text: canManage
                    ? l10n.communityNoCompetitionsManager
                    : l10n.communityNoCompetitions,
              ),
            if (value.ladders.isNotEmpty) ...[
              Text(l10n.communityLadders, style: type.h4),
              const SizedBox(height: 8),
              for (final ladder in value.ladders) ...[
                DriftSoftCard(
                  onTap: () => context.push('/compete/ladders/${ladder.id}'),
                  child: Row(
                    children: [
                      Icon(Icons.stairs_outlined, color: colors.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ladder.name,
                              style: type.title.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              ladder.myPosition == null
                                  ? l10n.communityLadderPlayers(
                                      ladder.entryCount,
                                    )
                                  : l10n.communityLadderYourRung(
                                      ladder.myPosition!,
                                      ladder.entryCount,
                                    ),
                              style: type.caption.copyWith(
                                color: colors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right, color: colors.textSecondary),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
              ],
              const SizedBox(height: 12),
            ],
            if (value.leagues.isNotEmpty) ...[
              Text(l10n.communityLeagues, style: type.h4),
              const SizedBox(height: 8),
              for (var i = 0; i < value.leagues.length; i++) ...[
                DriftLeagueCard(
                  league: value.leagues[i],
                  accentIndex: i,
                  onTap: () =>
                      context.push('/compete/leagues/${value.leagues[i].id}'),
                ),
                const SizedBox(height: 8),
              ],
            ],
          ],
        ),
        AsyncError() => DriftErrorRetry(
          message: l10n.communityLoadCompetitionsFailed,
          onRetry: () =>
              ref.invalidate(communityCompetitionsProvider(community.id)),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _Centered extends StatelessWidget {
  const _Centered({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: type.body.copyWith(color: colors.textSecondary),
      ),
    );
  }
}
