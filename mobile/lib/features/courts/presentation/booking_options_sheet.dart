import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../data/courts_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Booking Options Sheet — `foundation/04-screen-inventory.md` §A.6.
/// Branches on [CourtProfile.summary]'s bookingType; never fabricates a
/// contact method the court doesn't actually have.
Future<void> showBookingOptionsSheet(
  BuildContext context,
  CourtProfile profile,
) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (_) => _BookingOptionsSheet(profile: profile),
  );
}

class _BookingOptionsSheet extends StatelessWidget {
  const _BookingOptionsSheet({required this.profile});

  final CourtProfile profile;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final bookingType = profile.summary.bookingType;

    final actions = <Widget>[];

    if (bookingType == CourtBookingType.externalLink &&
        profile.bookingUrl != null) {
      actions.add(
        DriftButton(
          label: context.l10n.courtBookOnline,
          onPressed: () => _launch(
            Uri.parse(profile.bookingUrl!),
            mode: LaunchMode.inAppBrowserView,
          ),
        ),
      );
    }

    if (bookingType == CourtBookingType.nativePartner) {
      actions.add(
        Text(
          context.l10n.courtNativeBookingUnavailable,
          style: type.body.copyWith(color: colors.textSecondary),
        ),
      );
    }

    if (profile.phone != null) {
      actions.add(
        DriftButton(
          label: context.l10n.commonCallNumber(profile.phone!),
          variant: DriftButtonVariant.text,
          onPressed: () => _launch(Uri(scheme: 'tel', path: profile.phone)),
        ),
      );
      actions.add(
        DriftButton(
          label: context.l10n.courtWhatsApp,
          variant: DriftButtonVariant.text,
          onPressed: () => _launch(
            Uri.parse(
              'https://wa.me/${profile.phone!.replaceAll(RegExp(r'[^0-9]'), '')}',
            ),
            mode: LaunchMode.externalApplication,
          ),
        ),
      );
    }

    if (profile.website != null) {
      actions.add(
        DriftButton(
          label: context.l10n.courtVisitWebsite,
          variant: DriftButtonVariant.text,
          onPressed: () => _launch(
            Uri.parse(profile.website!),
            mode: LaunchMode.inAppBrowserView,
          ),
        ),
      );
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s6,
          DriftSpacing.s2,
          DriftSpacing.s6,
          DriftSpacing.s6,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(context.l10n.courtBookingOptionsLower, style: type.h3),
            const SizedBox(height: DriftSpacing.s4),
            if (actions.isEmpty)
              Text(
                context.l10n.courtNoBookingInfo,
                style: type.body.copyWith(color: colors.textSecondary),
              )
            else
              for (final action in actions) ...[
                action,
                const SizedBox(height: DriftSpacing.s2),
              ],
          ],
        ),
      ),
    );
  }

  Future<void> _launch(
    Uri uri, {
    LaunchMode mode = LaunchMode.platformDefault,
  }) async {
    await launchUrl(uri, mode: mode);
  }
}
