import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/l10n/enum_labels.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../auth/data/auth_repository.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';
import 'booking_options_sheet.dart';
import 'report_court_sheet.dart';

/// Court Profile — `foundation/04-screen-inventory.md` §A.6, re-skinned from
/// the 2026-11 Figma Make redesign (photo hero, floating venue card, "Good
/// to know" tiles, mini map, sticky booking bar). Every field with no
/// verified source renders as "Unknown", never fabricated
/// (`foundation/06-domain-technical-architecture.md` §2).
class CourtProfileScreen extends ConsumerWidget {
  const CourtProfileScreen({super.key, required this.courtId});

  final String courtId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final profile = ref.watch(courtDetailProvider(courtId));

    return Scaffold(
      backgroundColor: colors.background,
      body: switch (profile) {
        AsyncData(:final value) => _ProfileBody(profile: value),
        AsyncError() => _Fallback(child: Text(context.l10n.courtUnavailable)),
        _ => const _Fallback(child: CircularProgressIndicator()),
      },
    );
  }
}

/// Loading / error state: back button plus a centred message.
class _Fallback extends StatelessWidget {
  const _Fallback({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Stack(
        children: [
          Center(child: child),
          Positioned(
            top: DriftSpacing.s2,
            left: DriftSpacing.s4,
            child: _GlassButton(
              icon: Icons.chevron_left_rounded,
              tooltip: context.l10n.commonBack,
              onTap: () => context.pop(),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileBody extends ConsumerStatefulWidget {
  const _ProfileBody({required this.profile});

  final CourtProfile profile;

  @override
  ConsumerState<_ProfileBody> createState() => _ProfileBodyState();
}

class _ProfileBodyState extends ConsumerState<_ProfileBody> {
  /// Optimistic favorite state while a toggle is in flight / until the
  /// profile refetches.
  bool? _favoriteOverride;
  bool _favoriteBusy = false;

  CourtProfile get profile => widget.profile;
  bool get _isFavorite => _favoriteOverride ?? profile.isFavorite;

  Future<void> _toggleFavorite() async {
    if (_favoriteBusy) return;
    final next = !_isFavorite;
    setState(() {
      _favoriteOverride = next;
      _favoriteBusy = true;
    });
    try {
      await ref
          .read(courtsRepositoryProvider)
          .setFavorite(profile.summary.id, favorite: next);
    } on AuthException {
      if (!mounted) return;
      setState(() => _favoriteOverride = !next);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(context.l10n.courtFavoriteFailed)));
    } finally {
      if (mounted) setState(() => _favoriteBusy = false);
    }
  }

  Future<void> _share() async {
    final summary = profile.summary;
    final l = context.l10n;
    final url = courtDirectionsUrl(profile);
    final text = [
      summary.address == null
          ? summary.name
          : l.courtShareText(summary.name, summary.address!),
      ?url?.toString(),
    ].join('\n');
    await SharePlus.instance.share(
      ShareParams(text: text, subject: summary.name),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final l = context.l10n;
    final summary = profile.summary;
    final topInset = MediaQuery.paddingOf(context).top;
    const heroHeight = 280.0;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      // The hero is a photo (or dark gradient) in both themes.
      value: SystemUiOverlayStyle.light,
      child: Stack(
        children: [
          RefreshIndicator(
            edgeOffset: topInset,
            onRefresh: () async {
              ref.invalidate(courtDetailProvider(summary.id));
              await ref.read(courtDetailProvider(summary.id).future);
              if (mounted) setState(() => _favoriteOverride = null);
            },
            child: ListView(
              padding: EdgeInsets.only(
                bottom: 120 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                Stack(
                  children: [
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      height: heroHeight + topInset,
                      child: _Hero(profile: profile),
                    ),
                    Positioned(
                      top: topInset + DriftSpacing.s2,
                      left: DriftSpacing.s4,
                      right: DriftSpacing.s4,
                      child: _TopBar(
                        isFavorite: _isFavorite,
                        onFavorite: _toggleFavorite,
                        onShare: _share,
                        onReport: () =>
                            showReportCourtSheet(context, ref, summary.id),
                      ),
                    ),
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        DriftSpacing.s4,
                        topInset + heroHeight - 56,
                        DriftSpacing.s4,
                        0,
                      ),
                      child: _VenueCard(profile: profile),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: DriftSpacing.s4,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: DriftSpacing.s6),
                      _GoodToKnow(profile: profile),
                      if (profile.club != null) ...[
                        const SizedBox(height: DriftSpacing.s3),
                        _ClubRow(club: profile.club!),
                      ],
                      const SizedBox(height: DriftSpacing.s6),
                      _FindTheCourt(profile: profile),
                      if (summary.verificationStatus ==
                          ListingVerificationStatus.verified) ...[
                        const SizedBox(height: DriftSpacing.s6),
                        Text(
                          l.courtInfoVerifiedFooter.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: colors.textSecondary.withValues(alpha: 0.6),
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.6,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: DriftSpacing.s3,
            right: DriftSpacing.s3,
            bottom: MediaQuery.paddingOf(context).bottom + DriftSpacing.s3,
            child: _BookingBar(profile: profile),
          ),
        ],
      ),
    );
  }
}

/// The curator's maps link if they set one, otherwise a lat/long directions
/// URL, otherwise null (no directions available).
Uri? courtDirectionsUrl(CourtProfile profile) {
  final maps = profile.mapsUrl?.trim();
  if (maps != null && maps.isNotEmpty) return Uri.tryParse(maps);
  final lat = profile.summary.latitude;
  final lng = profile.summary.longitude;
  if (lat == null || lng == null) return null;
  return Uri.parse(
    'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────

class _Hero extends StatefulWidget {
  const _Hero({required this.profile});

  final CourtProfile profile;

  @override
  State<_Hero> createState() => _HeroState();
}

class _HeroState extends State<_Hero> {
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final photos = widget.profile.photoUrls;
    final fallback = _HeroFallback(color: colors.primary);

    return Stack(
      fit: StackFit.expand,
      children: [
        if (photos.isEmpty)
          fallback
        else
          PageView.builder(
            itemCount: photos.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (context, i) => GestureDetector(
              onTap: () => context.push(
                '/discover/courts/${widget.profile.summary.id}/photos',
                extra: photos,
              ),
              child: Image.network(
                photos[i],
                fit: BoxFit.cover,
                alignment: const Alignment(0, 0.25),
                errorBuilder: (_, _, _) => fallback,
              ),
            ),
          ),
        // Top darkening for the buttons, bottom fade into the page.
        IgnorePointer(
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: const [0, 0.38, 1],
                colors: [
                  Colors.black.withValues(alpha: 0.55),
                  Colors.transparent,
                  colors.background.withValues(alpha: 0.95),
                ],
              ),
            ),
          ),
        ),
        if (photos.length > 1)
          Positioned(
            right: 18,
            bottom: 72,
            child: _GlassPill(
              label: context.l10n.courtPhotoCount(_page + 1, photos.length),
            ),
          ),
      ],
    );
  }
}

/// No-photo hero: deep brand gradient with faint court lines.
class _HeroFallback extends StatelessWidget {
  const _HeroFallback({required this.color});

  final Color color;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(color, Colors.black, 0.45)!,
            Color.lerp(color, Colors.black, 0.75)!,
          ],
        ),
      ),
      child: CustomPaint(painter: _CourtLinesPainter()),
    );
  }
}

class _CourtLinesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = Colors.white.withValues(alpha: 0.14)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final w = size.width;
    final h = size.height;
    final court = Rect.fromLTRB(w * 0.12, h * 0.18, w * 0.88, h * 1.1);
    canvas.drawRect(court, p);
    canvas.drawLine(
      Offset(court.left, court.center.dy),
      Offset(court.right, court.center.dy),
      p..strokeWidth = 2.2,
    );
    p.strokeWidth = 1.2;
    canvas.drawLine(
      Offset(court.center.dx, court.top + court.height * 0.22),
      Offset(court.center.dx, court.bottom - court.height * 0.22),
      p,
    );
    for (final f in [0.22, 0.78]) {
      final y = court.top + court.height * f;
      canvas.drawLine(Offset(court.left, y), Offset(court.right, y), p);
    }
  }

  @override
  bool shouldRepaint(_CourtLinesPainter old) => false;
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.isFavorite,
    required this.onFavorite,
    required this.onShare,
    required this.onReport,
  });

  final bool isFavorite;
  final VoidCallback onFavorite;
  final VoidCallback onShare;
  final VoidCallback onReport;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Row(
      children: [
        _GlassButton(
          icon: Icons.chevron_left_rounded,
          tooltip: l.commonBack,
          onTap: () => context.pop(),
        ),
        Expanded(
          child: Text(
            l.matchCourt,
            textAlign: TextAlign.center,
            style: type.title.copyWith(color: Colors.white),
          ),
        ),
        _GlassButton(
          icon: isFavorite
              ? Icons.favorite_rounded
              : Icons.favorite_border_rounded,
          tooltip: isFavorite ? l.courtRemoveFavorite : l.courtAddFavorite,
          active: isFavorite,
          onTap: onFavorite,
        ),
        const SizedBox(width: DriftSpacing.s2),
        _GlassButton(
          icon: Icons.share_outlined,
          tooltip: l.courtShare,
          onTap: onShare,
        ),
        const SizedBox(width: DriftSpacing.s2),
        _GlassButton(
          icon: Icons.flag_outlined,
          tooltip: l.courtReportIssue,
          onTap: onReport,
        ),
      ],
    );
  }
}

