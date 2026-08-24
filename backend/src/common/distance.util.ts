const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * A latitude/longitude bounding box that fully contains `radiusKm` around
 * `origin`. Used to narrow the candidate set in SQL before computing exact
 * haversine distances in JS — there's no PostGIS in this stack. Revisit with
 * a real spatial index once the player table outgrows a bounding-box scan.
 */
export function boundingBox(
  origin: Coordinates,
  radiusKm: number,
): BoundingBox {
  const latDelta = radiusKm / 111.32;
  // Longitude degrees shrink toward the poles; guard against cos → 0.
  const cosLat = Math.max(Math.cos(toRadians(origin.latitude)), 0.01);
  const lonDelta = radiusKm / (111.32 * cosLat);

  return {
    minLatitude: origin.latitude - latDelta,
    maxLatitude: origin.latitude + latDelta,
    minLongitude: origin.longitude - lonDelta,
    maxLongitude: origin.longitude + lonDelta,
  };
}

/**
 * Coarse, human-readable distance — never a precise pin.
 * `foundation/06-domain-technical-architecture.md` §4 permits a band
 * ("~3km away"), not coordinates. Returns null when the other player has no
 * stored coordinates, so the UI can say "Distance unknown" rather than
 * fabricate a number.
 */
export function distanceBand(km: number | null): string | null {
  if (km === null) return null;
  if (km < 1) return 'Under 1 km away';
  if (km < 25) return `~${Math.round(km)} km away`;
  if (km < 50) return '25-50 km away';
  return '50+ km away';
}
