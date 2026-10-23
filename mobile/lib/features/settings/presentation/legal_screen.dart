import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';

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
        const SnackBar(
          content: Text('Unable to open the legal document right now.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Legal',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        children: [
          Text('Terms and privacy', style: type.h3),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            'The current legal documents for the Drift Tennis app and website '
            'are published here. They always open the latest approved version.',
            style: type.body.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: 'Terms and Conditions',
            onPressed: () => _openDocument(context, _termsUrl),
          ),
          const SizedBox(height: DriftSpacing.s3),
          DriftButton(
            label: 'Privacy Policy',
            onPressed: () => _openDocument(context, _privacyPolicyUrl),
          ),
          const SizedBox(height: DriftSpacing.s3),
          DriftButton(
            label: 'Data Privacy Notice',
            onPressed: () => _openDocument(context, _dataPrivacyUrl),
          ),
        ],
      ),
    );
  }
}
