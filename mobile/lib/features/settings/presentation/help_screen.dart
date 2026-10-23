import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';

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
        const SnackBar(content: Text('Unable to open FAQs right now.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Help & FAQ',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
        children: [
          Text('Questions, answered.', style: type.h3),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            'Read the current FAQs for Drift Tennis. This opens the same '
            'answers published on our website.',
            style: type.body.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s6),
          DriftButton(label: 'Open FAQs', onPressed: () => _openFaq(context)),
        ],
      ),
    );
  }
}
