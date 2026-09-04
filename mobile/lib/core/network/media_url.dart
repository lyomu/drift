import 'dio_client.dart';

/// Resolves a stored media path to something [NetworkImage] can fetch.
///
/// The backend stores an uploaded profile photo as a *relative* path
/// (`/media/user-photos/<assetId>?v=…`, see `UsersService.USER_PHOTO_PATH`)
/// so the row survives an API origin change — staging, production and a dev
/// machine all serve the same asset from their own host. Absolute URLs are
/// left alone: onboarding can store a social provider's photo URL, and club
/// and court photos are already absolute.
///
/// Returns null for null/empty input so callers can fall back to initials.
String? driftMediaUrl(String? path) {
  if (path == null || path.isEmpty) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  final base = apiBaseUrl();
  final separator = path.startsWith('/') ? '' : '/';
  return '$base$separator$path';
}
