import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/drift_filter_sheet.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';

/// Court Filters — `foundation/03-user-journeys.md` §6: "distance, surface,
/// indoor/outdoor, lighting, public/private, amenities, booking
/// availability". Applying writes to [courtFiltersProvider], which
/// [courtSearchProvider] watches. Amenities has no controlled vocabulary
/// anywhere in the foundation docs, so it's left out of this sheet rather
/// than inventing one.
///
/// Uses the app-wide [DriftFilterSheet] (2026-10).
Future<void> showCourtFiltersSheet(BuildContext context, WidgetRef ref) {
  return showDriftFilterSheet<void>(
    context: context,
    builder: (_) => const _CourtFiltersSheet(),
  );
}

const _surfaceOptions = <(String, String)>[
  ('HARD', 'Hard'),
  ('CLAY', 'Clay'),
  ('GRASS', 'Grass'),
  ('ARTIFICIAL_GRASS', 'Artificial'),
];

class _CourtFiltersSheet extends ConsumerStatefulWidget {
  const _CourtFiltersSheet();

  @override
  ConsumerState<_CourtFiltersSheet> createState() => _CourtFiltersSheetState();
}

class _CourtFiltersSheetState extends ConsumerState<_CourtFiltersSheet> {
  late CourtFilters _draft = ref.read(courtFiltersProvider);

  int get _activeCount =>
      (_draft.maxDistanceKm != null ? 1 : 0) +
      _draft.surfaces.length +
      (_draft.indoor != null ? 1 : 0) +
      (_draft.lighting != null ? 1 : 0) +
      (_draft.isPublic != null ? 1 : 0) +
      (_draft.hasBookingInfo != null ? 1 : 0);

  void _apply() {
    ref.read(courtFiltersProvider.notifier).state = _draft;
    Navigator.of(context).pop();
  }

  /// The search text is owned by the court list's own field, not this sheet,
  /// so clearing the filters must not wipe what the player typed.
  void _clear() {
    setState(() => _draft = CourtFilters(search: _draft.search));
  }

  void _toggleSurface(String value) {
    setState(() {
      final surfaces = List<String>.from(_draft.surfaces);
      if (!surfaces.remove(value)) surfaces.add(value);
      _draft = _draft.copyWith(surfaces: surfaces);
    });
  }

  @override
  Widget build(BuildContext context) {
    return DriftFilterSheet(
      activeCount: _activeCount,
      onClear: _clear,
      onApply: _apply,
      sections: [
        DriftFilterSection(
          title: 'Distance',
          child: DriftFilterSegments<int?>(
            options: const [
              DriftFilterOption(value: 5, label: '<5 km'),
              DriftFilterOption(value: 10, label: '<10 km'),
              DriftFilterOption(value: 25, label: '<25 km'),
              DriftFilterOption(value: null, label: 'Any'),
            ],
            // "Any" is the absence of a distance filter, so it reads as
            // selected whenever none is set.
            isSelected: (km) => _draft.maxDistanceKm == km,
            onTap: (km) => setState(() {
              _draft = km == null
                  ? _draft.copyWith(clearDistance: true)
                  : _draft.copyWith(maxDistanceKm: km);
            }),
          ),
        ),
        DriftFilterSection(
          title: 'Surface',
          child: DriftFilterPills<String>(
            options: [
              for (final (value, label) in _surfaceOptions)
                DriftFilterOption(value: value, label: label),
            ],
            isSelected: _draft.surfaces.contains,
            onTap: _toggleSurface,
          ),
        ),
        DriftFilterSection(
          title: 'Indoor / Outdoor',
          child: DriftFilterSegments<bool?>(
            options: const [
              DriftFilterOption(value: true, label: 'Indoor'),
              DriftFilterOption(value: false, label: 'Outdoor'),
              DriftFilterOption(value: null, label: 'Either'),
            ],
            isSelected: (v) => _draft.indoor == v,
            onTap: (v) => setState(() {
              _draft = v == null
                  ? _draft.copyWith(clearIndoor: true)
                  : _draft.copyWith(indoor: v);
            }),
          ),
        ),
        DriftFilterSection(
          title: 'Access',
          child: DriftFilterSegments<bool?>(
            options: const [
              DriftFilterOption(value: true, label: 'Public'),
              DriftFilterOption(value: false, label: 'Private'),
              DriftFilterOption(value: null, label: 'Either'),
            ],
            isSelected: (v) => _draft.isPublic == v,
            onTap: (v) => setState(() {
              _draft = v == null
                  ? _draft.copyWith(clearIsPublic: true)
                  : _draft.copyWith(isPublic: v);
            }),
          ),
        ),
        DriftFilterSection(
          title: 'Features',
          child: DriftFilterPills<String>(
            options: const [
              DriftFilterOption(value: 'lighting', label: 'Floodlit'),
              DriftFilterOption(value: 'booking', label: 'Has booking info'),
            ],
            isSelected: (v) => v == 'lighting'
                ? _draft.lighting == true
                : _draft.hasBookingInfo == true,
            onTap: (v) => setState(() {
              if (v == 'lighting') {
                _draft = _draft.lighting == true
                    ? _draft.copyWith(clearLighting: true)
                    : _draft.copyWith(lighting: true);
              } else {
                _draft = _draft.hasBookingInfo == true
                    ? _draft.copyWith(clearHasBookingInfo: true)
                    : _draft.copyWith(hasBookingInfo: true);
              }
            }),
          ),
        ),
      ],
    );
  }
}
