import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../core/l10n/l10n.dart';

const _termsUrl = 'https://driftsports.app/terms';
const _privacyPolicyUrl = 'https://driftsports.app/privacy-policy';
const _dataPrivacyUrl = 'https://driftsports.app/data-privacy';

/// Legal documents are maintained on the public website, which is the single
/// source of truth for the app and web product. Opening the canonical pages
/// prevents the mobile app from carrying a stale, shortened copy.
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key});

  Future<void> _openDocument(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    var opened = false;
    try {
      opened = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    } catch (_) {
      // Some devices do not provide an in-app browser. Try their browser.
    }
    if (!opened) {
      try {
        opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        // The user-facing fallback is shown below.
      }
    }
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.l10n.legalOpenFailed),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.legalTitle,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        children: [
          Text(context.l10n.legalHeading, style: type.h3),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            context.l10n.legalBody,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: context.l10n.legalTerms,
            onPressed: () => _openDocument(context, _termsUrl),
          ),
          const SizedBox(height: DriftSpacing.s3),
          DriftButton(
            label: context.l10n.legalPrivacy,
            onPressed: () => _openDocument(context, _privacyPolicyUrl),
          ),
          const SizedBox(height: DriftSpacing.s3),
          DriftButton(
            label: context.l10n.legalDataPrivacy,
            onPressed: () => _openDocument(context, _dataPrivacyUrl),
          ),
        ],
      ),
    );
  }
}
