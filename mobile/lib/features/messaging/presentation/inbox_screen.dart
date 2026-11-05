import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/media_url.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../users/application/current_user_provider.dart';
import '../application/messaging_providers.dart';
import '../data/messaging_repository.dart';
import '../../../core/l10n/l10n.dart';
import 'package:intl/intl.dart';

/// Inbox — `foundation/04-screen-inventory.md` §A.9.
///
/// Search and the All/Unread tabs filter purely in memory over whatever
/// `conversationsProvider` already fetched — there is no server-side search
/// endpoint, and the per-account conversation count doesn't warrant one.
class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  final _searchController = TextEditingController();
  int _selectedTab = 0;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final conversations = ref.watch(conversationsProvider);

    return DriftScaffold(
      title: context.l10n.navMessages,
      floatingActionButton: FloatingActionButton(
        tooltip: context.l10n.messagingNewMessage,
        onPressed: () => context.push('/messages/new'),
        child: const Icon(Icons.edit_rounded),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DriftSpacing.s4,
              DriftSpacing.s3,
              DriftSpacing.s4,
              DriftSpacing.s2,
            ),
            child: _InboxSearchField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
            ),
          ),
          DriftPillTabs(
            labels: [context.l10n.searchAll, context.l10n.messagingUnread],
            selected: _selectedTab,
            onChanged: (i) => setState(() => _selectedTab = i),
          ),
          const SizedBox(height: DriftSpacing.s2),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(conversationsProvider.future),
              child: switch (conversations) {
                AsyncData(:final value) =>
                  value.isEmpty ? const _EmptyInbox() : _buildList(value),
                AsyncError() => Center(
                  child: Text(context.l10n.messagingLoadFailed),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(List<Conversation> all) {
    final filtered = _filterConversations(
      all,
      query: _searchController.text,
      unreadOnly: _selectedTab == 1,
    );
    if (filtered.isEmpty) return const _NoResultsState();

    return ListView.separated(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      itemCount: filtered.length,
      separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s3),
      itemBuilder: (context, i) => _ConversationTile(conversation: filtered[i]),
    );
  }
}

List<Conversation> _filterConversations(
  List<Conversation> all, {
  required String query,
  required bool unreadOnly,
}) {
  final q = query.trim().toLowerCase();
  return all.where((c) {
    if (unreadOnly && c.unreadCount == 0) return false;
    if (q.isEmpty) return true;
    final inTitle = c.title.toLowerCase().contains(q);
    final inPreview = c.lastMessage?.body.toLowerCase().contains(q) ?? false;
    return inTitle || inPreview;
  }).toList();
}

/// Local search field — `DriftPlayerSearchBar` (shared/widgets) hard-bundles
/// a filter button this screen has nothing to filter by, so this mirrors its
/// visual language without it rather than forcing that widget to fit.
class _InboxSearchField extends StatelessWidget {
  const _InboxSearchField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final border = Color.alphaBlend(
      colors.primary.withValues(alpha: 0.18),
      colors.surface,
    );

    return Container(
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(DriftRadius.lg),
        border: Border.all(color: border, width: 1.5),
      ),
      padding: const EdgeInsets.symmetric(horizontal: DriftSpacing.s3),
      child: Row(
        children: [
          Icon(Icons.search_rounded, size: 18, color: colors.textSecondary),
          const SizedBox(width: DriftSpacing.s2),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              cursorColor: colors.primary,
              style: type.body,
              decoration: InputDecoration(
                isDense: true,
                filled: false,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                hintText: context.l10n.messagingSearch,
                hintStyle: type.body.copyWith(color: colors.textSecondary),
                contentPadding: const EdgeInsets.symmetric(
                  vertical: DriftSpacing.s3,
                ),
              ),
            ),
          ),
          if (controller.text.isNotEmpty)
            GestureDetector(
              onTap: () {
                controller.clear();
                onChanged('');
              },
              child: Icon(
                Icons.close_rounded,
                size: 16,
                color: colors.textSecondary,
              ),
            ),
        ],
      ),
    );
  }
}

class _ConversationTile extends ConsumerWidget {
  const _ConversationTile({required this.conversation});

  final Conversation conversation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final preview = conversation.lastMessage;
    final unread = conversation.unreadCount > 0;

    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id ?? '';
    final others = conversation.participants
        .where((p) => p.id != viewerId)
        .toList();
    final other = others.isEmpty ? null : others.first;
    // `Conversation.title` joins every participant, including the viewer —
    // fine for a group, wrong for a 1:1 thread where it would show the
    // viewer's own name next to the other person's. Prefer the other
    // participant(s) here; fall back to the raw title only when none could
    // be resolved (e.g. `currentUserProvider` hasn't loaded yet).
    final displayTitle = others.isEmpty
        ? conversation.title
        : others.map((p) => p.displayName).join(', ');

