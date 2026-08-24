import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/application/current_user_provider.dart';
import '../application/messaging_providers.dart';
import '../../safety/presentation/message_report_sheet.dart';
import '../data/messaging_repository.dart';

/// Chat Thread — `foundation/04-screen-inventory.md` §A.9. Carries both
/// player messages and the SYSTEM events the match state machine writes, so
/// the negotiation and the conversation about it live in one place.
class ChatThreadScreen extends ConsumerStatefulWidget {
  const ChatThreadScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends ConsumerState<ChatThreadScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(threadProvider(widget.conversationId).notifier).markRead();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty) return;

    setState(() => _isSending = true);
    try {
      await ref.read(threadProvider(widget.conversationId).notifier).send(body);
      _controller.clear();
      _scrollToEnd();
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(threadProvider(widget.conversationId));
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id ?? '';

    // Scroll down as live messages land.
    ref.listen(threadProvider(widget.conversationId), (_, _) => _scrollToEnd());

    return Scaffold(
      appBar: AppBar(title: const Text('Chat')),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: switch (messages) {
                AsyncData(:final value) =>
                  value.isEmpty
                      ? const _SayHello()
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.all(DriftSpacing.s4),
                          itemCount: value.length,
                          itemBuilder: (context, i) => _MessageBubble(
                            message: value[i],
                            isMine: value[i].senderId == viewerId,
                            onReport: () => showMessageReportSheet(
                              context,
                              ref,
                              messageId: value[i].id,
                            ),
                          ),
                        ),
                AsyncError() => const Center(
                  child: Text("Couldn't load this conversation."),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
            _Composer(
              controller: _controller,
              isSending: _isSending,
              onSend: _send,
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.isMine,
    required this.onReport,
  });

  /// Long-press on someone else's message. System messages have no author,
  /// and your own aren't reportable, so both skip this.
  final VoidCallback onReport;

  final ChatMessage message;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    // System messages are centred and unattributed — they're events, not
    // speech, and must not read as something a player said.
    if (message.isSystem) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: DriftSpacing.s2),
        child: Center(
          child: GestureDetector(
            onTap: message.relatedMatchId == null
                ? null
                : () => context.push('/matches/${message.relatedMatchId}'),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: DriftSpacing.s3,
                vertical: DriftSpacing.s2,
              ),
              decoration: BoxDecoration(
                color: colors.border.withValues(alpha: 0.35),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                message.body,
                textAlign: TextAlign.center,
                style: type.caption.copyWith(color: colors.textSecondary),
              ),
            ),
          ),
        ),
      );
    }

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: isMine ? null : onReport,
        child: Container(
        margin: const EdgeInsets.only(bottom: DriftSpacing.s2),
        padding: const EdgeInsets.symmetric(
          horizontal: DriftSpacing.s4,
          vertical: DriftSpacing.s3,
        ),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isMine ? colors.primary : colors.surface,
          border: Border.all(color: isMine ? colors.primary : colors.border),
          borderRadius: BorderRadius.circular(16),
        ),
          child: Text(
            message.body,
            style: type.body.copyWith(
              color: isMine ? Colors.white : colors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.isSending,
    required this.onSend,
  });

  final TextEditingController controller;
  final bool isSending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s3),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(top: BorderSide(color: colors.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => onSend(),
              decoration: const InputDecoration(hintText: 'Message'),
            ),
          ),
          const SizedBox(width: DriftSpacing.s2),
          IconButton.filled(
            onPressed: isSending ? null : onSend,
            icon: const Icon(Icons.send),
          ),
        ],
      ),
    );
  }
}

class _SayHello extends StatelessWidget {
  const _SayHello();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Center(
      child: Text(
        'Say hello',
        style: type.body.copyWith(color: colors.textSecondary),
      ),
    );
  }
}
