import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../connections/application/connections_providers.dart';
import '../../padel/application/padel_providers.dart';
import '../../players/data/players_repository.dart';
import '../data/matches_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Challenge Composer — `foundation/04-screen-inventory.md` §A.4
/// (redesign 2026-08). For doubles the challenger picks their own partner
/// here; the opponent nominates theirs when accepting.
class ChallengeComposerScreen extends ConsumerStatefulWidget {
  const ChallengeComposerScreen({super.key, required this.opponent});

  final PlayerSummary opponent;

  @override
  ConsumerState<ChallengeComposerScreen> createState() =>
      _ChallengeComposerScreenState();
}

class _ChallengeComposerScreenState
    extends ConsumerState<ChallengeComposerScreen> {
  String _format = 'SINGLES';
  int _bestOf = 3;
  String _sport = 'TENNIS';
  String? _partnerId;
  final _noteController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorText;

  bool get _isDoubles => _format == 'DOUBLES';
  bool get _isPadel => _sport == 'PADEL';

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_isDoubles && _partnerId == null) {
      setState(() => _errorText = context.l10n.matchChoosePartner);
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final match = await ref
          .read(matchesRepositoryProvider)
          .challenge(
            opponentId: widget.opponent.id,
            format: _format,
            bestOfSets: _bestOf,
            partnerId: _partnerId,
            note: _noteController.text.trim(),
            sport: _isPadel ? 'PADEL' : null,
          );
      if (!mounted) return;
      context.pushReplacement('/matches/${match.id}');
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
    final connections = ref.watch(connectionsProvider);
    final hasPadelProfile = ref.watch(padelProfileProvider).valueOrNull != null;

    Text sectionLabel(String text) => Text(
      text,
      style: type.label.copyWith(fontWeight: FontWeight.w700, fontSize: 13),
    );

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(title: context.l10n.matchChallenge),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                children: [
                  DriftSoftCard(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                    child: Row(
                      children: [
                        DriftPlayerAvatar(player: widget.opponent, radius: 22),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.opponent.displayName,
                                style: type.title.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (widget.opponent.levelLabel != null ||
                                  widget.opponent.level != null)
                                Text(
                                  widget.opponent.level != null
                                      ? context.l10n.commonLevel(
                                          widget.opponent.level!
                                              .toStringAsFixed(1),
                                        )
                                      : widget.opponent.levelLabel!,
                                  style: type.caption.copyWith(
                                    color: colors.textSecondary,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  if (hasPadelProfile) ...[
                    sectionLabel(context.l10n.matchSport),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        DriftFilterChip(
                          label: context.l10n.sportTennis,
                          selected: !_isPadel,
                          onTap: () => setState(() => _sport = 'TENNIS'),
                        ),
                        const SizedBox(width: 8),
                        DriftFilterChip(
                          label: context.l10n.sportPadel,
                          selected: _isPadel,
                          onTap: () => setState(() => _sport = 'PADEL'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  sectionLabel(context.l10n.onbFormat),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      DriftFilterChip(
                        label: context.l10n.optSingles,
                        selected: !_isDoubles,
                        onTap: () => setState(() {
                          _format = 'SINGLES';
                          _partnerId = null;
                        }),
                      ),
                      const SizedBox(width: 8),
                      DriftFilterChip(
                        label: context.l10n.optDoubles,
                        selected: _isDoubles,
                        onTap: () => setState(() => _format = 'DOUBLES'),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),
                  sectionLabel(context.l10n.matchLength),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      for (final n in const [3, 5]) ...[
                        if (n != 3) const SizedBox(width: 8),
                        DriftFilterChip(
                          label: context.l10n.matchBestOfN(n),
                          selected: _bestOf == n,
                          onTap: () => setState(() => _bestOf = n),
                        ),
                      ],
                    ],
                  ),

                  if (_isDoubles) ...[
                    const SizedBox(height: 16),
                    sectionLabel(context.l10n.matchYourPartner),
                    const SizedBox(height: 4),
                    Text(
                      context.l10n.matchOpponentPicksPartner(
                        widget.opponent.displayName,
                      ),
                      style: type.caption.copyWith(color: colors.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    switch (connections) {
                      AsyncData(:final value) =>
                        value.isEmpty
                            ? Text(
                                context.l10n.matchConnectFirst,
                                style: type.bodySmall.copyWith(
                                  color: colors.textSecondary,
                                ),
                              )
                            : Column(
                                children: [
                                  for (final entry in value)
                                    if (entry.player.id != widget.opponent.id)
                                      RadioGroup<String>(
                                        groupValue: _partnerId,
                                        onChanged: (v) =>
                                            setState(() => _partnerId = v),
                                        child: RadioListTile<String>(
                                          contentPadding: EdgeInsets.zero,
                                          value: entry.player.id,
                                          title: Text(
                                            entry.player.displayName,
                                            style: type.body,
                                          ),
                                        ),
                                      ),
                                ],
                              ),
                      AsyncError() => Text(
                        context.l10n.matchLoadConnectionsFailed,
                        style: type.bodySmall.copyWith(color: colors.error),
                      ),
                      _ => const Center(child: CircularProgressIndicator()),
                    },
                  ],

                  const SizedBox(height: 16),
                  DriftTextField(
                    label: context.l10n.matchAddNote,
                    controller: _noteController,
                    maxLines: 4,
                  ),

                  if (_errorText != null) ...[
                    const SizedBox(height: 12),
                    Text(_errorText!, style: TextStyle(color: colors.error)),
                  ],

                  const SizedBox(height: 24),
                  DriftPrimaryButton(
                    label: context.l10n.matchSendChallenge,
                    loading: _isSubmitting,
                    fontSize: 16,
                    verticalPadding: 16,
                    onPressed: _isSubmitting ? null : _send,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
