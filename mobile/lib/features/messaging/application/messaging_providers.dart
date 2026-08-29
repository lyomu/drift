import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/socket_client.dart';
import '../data/messaging_repository.dart';

// `.autoDispose` per the M9 convention. The socket keeps an *open* screen
// current, but it can't help a screen that was closed and reopened — without
// autoDispose the inbox and any previously-viewed thread render from a cache
// that may be hours old.

final conversationsProvider = FutureProvider.autoDispose<List<Conversation>>((
  ref,
) {
  ref.listen(socketMessagesProvider, (_, _) => ref.invalidateSelf());
  return ref.watch(messagingRepositoryProvider).listConversations();
});

/// Thread contents. Seeded from REST so the thread renders even with the
/// socket down, then appended to as live messages arrive.
final threadProvider = AsyncNotifierProvider.autoDispose
    .family<ThreadNotifier, List<ChatMessage>, String>(ThreadNotifier.new);

class ThreadNotifier
    extends AutoDisposeFamilyAsyncNotifier<List<ChatMessage>, String> {
  @override
  Future<List<ChatMessage>> build(String conversationId) async {
    // Append anything the socket delivers for this thread.
    ref.listen(socketMessagesProvider, (_, next) {
      final raw = next.valueOrNull;
      if (raw == null || raw['conversationId'] != conversationId) return;

      final incoming = ChatMessage.fromJson(raw);
      final current = state.valueOrNull ?? const <ChatMessage>[];
      // The sender already appended optimistically via send().
      if (current.any((m) => m.id == incoming.id)) return;
      state = AsyncData([...current, incoming]);
    });

    final socket = await ref.watch(socketClientProvider.future);
    socket.joinConversation(conversationId);

    // Deliberately no `leaveConversation` on dispose: the gateway joins a
    // client to *every* one of its conversation rooms on connect
    // (messaging.gateway.ts), so leaving here would silently stop the inbox
    // from live-updating for this thread until the socket reconnects. The
    // join above is idempotent, so re-entering a thread costs nothing.
    return ref.watch(messagingRepositoryProvider).getMessages(conversationId);
  }

  Future<void> send(String body) async {
    final sent = await ref.read(messagingRepositoryProvider).send(arg, body);
    final current = state.valueOrNull ?? const <ChatMessage>[];
    if (!current.any((m) => m.id == sent.id)) {
      state = AsyncData([...current, sent]);
    }
  }

  Future<void> markRead() =>
      ref.read(messagingRepositoryProvider).markRead(arg);
}
