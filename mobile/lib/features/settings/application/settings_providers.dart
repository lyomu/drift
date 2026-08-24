import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../safety/data/safety_repository.dart';
import '../../users/data/users_repository.dart';

// `.autoDispose` throughout — the M9 convention (see PROGRESS.md).

final privacySettingsProvider = FutureProvider.autoDispose<PrivacySettings>((
  ref,
) {
  return ref.watch(usersRepositoryProvider).getPrivacySettings();
});

final blockedUsersProvider = FutureProvider.autoDispose<List<BlockedPlayer>>((
  ref,
) {
  return ref.watch(safetyRepositoryProvider).listBlocks();
});
