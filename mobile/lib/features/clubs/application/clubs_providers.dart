import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../courts/application/courts_providers.dart';
import '../data/clubs_repository.dart';

// `.autoDispose` throughout — same M9 convention as courts_providers.dart.

final clubSearchProvider = FutureProvider.autoDispose<ClubSearchResult>((ref) {
  final center = ref.watch(mapCenterProvider);
  return ref.watch(clubsRepositoryProvider).search(center);
});

final clubDetailProvider = FutureProvider.autoDispose
    .family<ClubProfile, String>((ref, clubId) {
      final center = ref.watch(mapCenterProvider);
      return ref
          .watch(clubsRepositoryProvider)
          .findOne(clubId, viewerLocation: center);
    });

final clubAnnouncementsProvider = FutureProvider.autoDispose
    .family<List<Announcement>, String>((ref, clubId) {
      return ref.watch(clubsRepositoryProvider).announcements(clubId);
    });

final clubFeedProvider = FutureProvider.autoDispose
    .family<List<ClubPost>, String>((ref, clubId) {
      return ref.watch(clubsRepositoryProvider).feed(clubId);
    });
