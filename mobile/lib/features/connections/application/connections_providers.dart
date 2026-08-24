import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/connections_repository.dart';

final connectionsProvider = FutureProvider<List<ConnectionEntry>>((ref) {
  return ref.watch(connectionsRepositoryProvider).listAccepted();
});

final pendingRequestsProvider = FutureProvider<PendingRequests>((ref) {
  return ref.watch(connectionsRepositoryProvider).listPending();
});
