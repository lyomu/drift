import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_scaffold.dart';

const _sections = [
  (
    'Terms of Service',
    'By using Drift Tennis, you agree to use the platform respectfully — '
        'no harassment, fake profiles, spam, scraping, impersonation, or '
        'cheating on match results. Drift Tennis is for adults only at '
        'launch. You must be 18 or older to create an account. We may '
        'suspend accounts, remove unsafe content, or restrict access when '
        'needed to protect players, clubs, staff, and the integrity of '
        'competitions.',
  ),
  (
    'Privacy Policy',
    "We store the profile information you give us and the match, "
        "competition, and messaging activity you generate on the platform. "
        "Skill breakdown and availability are only shared with your "
        "connections unless you choose to open them up to everyone in "
        "Privacy Settings. If you delete your account, it is deactivated "
        "immediately and a deletion request is filed. After a 30-day "
        "recovery window, Drift Tennis permanently anonymises direct "
        "identifiers and private free text. This anonymisation is terminal. "
        "Records that also belong to other people or to platform integrity "
        "are deliberately kept in redacted form, including matches, "
        "standings, conversations, reports about the account, support and "
        "privacy-request audit records, payments, and abuse/safety records. "
        "Nightly backups may contain pre-erasure data for up to 14 days "
        "until they age out.",
  ),
  (
    'Support and privacy requests',
    'Use Contact Support for account recovery, access, deletion, objection, '
        'billing, safety, and technical requests. Deleted accounts cannot log '
        'back in during the 30-day recovery window, so email support is the '
        'route for cancelling an accidental deletion before anonymisation runs.',
  ),
];

/// Terms & Privacy Policy — `foundation/04-screen-inventory.md` §A.11.
/// Launch notice that mirrors shipped behaviour. Still needs legal review
/// before it should be treated as final legal terms.
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Terms & Privacy Policy',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          for (final section in _sections) ...[
            Text(section.$1, style: type.h3),
            const SizedBox(height: DriftSpacing.s2),
            Text(
              section.$2,
              style: type.body.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s5),
          ],
        ],
      ),
    );
  }
}
