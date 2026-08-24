import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../players/data/players_repository.dart';

// `.autoDispose` throughout — the M9 convention (see PROGRESS.md).

final ownProfileProvider = FutureProvider.autoDispose<PlayerProfile>((ref) {
  return ref.watch(playersRepositoryProvider).findOwn();
});
