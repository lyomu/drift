import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../application/clubs_providers.dart';
import '../data/clubs_repository.dart';

/// The reaction set. Deliberately small and fixed client-side — the server
/// stores whatever emoji it's sent, so this can grow without a migration.
const _reactions = ['👍', '🎾', '🔥', '👏'];

/// Club Feed — `foundation/04-screen-inventory.md` §A.9. The conversational
/// counterpart to Announcements, for a club you've joined.
///
/// Members only, enforced server-side by the club membership guard.
class ClubFeedScreen extends ConsumerStatefulWidget {
  const ClubFeedScreen({super.key, required this.clubId});

  final String clubId;

  @override
  ConsumerState<ClubFeedScreen> createState() => _ClubFeedScreenState();
}

class _ClubFeedScreenState extends ConsumerState<ClubFeedScreen> {
  final _composer = TextEditingController();
  bool _isPosting = false;
  String? _errorText;

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(clubFeedProvider(widget.clubId));
    await ref.read(clubFeedProvider(widget.clubId).future);
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _errorText = null);
    try {
      await action();
      await _refresh();
    } on AuthException catch (e) {
      if (mounted) setState(() => _errorText = e.message);
    }
  }

  Future<void> _post() async {
    final body = _composer.text.trim();
    if (body.isEmpty) return;

    setState(() => _isPosting = true);
    await _run(
      () => ref.read(clubsRepositoryProvider).post(widget.clubId, body),
    );
    if (mounted) {
      _composer.clear();
      setState(() => _isPosting = false);
    }
  }

  Future<void> _toggleReaction(
    ClubPost post,
    ClubPostReaction? existing,
    String emoji,
  ) async {
    final repo = ref.read(clubsRepositoryProvider);
    await _run(
      () => existing?.mine == true
          ? repo.unreact(widget.clubId, post.id, emoji)
          : repo.react(widget.clubId, post.id, emoji),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final feed = ref.watch(clubFeedProvider(widget.clubId));

    return DriftScaffold(
      title: 'Club Feed',
      body: Column(
        children: [
          if (_errorText != null)
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: DriftSpacing.s5,
                vertical: DriftSpacing.s2,
              ),
              child: Text(_errorText!, style: TextStyle(color: colors.error)),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: switch (feed) {
                AsyncData(:final value) when value.isEmpty => const _Empty(),
                AsyncData(:final value) => ListView.separated(
                  padding: const EdgeInsets.all(DriftSpacing.s5),
                  itemCount: value.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: DriftSpacing.s3),
                  itemBuilder: (context, i) => _PostCard(
                    post: value[i],
                    onReact: (emoji, existing) =>
                        _toggleReaction(value[i], existing, emoji),
                    onDelete: value[i].isMine
                        ? () => _run(
                            () => ref
                                .read(clubsRepositoryProvider)
                                .deletePost(widget.clubId, value[i].id),
                          )
                        : null,
                  ),
                ),
                AsyncError() => const _NotAMember(),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ),
          if (feed.hasValue)
            _Composer(
              controller: _composer,
              isPosting: _isPosting,
              onPost: _isPosting ? null : _post,
            ),
        ],
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({
    required this.post,
    required this.onReact,
    required this.onDelete,
  });

  final ClubPost post;
  final void Function(String emoji, ClubPostReaction? existing) onReact;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                // Null once the author deletes their account — the post
                // stays readable rather than vanishing from the thread.
                child: Text(
                  post.author?.name ?? 'Former member',
                  style: type.label,
                ),
              ),
              if (onDelete != null)
                TextButton(
                  onPressed: onDelete,
                  child: Text('Delete', style: TextStyle(color: colors.error)),
                ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s2),
          Text(post.body, style: type.body),
          const SizedBox(height: DriftSpacing.s3),
          Wrap(
            spacing: DriftSpacing.s2,
            children: [
              for (final emoji in _reactions)
                _ReactionChip(
                  emoji: emoji,
                  reaction: post.reactions
                      .where((r) => r.emoji == emoji)
                      .firstOrNull,
                  onTap: () => onReact(
                    emoji,
                    post.reactions.where((r) => r.emoji == emoji).firstOrNull,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ReactionChip extends StatelessWidget {
  const _ReactionChip({
    required this.emoji,
    required this.reaction,
    required this.onTap,
  });

  final String emoji;
  final ClubPostReaction? reaction;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final mine = reaction?.mine ?? false;
    final count = reaction?.count ?? 0;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: DriftSpacing.s3,
          vertical: DriftSpacing.s2,
        ),
        decoration: BoxDecoration(
          color: mine ? colors.primary.withValues(alpha: 0.12) : null,
          border: Border.all(color: mine ? colors.primary : colors.border),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(count > 0 ? '$emoji $count' : emoji, style: type.caption),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.isPosting,
    required this.onPost,
  });

  final TextEditingController controller;
  final bool isPosting;
  final VoidCallback? onPost;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: colors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Share something with the club',
              ),
            ),
          ),
          const SizedBox(width: DriftSpacing.s3),
          IconButton.filled(onPressed: onPost, icon: const Icon(Icons.send)),
        ],
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        const SizedBox(height: DriftSpacing.s8),
        Center(
          child: Text(
            'No posts yet',
            style: TextStyle(color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}

class _NotAMember extends StatelessWidget {
  const _NotAMember();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      children: [
        const SizedBox(height: DriftSpacing.s8),
        Center(
          child: Text(
            'Join this club to see and post to its feed.',
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}
