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
import '../../../core/l10n/l10n.dart';

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

  int get _bestOf => widget.match.bestOfSets;
  int get _setsToWin => (_bestOf + 1) ~/ 2;

  /// Sets won so far by each side, from the games typed in (ignores sets that
  /// are blank or level). Drives the "Add a set" button and the final check.
  (int, int) get _setWins {
    var a = 0;
    var b = 0;
    for (final set in _sets) {
      final ga = _parse(set.aController);
      final gb = _parse(set.bController);
      if (ga == null || gb == null || ga == gb) continue;
      if (ga > gb) {
        a++;
      } else {
        b++;
      }
    }
    return (a, b);
  }

  bool get _matchDecided {
    final (a, b) = _setWins;
    return a >= _setsToWin || b >= _setsToWin;
  }

  int? _parse(TextEditingController controller) =>
      controller.text.trim().isEmpty
      ? null
      : int.tryParse(controller.text.trim());

  /// Rejects set scores that can't happen under standard tennis rules, so a
  /// typo (6-9, 8-6, 5-5...) is caught here rather than saved as a result.
  /// Covers the three shapes a completed set actually takes: 6 games with a
  /// 2-game margin (6-0..6-4), 7-5, or a 7-6 breaker (which needs both
  /// tiebreak points, winner ahead by 2+ and at least 7).
  String? _setScoreError(int setNumber, int a, int b, int? tbA, int? tbB) {
    final l10n = context.l10n;
    if (a == b) return l10n.scoreErrTie(setNumber, '$a-$b');
    final hi = a > b ? a : b;
    final lo = a > b ? b : a;
    if (hi == 6 && lo <= 4) return null;
    if (hi == 7 && lo == 5) return null;
    if (hi == 7 && lo == 6) {
      final winnerTb = a > b ? tbA : tbB;
      final loserTb = a > b ? tbB : tbA;
      if (winnerTb == null || loserTb == null) {
        return l10n.scoreErrNeedTiebreak(setNumber);
      }
      if (winnerTb < 7 || winnerTb - loserTb < 2) {
        return l10n.scoreErrTiebreak(setNumber, '$winnerTb-$loserTb');
      }
      return null;
    }
    return l10n.scoreErrInvalid(setNumber, '$a-$b');
  }

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
        var winsA = 0;
        var winsB = 0;
        for (var i = 0; i < _sets.length; i++) {
          final set = _sets[i];
          if (winsA >= _setsToWin || winsB >= _setsToWin) {
            setState(
              () => _errorText = context.l10n.scoreErrMatchDecided(i + 1),
            );
            return;
          }
          final a = _parse(set.aController);
          final b = _parse(set.bController);
          if (a == null || b == null) {
            setState(() => _errorText = context.l10n.scoreErrBothGames);
            return;
          }
          final tbA = _parse(set.aTiebreakController);
          final tbB = _parse(set.bTiebreakController);
          final setError = _setScoreError(i + 1, a, b, tbA, tbB);
          if (setError != null) {
            setState(() => _errorText = setError);
            return;
          }
          if (a > b) {
            winsA++;
          } else {
            winsB++;
          }
          sets.add(
            SetScore(
              sideAGames: a,
              sideBGames: b,
              sideATiebreak: tbA,
              sideBTiebreak: tbB,
            ),
          );
        }
        if (winsA < _setsToWin && winsB < _setsToWin) {
          setState(() => _errorText = context.l10n.scoreErrNeedMoreSets);
          return;
        }
        updated = await _send(repo, outcome: ResultOutcome.score, sets: sets);
      } else {
        if (_outcome == ResultOutcome.retirement && _winningSide == null) {
          setState(() => _errorText = context.l10n.scoreErrRetirementWinner);
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
        EnterScoreMode.submit => context.l10n.matchEnterResult,
        EnterScoreMode.dispute => context.l10n.matchYourVersion,
        EnterScoreMode.resubmit => context.l10n.matchReviseVersion,
      },
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          Row(
            children: [
              Expanded(
                child: DriftFilterChip(
                  label: context.l10n.matchScore,
                  selected: _isScore,
                  onTap: () => setState(() => _isScore = true),
                ),
              ),
              const SizedBox(width: DriftSpacing.s2),
              Expanded(
                child: DriftFilterChip(
                  label: context.l10n.matchWalkoverRetirement,
                  selected: !_isScore,
                  onTap: () => setState(() => _isScore = false),
                ),
              ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s5),

          if (_isScore) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
              child: Text(
                context.l10n.matchBestOfN(_bestOf),
                style: type.caption.copyWith(color: colors.textSecondary),
              ),
            ),
            for (var i = 0; i < _sets.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                child: DriftCard(
                  child: Row(
                    children: [
                      Text(context.l10n.matchSetNumber(i + 1), style: type.label),
                      const SizedBox(width: DriftSpacing.s3),
                      Expanded(
                        child: _GamesField(
                          label: context.l10n.commonYou,
                          controller: _sets[i].aController,
                          tiebreakController: _sets[i].aTiebreakController,
                          onChanged: () => setState(() {}),
                        ),
                      ),
                      const SizedBox(width: DriftSpacing.s3),
                      Expanded(
                        child: _GamesField(
                          label: opponent?.player.displayName ?? context.l10n.commonThem,
                          controller: _sets[i].bController,
                          tiebreakController: _sets[i].bTiebreakController,
                          onChanged: () => setState(() {}),
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
            if (_sets.length < _bestOf && !_matchDecided)
              DriftButton(
                label: context.l10n.matchAddSet,
                variant: DriftButtonVariant.text,
                onPressed: () => setState(() => _sets.add(_SetInput())),
              ),
          ] else ...[
            Text(context.l10n.matchWhatHappened, style: type.label),
            const SizedBox(height: DriftSpacing.s2),
            Row(
              children: [
                DriftFilterChip(
                  label: context.l10n.matchStateWalkover,
                  selected: _outcome == ResultOutcome.walkover,
                  onTap: () => setState(() {
                    _outcome = ResultOutcome.walkover;
                    _winningSide = null;
                  }),
                ),
                const SizedBox(width: DriftSpacing.s2),
                DriftFilterChip(
                  label: context.l10n.matchRetirement,
                  selected: _outcome == ResultOutcome.retirement,
                  onTap: () =>
                      setState(() => _outcome = ResultOutcome.retirement),
                ),
              ],
            ),
            const SizedBox(height: DriftSpacing.s4),
            if (_outcome == ResultOutcome.retirement) ...[
              Text(context.l10n.matchWhoWon, style: type.label),
              const SizedBox(height: DriftSpacing.s2),
              Row(
                children: [
                  DriftFilterChip(
                    label: context.l10n.commonYou,
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
                    label: opponent?.player.displayName ?? context.l10n.commonThem,
                    selected: _winningSide == opponent?.side,
                    onTap: () => setState(() => _winningSide = opponent?.side),
                  ),
                ],
              ),
            ] else
              Text(
                context.l10n.matchWalkoverNeither,
                style: type.bodySmall.copyWith(color: colors.textSecondary),
              ),
          ],

          if (_errorText != null) ...[
            const SizedBox(height: DriftSpacing.s3),
            Text(_errorText!, style: TextStyle(color: colors.error)),
          ],

          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: _isSubmitting
                ? context.l10n.commonSubmitting
                : context.l10n.commonSubmit,
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
    this.onChanged,
  });

  final String label;
  final TextEditingController controller;
  final TextEditingController tiebreakController;
  final VoidCallback? onChanged;

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
              width: 56,
              child: TextField(
                controller: controller,
                onChanged: (_) => onChanged?.call(),
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: type.title,
                decoration: const InputDecoration(
                  hintText: '0',
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: DriftSpacing.s1,
                    vertical: DriftSpacing.s3,
                  ),
                ),
              ),
            ),
            const SizedBox(width: DriftSpacing.s2),
            SizedBox(
              width: 48,
              child: TextField(
                controller: tiebreakController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: type.title,
                decoration: InputDecoration(
                  hintText: context.l10n.matchTiebreakShort,
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: DriftSpacing.s1,
                    vertical: DriftSpacing.s3,
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
