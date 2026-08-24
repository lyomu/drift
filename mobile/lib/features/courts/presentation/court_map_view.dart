import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/location/location_service.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';

/// Fallback map center used only when the device's location can't be
/// resolved (permission denied, services off) — the seed dataset's
/// approximate centroid, so a fresh install still opens on courts rather
/// than open ocean. Not a claim about where the viewer actually is.
const _fallbackCenter = LatLng(51.5074, -0.1278);

/// The Map segment of Court Finder Hub — `foundation/04-screen-inventory.md`
/// §A.6. OpenStreetMap tiles via `flutter_map` (no API key/billing).
///
/// No marker clustering this phase — the seed dataset is ~10 courts;
/// revisit once a real data source can return hundreds in one viewport.
class CourtMapView extends ConsumerStatefulWidget {
  const CourtMapView({super.key});

  @override
  ConsumerState<CourtMapView> createState() => _CourtMapViewState();
}

class _CourtMapViewState extends ConsumerState<CourtMapView> {
  final _mapController = MapController();
  Timer? _debounce;
  int _tileErrors = 0;

  @override
  void initState() {
    super.initState();
    if (ref.read(mapCenterProvider) == null) {
      _resolveInitialCenter();
    }
  }

  Future<void> _resolveInitialCenter() async {
    try {
      final resolved = await ref
          .read(locationServiceProvider)
          .getCurrentLocation();
      if (!mounted) return;
      ref.read(mapCenterProvider.notifier).state = LatLng(
        resolved.latitude,
        resolved.longitude,
      );
    } catch (_) {
      if (!mounted) return;
      ref.read(mapCenterProvider.notifier).state = _fallbackCenter;
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  void _onPositionChanged(MapCamera camera, bool hasGesture) {
    if (!hasGesture) return;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      ref.read(mapCenterProvider.notifier).state = camera.center;
    });
  }

  @override
  Widget build(BuildContext context) {
    final center = ref.watch(mapCenterProvider);
    final results = ref.watch(courtSearchProvider);
    final colors = Theme.of(context).extension<DriftColors>()!;

    if (center == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final courts = results.valueOrNull?.courts ?? const <CourtSummary>[];
    final markers = [
      for (final court in courts)
        if (court.latitude != null && court.longitude != null)
          Marker(
            point: LatLng(court.latitude!, court.longitude!),
            width: 40,
            height: 40,
            child: GestureDetector(
              onTap: () => _showCourtSummary(context, court),
              child: Icon(Icons.location_on, color: colors.primary, size: 36),
            ),
          ),
    ];

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 13,
            onPositionChanged: _onPositionChanged,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.drift.tennis.drift_tennis',
              errorTileCallback: (tile, error, stackTrace) {
                if (mounted) setState(() => _tileErrors++);
              },
            ),
            MarkerLayer(markers: markers),
          ],
        ),
        if (_tileErrors > 3)
          Positioned(
            top: DriftSpacing.s3,
            left: DriftSpacing.s4,
            right: DriftSpacing.s4,
            child: DriftCard(
              child: Text(
                'Map tiles unavailable — switch to List to browse results.',
                style: Theme.of(
                  context,
                ).extension<DriftTypography>()!.bodySmall,
              ),
            ),
          ),
      ],
    );
  }

  void _showCourtSummary(BuildContext context, CourtSummary court) {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) {
        final type = Theme.of(sheetContext).extension<DriftTypography>()!;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(DriftSpacing.s5),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(court.name, style: type.h3),
                if (court.distanceKm != null) ...[
                  const SizedBox(height: DriftSpacing.s1),
                  Text(
                    '${court.distanceKm!.toStringAsFixed(1)} km away',
                    style: type.bodySmall,
                  ),
                ],
                const SizedBox(height: DriftSpacing.s4),
                FilledButton(
                  onPressed: () {
                    Navigator.of(sheetContext).pop();
                    context.push('/discover/courts/${court.id}');
                  },
                  child: const Text('View Profile'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
