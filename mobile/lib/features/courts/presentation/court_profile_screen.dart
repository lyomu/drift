import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_court_availability_chip.dart';
import '../../../shared/widgets/drift_court_surface_chip.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../application/courts_providers.dart';
import '../data/courts_repository.dart';
import 'booking_options_sheet.dart';
import 'report_court_sheet.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/enum_labels.dart';


/// Court Profile — `foundation/04-screen-inventory.md` §A.6. Every field
/// with no verified source renders as "Unknown", never fabricated
/// (`foundation/06-domain-technical-architecture.md` §2).
class CourtProfileScreen extends ConsumerWidget {
  const CourtProfileScreen({super.key, required this.courtId});

  final String courtId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(courtDetailProvider(courtId));

    return DriftScaffold(
      title: context.l10n.matchCourt,
      trailing: DriftHeaderSquareButton(
        icon: Icons.flag_outlined,
        onTap: () => showReportCourtSheet(context, ref, courtId),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(courtDetailProvider(courtId));
          await ref.read(courtDetailProvider(courtId).future);
        },
        child: switch (profile) {
          AsyncData(:final value) => _ProfileBody(profile: value),
          AsyncError() => Center(child: Text(context.l10n.courtUnavailable)),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _ProfileBody extends StatelessWidget {
  const _ProfileBody({required this.profile});

  final CourtProfile profile;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final summary = profile.summary;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Row(
          children: [
            Expanded(child: Text(summary.name, style: type.h2)),
            if (summary.verificationStatus !=
                ListingVerificationStatus.unverified)
              DriftStatusBadge(
                label: summary.verificationStatus.label,
                tone:
                    summary.verificationStatus ==
                        ListingVerificationStatus.verified
                    ? DriftStatusTone.success
                    : DriftStatusTone.warning,
                icon:
                    summary.verificationStatus ==
                        ListingVerificationStatus.verified
                    ? Icons.verified_outlined
                    : Icons.hourglass_empty,
              ),
          ],
        ),
        const SizedBox(height: DriftSpacing.s1),
        Text(
          summary.distanceKm != null
              ? context.l10n.commonKmAway(summary.distanceKm!.toStringAsFixed(1))
              : (summary.address ?? context.l10n.courtLocationUnknown),
          style: type.bodySmall.copyWith(color: colors.textSecondary),
        ),
        const SizedBox(height: DriftSpacing.s4),

        if (summary.surfaces.isNotEmpty)
          Wrap(
            spacing: DriftSpacing.s2,
            runSpacing: DriftSpacing.s2,
            children: [
              for (final surface in summary.surfaces)
                DriftCourtSurfaceChip(label: surface),
              DriftCourtAvailabilityChip(bookingType: summary.bookingType),
            ],
          ),
        const SizedBox(height: DriftSpacing.s4),

        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(context.l10n.courtDetails, style: type.h4),
              const SizedBox(height: DriftSpacing.s3),
              _Fact(
                label: context.l10n.courtAddress,
                value: summary.address ?? context.l10n.commonUnknown,
              ),
              _Fact(
                label: context.l10n.courtAccess,
                value: switch (profile.isPublic) {
                  true => context.l10n.courtPublic,
                  false => context.l10n.courtPrivate,
                  null => context.l10n.commonUnknown,
                },
              ),
              _Fact(
                label: context.l10n.courtHours,
                value: profile.openingHoursNote ?? context.l10n.commonUnknown,
              ),
              _Fact(
                label: context.l10n.courtPhone,
                value: profile.phone ?? context.l10n.commonUnknown,
              ),
              _Fact(
                label: context.l10n.courtWebsite,
                value: profile.website ?? context.l10n.commonUnknown,
              ),
              if (profile.amenities.isNotEmpty)
                _Fact(
                  label: context.l10n.courtAmenities,
                  value: profile.amenities.join(', '),
                ),
              if (profile.courtGroups.isNotEmpty)
                _Fact(
                  label: context.l10n.discoverCourts,
                  value: profile.courtGroups
                      .map(
                        (g) =>
                            '${g.count} ${surfaceLabel(context.l10n, g.surface)}'
                            '${g.indoor ? context.l10n.courtIndoorSuffix : ''}'
                            '${g.lighting ? context.l10n.courtLitSuffix : ''}',
                      )
                      .join(', '),
                ),
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s4),

        if (profile.club != null)
          DriftCard(
            onTap: () => context.push('/discover/clubs/${profile.club!.id}'),
            child: Row(
              children: [
                Icon(Icons.groups_outlined, color: colors.textSecondary),
                const SizedBox(width: DriftSpacing.s3),
                Expanded(child: Text(profile.club!.name, style: type.title)),
                Icon(Icons.chevron_right, color: colors.textSecondary),
              ],
            ),
          ),
        if (profile.club != null) const SizedBox(height: DriftSpacing.s4),

        if (profile.photoUrls.isNotEmpty)
          DriftButton(
            label: context.l10n.courtViewPhotos,
            variant: DriftButtonVariant.text,
            onPressed: () => context.push(
              '/discover/courts/${summary.id}/photos',
              extra: profile.photoUrls,
            ),
          ),
        const SizedBox(height: DriftSpacing.s2),

        DriftButton(
          label: context.l10n.courtBookingOptions,
          onPressed: () => showBookingOptionsSheet(context, profile),
        ),
        const SizedBox(height: DriftSpacing.s2),
        Builder(
          builder: (context) {
            final url = _directionsUrl(profile);
            return DriftButton(
              label: context.l10n.courtGetDirections,
              variant: DriftButtonVariant.text,
              onPressed: url == null
                  ? null
                  : () => launchUrl(url, mode: LaunchMode.externalApplication),
            );
          },
        ),
      ],
    );
  }

  /// The curator's maps link if they set one, otherwise a lat/long directions
  /// URL, otherwise null (no button).
  Uri? _directionsUrl(CourtProfile profile) {
    final maps = profile.mapsUrl?.trim();
    if (maps != null && maps.isNotEmpty) return Uri.tryParse(maps);
    final lat = profile.summary.latitude;
    final lng = profile.summary.longitude;
    if (lat == null || lng == null) return null;
    return Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
          Expanded(child: Text(value, style: type.body)),
        ],
      ),
    );
  }
}
