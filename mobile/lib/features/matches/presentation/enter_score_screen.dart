import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../application/matches_providers.dart';
import '../data/matches_repository.dart';

/// Which endpoint the form submits to — same fields, three different
/// moments in the result lifecycle (§4.3).
enum EnterScoreMode {
  /// The original result, from SCHEDULED.
  submit,

  /// Disagreeing with a PENDING_CONFIRMATION result — this is *your*
  /// version, stored alongside theirs.
  dispute,

  /// Revising your stored version during an open DISPUTED result.
  resubmit,
}

/// Enter Score — `foundation/04-screen-inventory.md` §A.4. Set-by-set entry,
/// with "Report walkover/retirement instead" as the documented alternative
/// to a scored result rather than a separate screen. Reused for the
/// disputer's counter-version and for revising during an open dispute —
/// same form, [mode] picks the endpoint.
class EnterScoreScreen extends ConsumerStatefulWidget {
  const EnterScoreScreen({
    super.key,
    required this.match,
    required this.viewerId,
    this.mode = EnterScoreMode.submit,
  });

  final DriftMatch match;
  final String viewerId;
  final EnterScoreMode mode;

  @override
  ConsumerState<EnterScoreScreen> createState() => _EnterScoreScreenState();
}

class _SetInput {
  final aController = TextEditingController();
  final bController = TextEditingController();
  final aTiebreakController = TextEditingController();
  final bTiebreakController = TextEditingController();

  void dispose() {
    aController.dispose();
    bController.dispose();
    aTiebreakController.dispose();
    bTiebreakController.dispose();
  }
}

