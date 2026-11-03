import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../core/l10n/l10n.dart';

const _faqUrl = 'https://driftsports.app/#faq';

/// FAQs are maintained on the public website. Opening the canonical section
/// keeps Help & FAQ consistent across the app and website as answers change.
class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  Future<void> _openFaq(BuildContext context) async {
    final uri = Uri.parse(_faqUrl);
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
        SnackBar(content: Text(context.l10n.helpOpenFailed)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.settingsHelpFaq,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        children: [
          Text(context.l10n.helpTitle, style: type.h3),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            context.l10n.helpBody,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: context.l10n.helpOpenFaqs,
            onPressed: () => _openFaq(context),
          ),
        ],
      ),
    );
  }
}
