import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/users_repository.dart';

/// The signed-in user. Cached for the session — match and chat screens need
/// the viewer's id constantly (to tell "mine" from "theirs") and shouldn't
/// each re-fetch it.
final currentUserProvider = FutureProvider<UserProfile>((ref) {
  return ref.watch(usersRepositoryProvider).getMe();
});
