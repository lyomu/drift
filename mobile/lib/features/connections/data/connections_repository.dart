import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../players/data/players_repository.dart';

class ConnectionEntry {
  const ConnectionEntry({
    required this.connectionId,
    required this.player,
    this.connectedAt,
    this.requestedAt,
  });

  final String connectionId;
  final PlayerSummary player;
  final DateTime? connectedAt;
  final DateTime? requestedAt;

  factory ConnectionEntry.fromJson(Map<String, dynamic> json) =>
      ConnectionEntry(
        connectionId: json['connectionId'] as String,
        player: PlayerSummary.fromJson(json['player'] as Map<String, dynamic>),
        connectedAt: DateTime.tryParse(json['connectedAt'] as String? ?? ''),
        requestedAt: DateTime.tryParse(json['requestedAt'] as String? ?? ''),
      );
}

class PendingRequests {
  const PendingRequests({required this.incoming, required this.outgoing});

  final List<ConnectionEntry> incoming;
  final List<ConnectionEntry> outgoing;
}

class ConnectionsRepository {
  ConnectionsRepository(this._dio);

  final Dio _dio;

  Future<void> request(String addresseeId) => _send(
    () => _dio.post('/connections', data: {'addresseeId': addresseeId}),
  );

  Future<List<ConnectionEntry>> listAccepted() async {
    final data = await _send(() => _dio.get('/connections'));
    return (data['connections'] as List<dynamic>)
        .map((c) => ConnectionEntry.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  Future<PendingRequests> listPending() async {
    final data = await _send(() => _dio.get('/connections/pending'));
    List<ConnectionEntry> parse(String key) => (data[key] as List<dynamic>)
        .map((c) => ConnectionEntry.fromJson(c as Map<String, dynamic>))
        .toList();
    return PendingRequests(
      incoming: parse('incoming'),
      outgoing: parse('outgoing'),
    );
  }

  Future<void> accept(String connectionId) =>
      _send(() => _dio.patch('/connections/$connectionId/accept'));

  Future<void> decline(String connectionId) =>
      _send(() => _dio.patch('/connections/$connectionId/decline'));

  Future<void> remove(String connectionId) =>
      _send(() => _dio.delete('/connections/$connectionId'));

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() call,
  ) async {
    try {
      final response = await call();
      final data = response.data;
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final connectionsRepositoryProvider = Provider<ConnectionsRepository>((ref) {
  return ConnectionsRepository(ref.watch(dioClientProvider));
});
