import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/location/location_service.dart';
import '../data/communities_repository.dart';

// `.autoDispose` on the data providers, per the M9 convention: membership,
// requests and approvals all change while the person is elsewhere in the
// app, and a session-lifetime cache would never show them.

/// The Community hub's search box and filter chips.
final communityFiltersProvider = StateProvider<CommunityFilters>(
  (ref) => const CommunityFilters(),
);

/// Where the viewer is, for sorting by distance and the "Near me" chip.
/// Kept for the session (not autoDispose) so the GPS isn't asked on every
/// visit; null when location is off or denied, and the list then falls
/// back to newest-first.
final communityViewerLocationProvider = FutureProvider<ResolvedLocation?>((
  ref,
) async {
  try {
    return await ref.watch(locationServiceProvider).getCurrentLocation();
  } catch (_) {
    return null;
  }
});

/// Approved communities matching the filters, nearest first when the
/// viewer's location is known.
final communitySearchProvider = FutureProvider.autoDispose<List<Community>>((
  ref,
) async {
  final filters = ref.watch(communityFiltersProvider);
  final location = await ref.watch(communityViewerLocationProvider.future);
  return ref
      .watch(communitiesRepositoryProvider)
      .search(
        filters,
        latitude: location?.latitude,
        longitude: location?.longitude,
      );
});

/// The viewer's own communities, including ones under review and pending
/// join requests.
final myCommunitiesProvider = FutureProvider.autoDispose<List<Community>>((
  ref,
) {
  return ref.watch(communitiesRepositoryProvider).mine();
});

final communityDetailProvider = FutureProvider.autoDispose
    .family<Community, String>((ref, id) {
      return ref.watch(communitiesRepositoryProvider).detail(id);
    });

final communityMembersProvider = FutureProvider.autoDispose
    .family<CommunityMembers, String>((ref, id) {
      return ref.watch(communitiesRepositoryProvider).members(id);
    });

final communityCompetitionsProvider = FutureProvider.autoDispose
    .family<CommunityCompetitions, String>((ref, id) {
      return ref.watch(communitiesRepositoryProvider).competitions(id);
    });

/// Refetches everything that shows a community after a change to it.
void invalidateCommunity(WidgetRef ref, String id) {
  ref.invalidate(communityDetailProvider(id));
  ref.invalidate(communityMembersProvider(id));
  ref.invalidate(communityCompetitionsProvider(id));
  ref.invalidate(myCommunitiesProvider);
  ref.invalidate(communitySearchProvider);
}
