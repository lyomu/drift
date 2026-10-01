import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/network/media_url.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../courts/data/courts_repository.dart';
import 'home_empty_state.dart';

const _ink = Color(0xFF0F172A);
const _subdued = Color(0xFF64748B);
const _muted = Color(0xFF94A3B8);

/// Surface accents, so the badge over the photo matches the court's surface.
/// Falls back to the brand colour for anything unrecognised.
const _surfaceAccents = <String, Color>{
  'Hard': Color(0xFF1A7AFF),
  'Clay': Color(0xFFF97316),
  'Grass': Color(0xFF22C55E),
  'Artificial Grass': Color(0xFF14B8A6),
};

/// "Courts near you" — a short list of nearby courts (redesign 2026-10: photo
/// thumbnail, surface badge, court count and hours), or a prompt to browse
/// when the feed surfaced none (usually because location isn't set).
///
/// `photoUrl`, `courtCount` and `openingHoursNote` were added to the court
/// summary payload for this card; each line is omitted when the API did not
/// send it, so a court with no photo shows the placeholder tile rather than a
/// stock image standing in for a venue nobody has photographed.
class CourtsNearYouSection extends StatelessWidget {
  const CourtsNearYouSection({super.key, required this.courts});

  final List<CourtSummary> courts;

  @override
  Widget build(BuildContext context) {
    if (courts.isEmpty) {
      return HomeEmptyState(
        icon: Icons.place_outlined,
        message: 'No courts nearby yet.',
        actionLabel: 'Browse',
        onAction: () => context.go('/home?tab=discover&discover=courts'),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < courts.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _CourtCard(court: courts[i]),
        ],
      ],
    );
  }
}

class _CourtCard extends StatelessWidget {
  const _CourtCard({required this.court});

  final CourtSummary court;

  /// The first surface group's label ("6 Hard" -> "Hard").
  String? get _surfaceLabel {
    if (court.surfaces.isEmpty) return null;
    final parts = court.surfaces.first.split(' ');
    return parts.length > 1 ? parts.sublist(1).join(' ') : parts.first;
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final surface = _surfaceLabel;
    final accent = _surfaceAccents[surface] ?? colors.primary;

    final meta = [
      if (court.distanceKm != null)
        '${court.distanceKm!.toStringAsFixed(1)} km',
      if (court.clubName != null) court.clubName!,
    ].join(' · ');

    final footer = [
      if (court.courtCount != null && court.courtCount! > 0)
        '${court.courtCount} ${court.courtCount == 1 ? 'court' : 'courts'}',
      if (court.openingHoursNote != null) court.openingHoursNote!,
    ].join(' · ');

    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/discover/courts/${court.id}'),
        child: Container(
          height: 80,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: Color.alphaBlend(
                colors.primary.withValues(alpha: 0.18),
                colors.surface,
              ),
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              _Thumbnail(
                photoUrl: court.photoUrl,
                surface: surface,
                accent: accent,
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            court.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              height: 1.2,
                              color: _ink,
                            ),
                          ),
                          if (meta.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                const Icon(
                                  Icons.location_on,
                                  size: 11,
                                  color: _muted,
                                ),
                                const SizedBox(width: 3),
                                Expanded(
                                  child: Text(
                                    meta,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      height: 1.2,
                                      color: _subdued,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              footer,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 10,
                                height: 1.2,
                                color: _subdued,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          _BookButton(court: court, accent: accent),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Thumbnail extends StatelessWidget {
  const _Thumbnail({
    required this.photoUrl,
    required this.surface,
    required this.accent,
  });

  final String? photoUrl;
  final String? surface;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final url = driftMediaUrl(photoUrl);

    return SizedBox(
      width: 100,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (url == null)
            ColoredBox(
              color: accent.withValues(alpha: 0.1),
              child: Icon(
                Icons.sports_tennis_rounded,
                size: 26,
                color: accent.withValues(alpha: 0.5),
              ),
            )
          else
            Image.network(
              url,
              fit: BoxFit.cover,
              // A dead URL must not take the row down with it.
              errorBuilder: (_, _, _) => ColoredBox(
                color: accent.withValues(alpha: 0.1),
                child: Icon(
                  Icons.sports_tennis_rounded,
                  size: 26,
                  color: accent.withValues(alpha: 0.5),
                ),
              ),
            ),
          if (surface != null)
            Positioned(
              left: 5,
              bottom: 5,
              child: Container(
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(999),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 7,
                  vertical: 2,
                ),
                child: Text(
                  surface!,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Opens the court's profile, where the real booking route lives — the summary
/// does not carry a booking URL, and only `EXTERNAL_LINK` courts have one.
class _BookButton extends StatelessWidget {
  const _BookButton({required this.court, required this.accent});

  final CourtSummary court;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: accent,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/discover/courts/${court.id}'),
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          child: Text(
            'Book',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              height: 1.2,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