    return DriftCard(
      onTap: () => context.push('/messages/${conversation.id}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          other != null
              ? DriftPlayerAvatar(player: other, radius: 22)
              : _FallbackAvatar(
                  radius: 22,
                  group: conversation.isCommunity,
                  photoUrl: driftMediaUrl(conversation.community?.photoUrl),
                ),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        displayTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: type.title.copyWith(
                          fontWeight: unread
                              ? FontWeight.w700
                              : FontWeight.w500,
                        ),
                      ),
                    ),
                    if (conversation.lastMessageAt != null) ...[
                      const SizedBox(width: DriftSpacing.s2),
                      Text(
                        _relativeTimestamp(conversation.lastMessageAt!),
                        style: type.caption.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
                if (preview != null) ...[
                  const SizedBox(height: DriftSpacing.s1),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          // A group thread says who spoke last.
                          conversation.isCommunity &&
                                  !preview.isSystem &&
                                  preview.senderName != null &&
                                  preview.senderId != viewerId
                              ? context.l10n.communityChatPreview(
                                  preview.senderName!,
                                  preview.body,
                                )
                              : preview.body,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: type.bodySmall.copyWith(
                            color: colors.textSecondary,
                            fontStyle: preview.isSystem
                                ? FontStyle.italic
                                : FontStyle.normal,
                            fontWeight: unread
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                      if (unread) ...[
                        const SizedBox(width: DriftSpacing.s2),
                        _UnreadBadge(count: conversation.unreadCount),
                      ],
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Generic stand-in for the (practically unreachable) case of a conversation
/// with no other participant — mirrors `Conversation.title`'s own
/// "Conversation" fallback for the same situation.
///
/// Also a community thread's avatar: its photo, or a group icon.
class _FallbackAvatar extends StatelessWidget {
  const _FallbackAvatar({
    required this.radius,
    this.group = false,
    this.photoUrl,
  });

  final double radius;
  final bool group;
  final String? photoUrl;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return CircleAvatar(
      radius: radius,
      backgroundColor: colors.primaryLight,
      foregroundImage: photoUrl == null ? null : NetworkImage(photoUrl!),
      child: Icon(
        group ? Icons.groups_outlined : Icons.person_outline_rounded,
        color: colors.primaryDark,
        size: radius,
      ),
    );
  }
}

class _UnreadBadge extends StatelessWidget {
  const _UnreadBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      constraints: const BoxConstraints(minWidth: 20),
      padding: const EdgeInsets.symmetric(
        horizontal: DriftSpacing.s2,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: colors.primary,
        borderRadius: BorderRadius.circular(DriftRadius.full),
      ),
      child: Text(
        '$count',
        textAlign: TextAlign.center,
        style: type.caption.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _EmptyInbox extends StatelessWidget {
  const _EmptyInbox();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Icon(Icons.forum_outlined, size: 40, color: colors.textSecondary),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                context.l10n.messagingEmpty,
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Distinct from [_EmptyInbox]: this is "you have conversations, but none
/// match the current search/filter" — "connect with a player" would be the
/// wrong prompt here.
class _NoResultsState extends StatelessWidget {
  const _NoResultsState();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Icon(
                Icons.search_off_rounded,
                size: 40,
                color: colors.textSecondary,
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                context.l10n.messagingNoSearchResults,
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Calendar-day-diff based (not raw `Duration`), so a message from 11pm
/// yesterday doesn't briefly show as "Today" or skip straight past
/// "Yesterday" depending on when it's viewed. No `intl` dependency, same
/// reasoning as `drift_app_header.dart`'s hand-rolled date string.
String _relativeTimestamp(DateTime time) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(time.year, time.month, time.day);
  final diff = today.difference(day).inDays;

  if (diff == 0) return _hhmm(time);
  if (diff == 1) return l10nNow.commonYesterday;
  if (diff > 1 && diff < 7) return _weekdayName(time);

  return time.year == now.year
      ? DateFormat.MMMd(localeTagNow).format(time)
      : DateFormat.yMMMd(localeTagNow).format(time);
}

String _hhmm(DateTime t) =>
    '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

String _weekdayName(DateTime t) => DateFormat.E(localeTagNow).format(t);
