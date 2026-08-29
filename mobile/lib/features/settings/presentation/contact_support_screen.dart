import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';

const _supportEmail = 'support@drifttennis.app';

/// Contact Support — `foundation/04-screen-inventory.md` §A.11. A `mailto:`
/// link via the existing `url_launcher` dependency, not a ticketing
/// backend — there's no support-desk system anywhere in this stack.
class ContactSupportScreen extends StatelessWidget {
  const ContactSupportScreen({super.key});

  Future<void> _sendEmail(BuildContext context) async {
    final uri = Uri(
      scheme: 'mailto',
      path: _supportEmail,
      query: 'subject=${Uri.encodeComponent('Drift Tennis support request')}',
    );
    final opened = await launchUrl(uri);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Email us at $_supportEmail')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Contact Support',
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Need help?', style: type.h3),
            const SizedBox(height: DriftSpacing.s2),
            Text(
              "Send us an email and we'll get back to you as soon as we "
              'can.',
              style: type.body.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s5),
            DriftButton(
              label: 'Email $_supportEmail',
              onPressed: () => _sendEmail(context),
            ),
          ],
        ),
      ),
    );
  }
}
