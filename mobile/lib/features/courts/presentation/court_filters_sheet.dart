import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/drift_filter_sheet.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/enum_labels.dart';

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

const _surfaceOptions = ['HARD', 'CLAY', 'GRASS', 'ARTIFICIAL_GRASS'];

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
          title: context.l10n.filterDistance,
          child: DriftFilterSegments<int?>(
            options: [
              DriftFilterOption(value: 5, label: '<5 km'),
              DriftFilterOption(value: 10, label: '<10 km'),
              DriftFilterOption(value: 25, label: '<25 km'),
              DriftFilterOption(value: null, label: context.l10n.filterAny),
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
          title: context.l10n.filterSurface,
          child: DriftFilterPills<String>(
            options: [
              for (final value in _surfaceOptions)
                DriftFilterOption(
                  value: value,
                  label: surfaceLabel(context.l10n, value),
                ),
            ],
            isSelected: _draft.surfaces.contains,
            onTap: _toggleSurface,
          ),
        ),
        DriftFilterSection(
          title: context.l10n.filterIndoorOutdoor,
          child: DriftFilterSegments<bool?>(
            options: [
              DriftFilterOption(value: true, label: context.l10n.courtIndoor),
              DriftFilterOption(value: false, label: context.l10n.courtOutdoor),
              DriftFilterOption(value: null, label: context.l10n.optEither),
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
          title: context.l10n.courtAccess,
          child: DriftFilterSegments<bool?>(
            options: [
              DriftFilterOption(value: true, label: context.l10n.courtPublic),
              DriftFilterOption(value: false, label: context.l10n.courtPrivate),
              DriftFilterOption(value: null, label: context.l10n.optEither),
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
          title: context.l10n.filterFeatures,
          child: DriftFilterPills<String>(
            options: [
              DriftFilterOption(
                value: 'lighting',
                label: context.l10n.filterFloodlit,
              ),
              DriftFilterOption(
                value: 'booking',
                label: context.l10n.filterHasBooking,
              ),
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