class _EnterScoreScreenState extends ConsumerState<EnterScoreScreen> {
  bool _isScore = true;
  ResultOutcome _outcome = ResultOutcome.walkover;
  String? _winningSide;
  final List<_SetInput> _sets = [_SetInput()];
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    for (final set in _sets) {
      set.dispose();
    }
    super.dispose();
  }

  int? _parse(TextEditingController controller) =>
      controller.text.trim().isEmpty
      ? null
      : int.tryParse(controller.text.trim());

  Future<DriftMatch> _send(
    MatchesRepository repo, {
    required ResultOutcome outcome,
    List<SetScore>? sets,
    String? winningSide,
  }) => switch (widget.mode) {
    EnterScoreMode.submit => repo.submitResult(
      widget.match.id,
      outcome: outcome,
      sets: sets,
      winningSide: winningSide,
    ),
    EnterScoreMode.dispute => repo.disputeResult(
      widget.match.id,
      outcome: outcome,
      sets: sets,
      winningSide: winningSide,
    ),
    EnterScoreMode.resubmit => repo.resubmitResult(
      widget.match.id,
      outcome: outcome,
      sets: sets,
      winningSide: winningSide,
    ),
  };

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final repo = ref.read(matchesRepositoryProvider);
      final DriftMatch updated;

      if (_isScore) {
        final sets = <SetScore>[];
        for (final set in _sets) {
          final a = _parse(set.aController);
          final b = _parse(set.bController);
          if (a == null || b == null) {
            setState(() => _errorText = 'Enter both games for every set.');
            return;
          }
          sets.add(
            SetScore(
              sideAGames: a,
              sideBGames: b,
              sideATiebreak: _parse(set.aTiebreakController),
              sideBTiebreak: _parse(set.bTiebreakController),
            ),
          );
        }
        updated = await _send(repo, outcome: ResultOutcome.score, sets: sets);
      } else {
        if (_outcome == ResultOutcome.retirement && _winningSide == null) {
          setState(() => _errorText = 'Choose who won after the retirement.');
          return;
        }
        updated = await _send(
          repo,
          outcome: _outcome,
          winningSide: _winningSide,
        );
      }

      if (!mounted) return;
      ref.invalidate(matchDetailProvider(widget.match.id));
      context.pop(updated);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final opponent = widget.match.opponentFor(widget.viewerId);

    return DriftScaffold(
      title: switch (widget.mode) {
        EnterScoreMode.submit => 'Enter Result',
        EnterScoreMode.dispute => 'Your Version',
        EnterScoreMode.resubmit => 'Revise Your Version',
      },
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          Row(
            children: [
              Expanded(
                child: DriftFilterChip(
                  label: 'Score',
                  selected: _isScore,
                  onTap: () => setState(() => _isScore = true),
                ),
              ),
              const SizedBox(width: DriftSpacing.s2),
              Expanded(
                child: DriftFilterChip(
                  label: 'Walkover / Retirement',
                  selected: !_isScore,
                  onTap: () => setState(() => _isScore = false),
                ),
              ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s5),

          if (_isScore) ...[
            for (var i = 0; i < _sets.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                child: DriftCard(
                  child: Row(
                    children: [
                      Text('Set ${i + 1}', style: type.label),
                      const SizedBox(width: DriftSpacing.s3),
                      Expanded(
                        child: _GamesField(
                          label: 'You',
                          controller: _sets[i].aController,
                          tiebreakController: _sets[i].aTiebreakController,
                        ),
                      ),
                      const SizedBox(width: DriftSpacing.s3),
                      Expanded(
                        child: _GamesField(
                          label: opponent?.player.displayName ?? 'Them',
                          controller: _sets[i].bController,
                          tiebreakController: _sets[i].bTiebreakController,
                        ),
                      ),
                      if (_sets.length > 1)
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => setState(() {
                            _sets[i].dispose();
                            _sets.removeAt(i);
                          }),
                        ),
                    ],
                  ),
                ),
              ),
            if (_sets.length < 5)
              DriftButton(
                label: 'Add a set',
                variant: DriftButtonVariant.text,
                onPressed: () => setState(() => _sets.add(_SetInput())),
              ),
          ] else ...[
            Text('What happened?', style: type.label),
            const SizedBox(height: DriftSpacing.s2),
            Row(
              children: [
                DriftFilterChip(
                  label: 'Walkover',
                  selected: _outcome == ResultOutcome.walkover,
                  onTap: () => setState(() {
                    _outcome = ResultOutcome.walkover;
                    _winningSide = null;
                  }),
                ),
                const SizedBox(width: DriftSpacing.s2),
                DriftFilterChip(
                  label: 'Retirement',
                  selected: _outcome == ResultOutcome.retirement,
                  onTap: () =>
                      setState(() => _outcome = ResultOutcome.retirement),
                ),
              ],
            ),
            const SizedBox(height: DriftSpacing.s4),
            if (_outcome == ResultOutcome.retirement) ...[
              Text('Who won?', style: type.label),
              const SizedBox(height: DriftSpacing.s2),
              Row(
                children: [
                  DriftFilterChip(
                    label: 'You',
                    selected:
                        _winningSide ==
                        widget.match.participants
                            .firstWhere((p) => p.userId == widget.viewerId)
                            .side,
                    onTap: () => setState(
                      () => _winningSide = widget.match.participants
                          .firstWhere((p) => p.userId == widget.viewerId)
                          .side,
                    ),
                  ),
                  const SizedBox(width: DriftSpacing.s2),
                  DriftFilterChip(
                    label: opponent?.player.displayName ?? 'Them',
                    selected: _winningSide == opponent?.side,
                    onTap: () => setState(() => _winningSide = opponent?.side),
                  ),
                ],
              ),
            ] else
              Text(
                "A walkover is recorded in favour of neither player.",
                style: type.bodySmall.copyWith(color: colors.textSecondary),
              ),
          ],

          if (_errorText != null) ...[
            const SizedBox(height: DriftSpacing.s3),
            Text(_errorText!, style: TextStyle(color: colors.error)),
          ],

          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: _isSubmitting ? 'Submitting…' : 'Submit',
            onPressed: _isSubmitting ? null : _submit,
          ),
        ],
      ),
    );
  }
}

class _GamesField extends StatelessWidget {
  const _GamesField({
    required this.label,
    required this.controller,
    required this.tiebreakController,
  });

  final String label;
  final TextEditingController controller;
  final TextEditingController tiebreakController;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: type.caption, overflow: TextOverflow.ellipsis),
        const SizedBox(height: DriftSpacing.s1),
        Row(
          children: [
            SizedBox(
              width: 48,
              child: TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                decoration: const InputDecoration(hintText: '0'),
              ),
            ),
            const SizedBox(width: DriftSpacing.s2),
            SizedBox(
              width: 40,
              child: TextField(
                controller: tiebreakController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                decoration: const InputDecoration(hintText: 'TB'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
