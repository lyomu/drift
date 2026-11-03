import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../data/users_repository.dart';

/// The signed-in user. Cached for the session — match and chat screens need
/// the viewer's id constantly (to tell "mine" from "theirs") and shouldn't
/// each re-fetch it.
///
/// Also where the account's language is kept in step with the app's, so push
/// notifications and emails match what's on screen: a first login (the device
/// language), a Settings pick made offline, an account created elsewhere.
final currentUserProvider = FutureProvider<UserProfile>((ref) async {
  final repository = ref.watch(usersRepositoryProvider);
  final user = await repository.getMe();
  if (user.preferredLocale != CurrentAppLocale.code) {
    repository.updateLocale(CurrentAppLocale.code).catchError((_) {});
  }
  return user;
});
