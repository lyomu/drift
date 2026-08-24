import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../application/players_providers.dart';
import '../data/players_repository.dart';

/// Player Filters — `foundation/04-screen-inventory.md` §A.4. Applying
/// writes to [playerFiltersProvider], which the search provider watches.
Future<void> showPlayerFiltersSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const _PlayerFiltersSheet(),
  );
}

const _distanceOptions = [5, 10, 25, 50];
const _levelBands = [
  (label: 'Beginner (1.0-2.5)', min: 1.0, max: 2.5),
  (label: 'Foundational (2.5-4.0)', min: 2.5, max: 4.0),
  (label: 'Intermediate (4.0-5.5)', min: 4.0, max: 5.5),
  (label: 'Advanced (5.5-7.0)', min: 5.5, max: 7.0),
];
const _formatOptions = [
  (value: 'SINGLES', label: 'Singles'),
  (value: 'DOUBLES', label: 'Doubles'),
  (value: 'EITHER', label: 'Either'),
];
const _styleOptions = [
  (value: 'SOCIAL', label: 'Social'),
  (value: 'COMPETITIVE', label: 'Competitive'),
  (value: 'EITHER', label: 'Either'),
];

class _PlayerFiltersSheet extends ConsumerStatefulWidget {
  const _PlayerFiltersSheet();

  @override
  ConsumerState<_PlayerFiltersSheet> createState() =>
      _PlayerFiltersSheetState();
}

class _PlayerFiltersSheetState extends ConsumerState<_PlayerFiltersSheet> {
  late PlayerFilters _draft = ref.read(playerFiltersProvider);

  void _apply() {
    ref.read(playerFiltersProvider.notifier).state = _draft;
    Navigator.of(context).pop();
  }

  void _reset() {
    setState(() => _draft = const PlayerFilters());
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s6,
          0,
          DriftSpacing.s6,
          DriftSpacing.s6,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Filters', style: type.h2),
              const SizedBox(height: DriftSpacing.s5),

              _Section(
                title: 'Distance',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    for (final km in _distanceOptions)
                      DriftFilterChip(
                        label: 'Within $km km',
                        selected: _draft.maxDistanceKm == km,
                        onTap: () => setState(() {
                          _draft = _draft.maxDistanceKm == km
                              ? _draft.copyWith(clearDistance: true)
                              : _draft.copyWith(maxDistanceKm: km);
                        }),
                      ),
                  ],
                ),
              ),

              _Section(
                title: 'Level',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    for (final band in _levelBands)
                      DriftFilterChip(
                        label: band.label,
                        selected:
                            _draft.levelMin == band.min &&
                            _draft.levelMax == band.max,
                        onTap: () => setState(() {
                          final isSelected =
                              _draft.levelMin == band.min &&
                              _draft.levelMax == band.max;
                          _draft = isSelected
                              ? _draft.copyWith(clearLevel: true)
                              : _draft.copyWith(
                                  levelMin: band.min,
                                  levelMax: band.max,
                                );
                        }),
                      ),
                  ],
                ),
              ),

              _Section(
                title: 'Format',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    for (final option in _formatOptions)
                      DriftFilterChip(
                        label: option.label,
                        selected: _draft.formatPreference == option.value,
                        onTap: () => setState(() {
                          _draft = _draft.formatPreference == option.value
                              ? _draft.copyWith(clearFormat: true)
                              : _draft.copyWith(formatPreference: option.value);
                        }),
                      ),
                  ],
                ),
              ),

              _Section(
                title: 'Style',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    for (final option in _styleOptions)
                      DriftFilterChip(
                        label: option.label,
                        selected: _draft.stylePreference == option.value,
                        onTap: () => setState(() {
                          _draft = _draft.stylePreference == option.value
                              ? _draft.copyWith(clearStyle: true)
                              : _draft.copyWith(stylePreference: option.value);
                        }),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: DriftSpacing.s6),
              DriftButton(label: 'Apply', onPressed: _apply),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: DriftButton(
                  label: 'Reset',
                  variant: DriftButtonVariant.text,
                  onPressed: _reset,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: type.label),
          const SizedBox(height: DriftSpacing.s2),
          child,
        ],
      ),
    );
  }
}
