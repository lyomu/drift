import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../network/dio_client.dart';

/// Socket.io event names — must stay in step with
/// `backend/src/messaging/messaging.events.ts`.
class SocketEvents {
  const SocketEvents._();

  static const messageNew = 'message:new';
  static const matchUpdated = 'match:updated';
  static const conversationJoin = 'conversation:join';
  static const conversationLeave = 'conversation:leave';
}

/// Wraps the socket.io connection. Chat reads still work over REST when this
/// is down — the socket is a live-update channel, never the only path to the
/// data, which is what keeps §A.9's offline behaviour honest.
class SocketClient {
  SocketClient(this._baseUrl, this._token);

  final String _baseUrl;
  final String? _token;

  io.Socket? _socket;

  final _messages = StreamController<Map<String, dynamic>>.broadcast();
  final _matchUpdates = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get messages => _messages.stream;
  Stream<Map<String, dynamic>> get matchUpdates => _matchUpdates.stream;

  bool get isConnected => _socket?.connected ?? false;

  void connect() {
    if (_token == null || _socket != null) return;

    final socket = io.io(
      _baseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': _token})
          .enableReconnection()
          .build(),
    );

    socket.on(SocketEvents.messageNew, (data) {
      if (data is Map) _messages.add(Map<String, dynamic>.from(data));
    });
    socket.on(SocketEvents.matchUpdated, (data) {
      if (data is Map) _matchUpdates.add(Map<String, dynamic>.from(data));
    });

    _socket = socket;
  }

  /// Joins a thread created after the socket connected — a challenge that
  /// arrived mid-session. The server re-checks membership.
  void joinConversation(String conversationId) {
    _socket?.emit(SocketEvents.conversationJoin, {
      'conversationId': conversationId,
    });
  }

  void leaveConversation(String conversationId) {
    _socket?.emit(SocketEvents.conversationLeave, {
      'conversationId': conversationId,
    });
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _messages.close();
    _matchUpdates.close();
  }
}

/// Connects once the access token is available, and tears the socket down
/// with the provider so a logout doesn't leave an authenticated connection
/// open.
final socketClientProvider = FutureProvider<SocketClient>((ref) async {
  final storage = ref.watch(secureStorageProvider);
  final token = await storage.readAccessToken();

  final client = SocketClient(apiBaseUrl(), token);
  client.connect();
  ref.onDispose(client.dispose);
  return client;
});

/// Live message stream, empty until the socket is up.
final socketMessagesProvider = StreamProvider<Map<String, dynamic>>((
  ref,
) async* {
  final client = await ref.watch(socketClientProvider.future);
  yield* client.messages;
});

/// Live match-update stream — drives Play Hub refreshes.
final socketMatchUpdatesProvider = StreamProvider<Map<String, dynamic>>((
  ref,
) async* {
  final client = await ref.watch(socketClientProvider.future);
  yield* client.matchUpdates;
});