/// Round translucent button that sits over the hero photo. (The opaque
/// [DriftHeaderSquareButton] is for plain backgrounds.)
class _GlassButton extends StatelessWidget {
  const _GlassButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Tooltip(
      message: tooltip,
      child: Material(
        color: active
            ? Color.lerp(
                colors.primary,
                Colors.black,
                0.55,
              )!.withValues(alpha: 0.8)
            : const Color(0xFF07121F).withValues(alpha: 0.55),
        shape: CircleBorder(
          side: BorderSide(
            color: active
                ? colors.primary.withValues(alpha: 0.6)
                : Colors.white.withValues(alpha: 0.18),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            width: 42,
            height: 42,
            child: Icon(
              icon,
              size: 20,
              color: active ? colors.primary : Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassPill extends StatelessWidget {
  const _GlassPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Venue card ────────────────────────────────────────────────────────────

class _VenueCard extends StatelessWidget {
  const _VenueCard({required this.profile});

  final CourtProfile profile;

  List<String> _tags(AppLocalizations l) {
    final s = profile.summary;
    final tags = <String>[];
    final count =
        s.courtCount ??
        (profile.courtGroups.isEmpty
            ? null
            : profile.courtGroups.fold<int>(0, (n, g) => n + g.count));
    if (count != null && count > 0) {
      tags.add(
        s.surfaces.length == 1
            ? l.courtCourtsOfSurface(
                count,
                surfaceLabel(l, s.surfaces.first).toLowerCase(),
              )
            : l.courtCourtCount(count),
      );
    } else {
      tags.addAll(s.surfaces.map((x) => surfaceLabel(l, x)));
    }
    if (s.indoorAvailable) tags.add(l.courtIndoor);
    if (s.outdoorAvailable) tags.add(l.courtOutdoor);
    switch (profile.isPublic) {
      case true:
        tags.add(l.courtPublic);
      case false:
        tags.add(l.courtPrivate);
      case null:
        break;
    }
    return tags;
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final summary = profile.summary;
    final radius = BorderRadius.circular(24);
    final status = summary.verificationStatus;

    return Container(
      decoration: BoxDecoration(
        borderRadius: radius,
        border: Border.all(color: colors.primary.withValues(alpha: 0.2)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.alphaBlend(
              colors.primary.withValues(alpha: 0.16),
              colors.surface,
            ),
            colors.surface,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.22),
            blurRadius: 40,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: Stack(
          children: [
            Positioned(
              right: -60,
              top: 18,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: colors.primary.withValues(alpha: 0.14),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (status != ListingVerificationStatus.unverified) ...[
                    Row(
                      children: [
                        Icon(
                          status == ListingVerificationStatus.verified
                              ? Icons.verified_outlined
                              : Icons.hourglass_empty_rounded,
                          size: 17,
                          color: status == ListingVerificationStatus.verified
                              ? colors.success
                              : colors.warning,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          status == ListingVerificationStatus.verified
                              ? l.courtVerifiedVenue
                              : status.label,
                          style: type.label.copyWith(
                            color: status == ListingVerificationStatus.verified
                                ? colors.success
                                : colors.warning,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: DriftSpacing.s2),
                  ],
                  Text(
                    summary.name,
                    style: type.h1.copyWith(height: 1.1, letterSpacing: -0.6),
                  ),
                  const SizedBox(height: DriftSpacing.s3),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 1),
                        child: Icon(
                          Icons.location_on_outlined,
                          size: 18,
                          color: colors.textSecondary,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          summary.address ?? l.courtLocationUnknown,
                          style: type.body.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (_tags(l).isNotEmpty) ...[
                    const SizedBox(height: DriftSpacing.s4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final tag in _tags(l)) _TagPill(label: tag),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TagPill extends StatelessWidget {
  const _TagPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: colors.background.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: colors.border),
      ),
      child: Text(
        label,
        style: type.caption.copyWith(
          color: colors.textPrimary.withValues(alpha: 0.9),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Good to know ──────────────────────────────────────────────────────────

/// `true`/`false` when [note] is a plain "HH:MM–HH:MM" range, else null
/// (free-text hours are shown but never interpreted).
bool? _isOpenNow(String? note, DateTime now) {
  if (note == null) return null;
  final m = RegExp(
    r'^\s*(\d{1,2})[:.h](\d{2})\s*[-–—]\s*(\d{1,2})[:.h](\d{2})\s*$',
  ).firstMatch(note);
  if (m == null) return null;
  int mins(int h, int min) => h * 60 + min;
  final open = mins(int.parse(m[1]!), int.parse(m[2]!));
  final close = mins(int.parse(m[3]!), int.parse(m[4]!));
  final t = mins(now.hour, now.minute);
  return close > open ? t >= open && t < close : t >= open || t < close;
}

class _GoodToKnow extends StatelessWidget {
  const _GoodToKnow({required this.profile});

  final CourtProfile profile;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final summary = profile.summary;
    final open = _isOpenNow(profile.openingHoursNote, DateTime.now());

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Row(
            children: [
              Expanded(child: Text(l.courtGoodToKnow, style: type.h3)),
              if (open != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: (open ? colors.success : colors.textSecondary)
                        .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    open ? l.courtOpenNow : l.courtClosedNow,
                    style: type.caption.copyWith(
                      color: open ? colors.success : colors.textSecondary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s3),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: _FacilityTile(
                  icon: Icons.schedule_rounded,
                  label: l.courtHours,
                  value: profile.openingHoursNote ?? l.commonUnknown,
                ),
              ),
              const SizedBox(width: DriftSpacing.s2),
              Expanded(
                child: _FacilityTile(
                  icon: Icons.grid_on_rounded,
                  label: l.courtSurface,
                  value: summary.surfaces.isEmpty
                      ? l.commonUnknown
                      : summary.surfaces
                            .map((s) => surfaceLabel(l, s))
                            .join(', '),
                ),
              ),
              const SizedBox(width: DriftSpacing.s2),
              Expanded(
                child: _FacilityTile(
                  icon: Icons.groups_outlined,
                  label: l.courtAccess,
                  value: switch (profile.isPublic) {
                    true => l.courtPublic,
                    false => l.courtPrivate,
                    null => l.commonUnknown,
                  },
                ),
              ),
            ],
          ),
        ),
        if (profile.amenities.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s3),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [for (final a in profile.amenities) _TagPill(label: a)],
          ),
        ],
      ],
    );
  }
}

class _FacilityTile extends StatelessWidget {
  const _FacilityTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.border.withValues(alpha: 0.7)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: colors.primary.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 21, color: colors.primary),
          ),
          const SizedBox(height: DriftSpacing.s3),
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: type.caption.copyWith(
              color: colors.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: type.label.copyWith(color: colors.textPrimary),
          ),
        ],
      ),
    );
  }
}

class _ClubRow extends StatelessWidget {
  const _ClubRow({required this.club});

  final ClubRef club;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final radius = BorderRadius.circular(18);
    return Material(
      color: colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(color: colors.border.withValues(alpha: 0.7)),
      ),
      child: InkWell(
        borderRadius: radius,
        onTap: () => context.push('/discover/clubs/${club.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: colors.primary.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.groups_outlined,
                  size: 21,
                  color: colors.primary,
                ),
              ),
              const SizedBox(width: DriftSpacing.s3),
              Expanded(child: Text(club.name, style: type.title)),
              Icon(Icons.chevron_right_rounded, color: colors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Find the court ────────────────────────────────────────────────────────

class _FindTheCourt extends StatelessWidget {
  const _FindTheCourt({required this.profile});

  final CourtProfile profile;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final summary = profile.summary;
    final url = courtDirectionsUrl(profile);
    final lat = summary.latitude;
    final lng = summary.longitude;
    final subtitle = summary.distanceKm != null
        ? l.commonKmAway(summary.distanceKm!.toStringAsFixed(1))
        : (summary.address ?? l.courtLocationUnknown);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l.courtLocationEyebrow.toUpperCase(),
                style: type.caption.copyWith(
                  color: colors.textSecondary.withValues(alpha: 0.8),
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.8,
                ),
              ),
              const SizedBox(height: 4),
              Text(l.courtFindTheCourt, style: type.h3),
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s3),
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: colors.border.withValues(alpha: 0.7)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: 110,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (lat != null && lng != null)
                      _MiniMap(center: LatLng(lat, lng))
                    else
                      CustomPaint(
                        painter: _RoadsPainter(
                          base: colors.surfaceRaised,
                          road: colors.border,
                        ),
                      ),
                    Center(child: _MapPin()),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            summary.clubName ?? summary.name,
                            style: type.subtitle.copyWith(
                              fontWeight: FontWeight.w700,
                              color: colors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            style: type.caption.copyWith(
                              color: colors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Tooltip(
                      message: l.courtGetDirections,
                      child: Material(
                        color: colors.primary.withValues(
                          alpha: url == null ? 0.06 : 0.14,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: url == null
                              ? null
                              : () => launchUrl(
                                  url,
                                  mode: LaunchMode.externalApplication,
                                ),
                          child: SizedBox(
                            width: 48,
                            height: 48,
                            child: Icon(
                              Icons.directions_outlined,
                              color: url == null
                                  ? colors.textSecondary
                                  : colors.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Static (non-interactive) OSM map strip centred on the court. Dimmed in
/// dark mode so the bright tiles don't glare.
class _MiniMap extends StatelessWidget {
  const _MiniMap({required this.center});

  final LatLng center;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Stack(
      fit: StackFit.expand,
      children: [
        IgnorePointer(
          child: FlutterMap(
            options: MapOptions(
              initialCenter: center,
              initialZoom: 15,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.none,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'app.driftsports.drift',
              ),
            ],
          ),
        ),
        if (dark)
          IgnorePointer(
            child: ColoredBox(color: colors.background.withValues(alpha: 0.45)),
          ),
      ],
    );
  }
}

class _MapPin extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: colors.primary,
        border: Border.all(
          color: Color.alphaBlend(
            colors.primary.withValues(alpha: 0.35),
            colors.surface,
          ),
          width: 5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: const Icon(
        Icons.location_on_outlined,
        size: 20,
        color: Color(0xFF071522),
      ),
    );
  }
}

/// Drawn map placeholder for courts without coordinates.
class _RoadsPainter extends CustomPainter {
  _RoadsPainter({required this.base, required this.road});

  final Color base;
  final Color road;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = base);
    final p = Paint()
      ..color = road
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;
    final w = size.width;
    final h = size.height;
    canvas.drawLine(Offset(-20, h * 0.42), Offset(w + 20, h * 0.18), p);
    canvas.drawLine(Offset(w * 0.55, 0), Offset(w * 0.85, h), p);
    canvas.drawLine(Offset(-10, h * 0.95), Offset(w * 0.45, h * 0.6), p);
    final thin = Paint()
      ..color = road.withValues(alpha: 0.5)
      ..strokeWidth = 1;
    for (var x = -h; x < w; x += 46) {
      canvas.drawLine(Offset(x, h), Offset(x + h, 0), thin);
      canvas.drawLine(Offset(x, 0), Offset(x + h, h), thin);
    }
  }

  @override
  bool shouldRepaint(_RoadsPainter old) => old.base != base || old.road != road;
}

// ── Booking bar ───────────────────────────────────────────────────────────

class _BookingBar extends StatelessWidget {
  const _BookingBar({required this.profile});

  final CourtProfile profile;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final how = switch (profile.summary.bookingType) {
      CourtBookingType.externalLink => l.availBookOnline,
      CourtBookingType.contactOnly => l.availContactToBook,
      CourtBookingType.nativePartner => l.availBookInApp,
      CourtBookingType.unknown => l.availUnknown,
    };

    return Container(
      padding: const EdgeInsets.fromLTRB(18, 10, 10, 10),
      decoration: BoxDecoration(
        color: colors.surface.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 36,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.courtBookingEyebrow.toUpperCase(),
                  style: type.caption.copyWith(
                    color: colors.textSecondary,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  how,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const SizedBox(width: DriftSpacing.s3),
          SizedBox(
            width: 160,
            child: DriftPrimaryButton(
              label: l.courtBookACourt,
              verticalPadding: 15,
              onPressed: () => showBookingOptionsSheet(context, profile),
            ),
          ),
        ],
      ),
    );
  }
}
