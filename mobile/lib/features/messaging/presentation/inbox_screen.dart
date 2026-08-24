import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../application/messaging_providers.dart';
import '../data/messaging_repository.dart';

/// Inbox — `foundation/04-screen-inventory.md` §A.9.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(conversationsProvider.future),
          child: switch (conversations) {
            AsyncData(:final value) =>
              value.isEmpty
                  ? const _EmptyInbox()
                  : ListView.separated(
                      padding: const EdgeInsets.all(DriftSpacing.s4),
                      itemCount: value.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: DriftSpacing.s3),
                      itemBuilder: (context, i) =>
                          _ConversationTile(conversation: value[i]),
                    ),
            AsyncError() => const Center(
              child: Text("Couldn't load your messages."),
            ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation});

  final Conversation conversation;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final preview = conversation.lastMessage;

    return DriftCard(
      onTap: () => context.push('/messages/${conversation.id}'),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(conversation.title, style: type.title),
                    ),
                    if (conversation.matchId != null)
                      Icon(
                        Icons.sports_tennis,
                        size: 15,
                        color: colors.textSecondary,
                      ),
                  ],
                ),
                if (preview != null) ...[
                  const SizedBox(height: DriftSpacing.s1),
                  Text(
                    preview.body,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: type.bodySmall.copyWith(
                      color: colors.textSecondary,
                      fontStyle: preview.isSystem
                          ? FontStyle.italic
                          : FontStyle.normal,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (conversation.unreadCount > 0) ...[
            const SizedBox(width: DriftSpacing.s2),
            Badge(label: Text('${conversation.unreadCount}')),
          ],
        ],
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
                'No conversations yet — connect with a player to start one',
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
