import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';

const _faqs = [
  (
    'How is my level calculated?',
    'Your level starts from a short self-assessment during onboarding, '
        'then adjusts over time based on your confirmed match results.',
  ),
  (
    'Who can see my skill breakdown and availability?',
    "By default, only your connections. You can open this up to everyone "
        "in Settings > Privacy Settings.",
  ),
  (
    'How do I challenge someone to a match?',
    "Open a player's profile and tap Challenge to a match — you don't "
        'need to be connected first.',
  ),
  (
    'How do I report or block someone?',
    'Open their profile and use the safety options in the top-right '
        'corner, or report a specific message from a chat thread.',
  ),
  (
    'What happens when I delete my account?',
    "Your account is deactivated immediately and you're signed out "
        'everywhere. Contact support if you want your data fully removed.',
  ),
];

/// Help & FAQ — `foundation/04-screen-inventory.md` §A.11. Static content;
/// no backend surface (there's no CMS or content-authoring app yet — same
/// gap as Courts/Learning/News, all of which are seed-only for now).
class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Help & FAQ',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          for (final faq in _faqs) ...[
            DriftCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(faq.$1, style: type.title),
                  const SizedBox(height: DriftSpacing.s2),
                  Text(
                    faq.$2,
                    style: type.body.copyWith(color: colors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: DriftSpacing.s3),
          ],
        ],
      ),
    );
  }
}
