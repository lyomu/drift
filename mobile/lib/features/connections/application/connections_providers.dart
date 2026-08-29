import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/connections_repository.dart';

// `.autoDispose` per the M9 convention. Connection state changes from the
// other side of the relationship — a request accepted elsewhere has to show
// up on the next visit, not after an app restart.

final connectionsProvider = FutureProvider.autoDispose<List<ConnectionEntry>>((
  ref,
) {
  return ref.watch(connectionsRepositoryProvider).listAccepted();
});

final pendingRequestsProvider = FutureProvider.autoDispose<PendingRequests>((
  ref,
) {
  return ref.watch(connectionsRepositoryProvider).listPending();
});
