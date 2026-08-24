import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../data/courts_repository.dart';

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
          label: 'Book Online',
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
          "Native booking isn't available for this court yet.",
          style: type.body.copyWith(color: colors.textSecondary),
        ),
      );
    }

    if (profile.phone != null) {
      actions.add(
        DriftButton(
          label: 'Call ${profile.phone}',
          variant: DriftButtonVariant.text,
          onPressed: () => _launch(Uri(scheme: 'tel', path: profile.phone)),
        ),
      );
      actions.add(
        DriftButton(
          label: 'Message on WhatsApp',
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
          label: 'Visit Website',
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
            Text('Booking options', style: type.h3),
            const SizedBox(height: DriftSpacing.s4),
            if (actions.isEmpty)
              Text(
                'No booking info available — try contacting directly',
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
