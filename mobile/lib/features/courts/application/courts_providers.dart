import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../data/courts_repository.dart';

// `.autoDispose` throughout — the M9 convention (see PROGRESS.md), set
// after M8's manual QA pass found plain FutureProviders never refetch
// within a session. Court Finder's map/list screens are the most
// refetch-sensitive UI yet (viewport pans, filter changes), so this
// matters even more here than it did for M8's fix.

/// The map's current center — null until first resolved (GPS or a manual
/// pan). The court search origin, independent of any stored profile
/// location, since panning the map changes what "near me" means.
final mapCenterProvider = StateProvider<LatLng?>((ref) => null);

final courtFiltersProvider = StateProvider<CourtFilters>(
  (ref) => const CourtFilters(),
);

final courtSearchProvider = FutureProvider.autoDispose<CourtSearchResult>((
  ref,
) {
  final center = ref.watch(mapCenterProvider);
  final filters = ref.watch(courtFiltersProvider);
  return ref.watch(courtsRepositoryProvider).search(center, filters);
});

final courtDetailProvider = FutureProvider.autoDispose
    .family<CourtProfile, String>((ref, courtId) {
      final center = ref.watch(mapCenterProvider);
      return ref
          .watch(courtsRepositoryProvider)
          .findOne(courtId, viewerLocation: center);
    });
