import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

/// Thrown for every failure mode `LocationService.getCurrentLocation` can
/// hit — location services off, permission denied, or (bare catch-all) any
/// platform failure — so callers can show `message` directly rather than
/// branching on exception type.
class LocationUnavailableException implements Exception {
  const LocationUnavailableException(this.message);
  final String message;
}

class ResolvedLocation {
  const ResolvedLocation({
    required this.latitude,
    required this.longitude,
    this.label,
  });

  final double latitude;
  final double longitude;

  /// Reverse-geocoded "City, Region" — null if the lookup returned nothing
  /// usable, in which case the caller falls back to raw coordinates.
  final String? label;
}

/// Extracted from onboarding's Location screen, which was the only place
/// this GPS→reverse-geocode sequence lived before Court Finder (Phase M9)
/// needed the identical logic for map-center/distance-sort.
class LocationService {
  Future<ResolvedLocation> getCurrentLocation() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw const LocationUnavailableException(
        'Location services are turned off.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw const LocationUnavailableException(
        'Location permission was denied.',
      );
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
      ),
    );

    String? label;
    try {
      final placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      final place = placemarks.isNotEmpty ? placemarks.first : null;
      final joined = [
        place?.locality,
        place?.administrativeArea,
      ].where((part) => part != null && part.isNotEmpty).join(', ');
      label = joined.isNotEmpty ? joined : null;
    } catch (_) {
      // Reverse geocoding is a nice-to-have here — the coordinates
      // themselves are still valid without a resolved label.
      label = null;
    }

    return ResolvedLocation(
      latitude: position.latitude,
      longitude: position.longitude,
      label: label,
    );
  }
}

final locationServiceProvider = Provider<LocationService>(
  (ref) => LocationService(),
);
