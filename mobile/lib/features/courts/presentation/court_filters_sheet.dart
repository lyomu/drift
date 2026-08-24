import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';

/// Court Filters — `foundation/03-user-journeys.md` §6: "distance, surface,
/// indoor/outdoor, lighting, public/private, amenities, booking
/// availability". Applying writes to [courtFiltersProvider], which
/// [courtSearchProvider] watches. Amenities has no controlled vocabulary
/// anywhere in the foundation docs, so it's left out of this sheet rather
/// than inventing one.
Future<void> showCourtFiltersSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const _CourtFiltersSheet(),
  );
}

const _distanceOptions = [5, 10, 25, 50];
const _surfaceOptions = [
  (value: 'HARD', label: 'Hard'),
  (value: 'CLAY', label: 'Clay'),
  (value: 'GRASS', label: 'Grass'),
  (value: 'ARTIFICIAL_GRASS', label: 'Artificial Grass'),
];

class _CourtFiltersSheet extends ConsumerStatefulWidget {
  const _CourtFiltersSheet();

  @override
  ConsumerState<_CourtFiltersSheet> createState() => _CourtFiltersSheetState();
}

class _CourtFiltersSheetState extends ConsumerState<_CourtFiltersSheet> {
  late CourtFilters _draft = ref.read(courtFiltersProvider);

  void _apply() {
    ref.read(courtFiltersProvider.notifier).state = _draft;
    Navigator.of(context).pop();
  }

  void _reset() {
    setState(() => _draft = const CourtFilters());
  }

  void _toggleSurface(String value) {
    setState(() {
      final surfaces = List<String>.from(_draft.surfaces);
      if (surfaces.contains(value)) {
        surfaces.remove(value);
      } else {
        surfaces.add(value);
      }
      _draft = _draft.copyWith(surfaces: surfaces);
    });
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
                title: 'Surface',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    for (final option in _surfaceOptions)
                      DriftFilterChip(
                        label: option.label,
                        selected: _draft.surfaces.contains(option.value),
                        onTap: () => _toggleSurface(option.value),
                      ),
                  ],
                ),
              ),

              _Section(
                title: 'Indoor / Outdoor',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    DriftFilterChip(
                      label: 'Indoor',
                      selected: _draft.indoor == true,
                      onTap: () => setState(() {
                        _draft = _draft.indoor == true
                            ? _draft.copyWith(clearIndoor: true)
                            : _draft.copyWith(indoor: true);
                      }),
                    ),
                    DriftFilterChip(
                      label: 'Outdoor',
                      selected: _draft.indoor == false,
                      onTap: () => setState(() {
                        _draft = _draft.indoor == false
                            ? _draft.copyWith(clearIndoor: true)
                            : _draft.copyWith(indoor: false);
                      }),
                    ),
                  ],
                ),
              ),

              _Section(
                title: 'Lighting',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    DriftFilterChip(
                      label: 'Floodlit',
                      selected: _draft.lighting == true,
                      onTap: () => setState(() {
                        _draft = _draft.lighting == true
                            ? _draft.copyWith(clearLighting: true)
                            : _draft.copyWith(lighting: true);
                      }),
                    ),
                  ],
                ),
              ),

              _Section(
                title: 'Access',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    DriftFilterChip(
                      label: 'Public',
                      selected: _draft.isPublic == true,
                      onTap: () => setState(() {
                        _draft = _draft.isPublic == true
                            ? _draft.copyWith(clearIsPublic: true)
                            : _draft.copyWith(isPublic: true);
                      }),
                    ),
                    DriftFilterChip(
                      label: 'Private',
                      selected: _draft.isPublic == false,
                      onTap: () => setState(() {
                        _draft = _draft.isPublic == false
                            ? _draft.copyWith(clearIsPublic: true)
                            : _draft.copyWith(isPublic: false);
                      }),
                    ),
                  ],
                ),
              ),

              _Section(
                title: 'Booking',
                child: Wrap(
                  spacing: DriftSpacing.s2,
                  runSpacing: DriftSpacing.s2,
                  children: [
                    DriftFilterChip(
                      label: 'Has booking info',
                      selected: _draft.hasBookingInfo == true,
                      onTap: () => setState(() {
                        _draft = _draft.hasBookingInfo == true
                            ? _draft.copyWith(clearHasBookingInfo: true)
                            : _draft.copyWith(hasBookingInfo: true);
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
