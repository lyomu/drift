import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/socket_client.dart';
import '../data/messaging_repository.dart';

final conversationsProvider = FutureProvider<List<Conversation>>((ref) {
  ref.listen(socketMessagesProvider, (_, _) => ref.invalidateSelf());
  return ref.watch(messagingRepositoryProvider).listConversations();
});

/// Thread contents. Seeded from REST so the thread renders even with the
/// socket down, then appended to as live messages arrive.
final threadProvider =
    AsyncNotifierProvider.family<ThreadNotifier, List<ChatMessage>, String>(
      ThreadNotifier.new,
    );

class ThreadNotifier extends FamilyAsyncNotifier<List<ChatMessage>, String> {
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
