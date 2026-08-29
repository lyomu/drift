import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_scaffold.dart';

const _sections = [
  (
    'Terms of Service',
    'By using Drift Tennis, you agree to use the platform respectfully — '
        'no harassment, fake profiles, or cheating on match results. We may '
        'suspend accounts that break these rules. This is placeholder '
        'copy pending a full legal review before public launch.',
  ),
  (
    'Privacy Policy',
    "We store the profile information you give us and the match, "
        "competition, and messaging activity you generate on the platform. "
        "Skill breakdown and availability are only shared with your "
        "connections unless you choose to open them up to everyone in "
        "Privacy Settings. This is placeholder copy pending a full legal "
        "review before public launch.",
  ),
];

/// Terms & Privacy Policy — `foundation/04-screen-inventory.md` §A.11.
/// Static placeholder content — a real legal document needs review this
/// project can't provide; documented as a real gap in PROGRESS.md.
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
