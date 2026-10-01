import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/drift_filter_sheet.dart';
import '../application/players_providers.dart';
import '../data/players_repository.dart';

/// Player Filters — `foundation/04-screen-inventory.md` §A.4. Applying
/// writes to [playerFiltersProvider], which the search provider watches.
Future<void> showPlayerFiltersSheet(BuildContext context, WidgetRef ref) {
  return showDriftFilterSheet<void>(
    context: context,
    builder: (_) => const _PlayerFiltersSheet(),
  );
}

/// The level bands, matching `labelForLevel` on the server exactly — there is
/// no fifth "Elite" band, so the sheet does not offer one.
const _levelBands = <({String label, double min, double max})>[
  (label: 'Beginner', min: 1.0, max: 2.5),
  (label: 'Foundational', min: 2.5, max: 4.0),
  (label: 'Intermediate', min: 4.0, max: 5.5),
  (label: 'Advanced', min: 5.5, max: 7.0),
];

const _timeBlocks = <(String, String)>[
  ('MORNING', 'Morning'),
  ('AFTERNOON', 'Afternoon'),
  ('EVENING', 'Evening'),
];
const _formatOptions = <(String, String)>[
  ('SINGLES', 'Singles'),
  ('DOUBLES', 'Doubles'),
  ('EITHER', 'Either'),
];
const _styleOptions = <(String, String)>[
  ('SOCIAL', 'Social'),
  ('COMPETITIVE', 'Competitive'),
  ('EITHER', 'Either'),
];

class _PlayerFiltersSheet extends ConsumerStatefulWidget {
  const _PlayerFiltersSheet();

  @override
  ConsumerState<_PlayerFiltersSheet> createState() =>
      _PlayerFiltersSheetState();
}

class _PlayerFiltersSheetState extends ConsumerState<_PlayerFiltersSheet> {
  late PlayerFilters _draft = ref.read(playerFiltersProvider);

  /// Indices into [_levelBands]. Held separately from [_draft] because the
  /// API takes a single `levelMin`/`levelMax` range, which cannot record
  /// *which* bands were tapped — selecting Beginner and Intermediate sends
  /// 1.0..5.5, and reading that back could not tell it from all four bands.
  /// This set is the selection; the range is what it compiles to.
  late Set<int> _levels = _bandsWithin(_draft);

  /// Best-effort reconstruction when the sheet reopens: every band wholly
  /// inside the stored range. Exact whenever the range came from this sheet.
  static Set<int> _bandsWithin(PlayerFilters filters) {
    final min = filters.levelMin;
    final max = filters.levelMax;
    if (min == null || max == null) return {};
    return {
      for (var i = 0; i < _levelBands.length; i++)
        if (_levelBands[i].min >= min && _levelBands[i].max <= max) i,
    };
  }

  int get _activeCount =>
      _levels.length +
      (_draft.maxDistanceKm != null ? 1 : 0) +
      (_draft.timeBlock != null ? 1 : 0) +
      (_draft.formatPreference != null ? 1 : 0) +
      (_draft.stylePreference != null ? 1 : 0);

  void _apply() {
    // The selection compiles to the range that spans it. A non-contiguous
    // pick (Beginner + Advanced) therefore also returns the bands between,
    // because the endpoint has no way to express a gap.
    final committed = _levels.isEmpty
        ? _draft.copyWith(clearLevel: true)
        : _draft.copyWith(
            levelMin: _levels
                .map((i) => _levelBands[i].min)
                .reduce((a, b) => a < b ? a : b),
            levelMax: _levels
                .map((i) => _levelBands[i].max)
                .reduce((a, b) => a > b ? a : b),
          );

    ref.read(playerFiltersProvider.notifier).state = committed;
    Navigator.of(context).pop();
  }

  void _clear() {
    setState(() {
      _draft = const PlayerFilters();
      _levels = {};
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
          title: 'Level',
          child: DriftFilterPills<int>(
            options: [
              for (var i = 0; i < _levelBands.length; i++)
                DriftFilterOption(value: i, label: _levelBands[i].label),
            ],
            isSelected: _levels.contains,
            onTap: (i) => setState(() {
              if (!_levels.remove(i)) _levels.add(i);
            }),
          ),
        ),
        DriftFilterSection(
          title: 'Distance',
          child: DriftFilterSegments<int?>(
            options: const [
              DriftFilterOption(value: 5, label: '<5 km'),
              DriftFilterOption(value: 10, label: '<10 km'),
              DriftFilterOption(value: 20, label: '<20 km'),
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
          title: 'Availability',
          child: DriftFilterPills<String>(
            options: [
              for (final (value, label) in _timeBlocks)
                DriftFilterOption(value: value, label: label),
            ],
            isSelected: (v) => _draft.timeBlock == v,
            onTap: (v) => setState(() {
              _draft = _draft.timeBlock == v
                  ? _draft.copyWith(clearTimeBlock: true)
                  : _draft.copyWith(timeBlock: v);
            }),
          ),
        ),
        DriftFilterSection(
          title: 'Format',
          child: DriftFilterSegments<String>(
            options: [
              for (final (value, label) in _formatOptions)
                DriftFilterOption(value: value, label: label),
            ],
            isSelected: (v) => _draft.formatPreference == v,
            onTap: (v) => setState(() {
              _draft = _draft.formatPreference == v
                  ? _draft.copyWith(clearFormat: true)
                  : _draft.copyWith(formatPreference: v);
            }),
          ),
        ),
        DriftFilterSection(
          title: 'Style',
          child: DriftFilterSegments<String>(
            options: [
              for (final (value, label) in _styleOptions)
                DriftFilterOption(value: value, label: label),
            ],
            isSelected: (v) => _draft.stylePreference == v,
            onTap: (v) => setState(() {
              _draft = _draft.stylePreference == v
                  ? _draft.copyWith(clearStyle: true)
                  : _draft.copyWith(stylePreference: v);
            }),
          ),
        ),
      ],
    );
  }
}
