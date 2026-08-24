import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_match_score_display.dart';
import '../../auth/data/auth_repository.dart';
import '../application/matches_providers.dart';
import '../data/matches_repository.dart';
import 'enter_score_screen.dart';

/// Dispute Detail — `foundation/04-screen-inventory.md` §A.4. Both submitted
/// versions, side by side, so the two players can see exactly where they
/// disagree. Resolution is mutual re-confirmation only this phase — see
/// `results.service.ts` for why there's no admin-ruling path yet.
class DisputeDetailScreen extends ConsumerStatefulWidget {
  const DisputeDetailScreen({
    super.key,
    required this.match,
    required this.viewerId,
  });

  final DriftMatch match;
  final String viewerId;

  @override
  ConsumerState<DisputeDetailScreen> createState() =>
      _DisputeDetailScreenState();
}

class _DisputeDetailScreenState extends ConsumerState<DisputeDetailScreen> {
  bool _isSubmitting = false;

  Future<void> _acceptTheirVersion(_Version theirs) async {
    setState(() => _isSubmitting = true);
    try {
      await ref
          .read(matchesRepositoryProvider)
          .resubmitResult(
            widget.match.id,
            outcome: theirs.outcome,
            sets: theirs.sets,
            winningSide: theirs.winningSide,
          );
      if (!mounted) return;
      ref.invalidate(matchDetailProvider(widget.match.id));
      context.pop();
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final result = widget.match.result!;
    final submitter = widget.match.participants.firstWhere(
      (p) => p.userId == result.submittedById,
    );
    final viewer = widget.match.participants.firstWhere(
      (p) => p.userId == widget.viewerId,
    );
    final isSubmitterSlot = viewer.side == submitter.side;

    final mine = isSubmitterSlot
        ? _Version(result.outcome, result.sets, result.winningSide)
        : _Version(
            result.disputantOutcome!,
            result.disputantSets,
            result.disputantWinningSide,
          );
    final theirs = isSubmitterSlot
        ? _Version(
            result.disputantOutcome!,
            result.disputantSets,
            result.disputantWinningSide,
          )
        : _Version(result.outcome, result.sets, result.winningSide);

    return Scaffold(
      appBar: AppBar(title: const Text('Dispute')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(DriftSpacing.s5),
          children: [
            Text(
              "You and your opponent submitted different results. Accept "
              "their version if it's right, or revise yours.",
              style: type.body,
            ),
            const SizedBox(height: DriftSpacing.s5),
            _VersionCard(title: 'Your version', version: mine),
            const SizedBox(height: DriftSpacing.s3),
            _VersionCard(title: 'Their version', version: theirs),
            const SizedBox(height: DriftSpacing.s6),
            DriftButton(
              label: _isSubmitting ? 'Saving…' : 'Accept their version',
              onPressed: _isSubmitting
                  ? null
                  : () => _acceptTheirVersion(theirs),
            ),
            const SizedBox(height: DriftSpacing.s2),
            DriftButton(
              label: 'Revise your version',
              variant: DriftButtonVariant.text,
              onPressed: _isSubmitting
                  ? null
                  : () => context.push(
                      '/matches/${widget.match.id}/enter-score',
                      extra: (
                        match: widget.match,
                        viewerId: widget.viewerId,
                        mode: EnterScoreMode.resubmit,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Version {
  const _Version(this.outcome, this.sets, this.winningSide);

  final ResultOutcome outcome;
  final List<SetScore>? sets;
  final String? winningSide;
}

class _VersionCard extends StatelessWidget {
  const _VersionCard({required this.title, required this.version});

  final String title;
  final _Version version;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: type.h4),
          const SizedBox(height: DriftSpacing.s3),
          if (version.outcome == ResultOutcome.score && version.sets != null)
            DriftMatchScoreDisplay(sets: version.sets!)
          else
            Text(switch (version.outcome) {
              ResultOutcome.walkover => 'Walkover',
              ResultOutcome.retirement => 'Retirement',
              ResultOutcome.score => 'Score',
            }, style: type.body.copyWith(color: colors.textSecondary)),
        ],
      ),
    );
  }
}
