import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_filter_chip.dart';
import '../../application/matches_providers.dart';
import 'play_active_tab.dart';
import 'play_challenges_tab.dart';
import 'play_history_tab.dart';

/// Play → Matches (2026-11 restructure). The old Play Hub's Challenges /
/// Active / History segments, now filter chips inside the merged Play tab.
/// League, ladder and tournament matches appear here too — the server's
/// match list returns every match the viewer is in — tagged by
/// [PlayCompetitionTag].
///
/// Finding an opponent moved to Discover → Find players; the trailing
/// button goes there so a match can still start from Play.
class PlayMatchesTab extends StatefulWidget {
  const PlayMatchesTab({super.key, this.initialFilter});

  final MatchSegment? initialFilter;

  @override
  State<PlayMatchesTab> createState() => _PlayMatchesTabState();
}

class _PlayMatchesTabState extends State<PlayMatchesTab> {
  late MatchSegment _filter;

  @override
  void initState() {
    super.initState();
    _filter = widget.initialFilter ?? MatchSegment.active;
  }

  @override
  void didUpdateWidget(covariant PlayMatchesTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialFilter != widget.initialFilter &&
        widget.initialFilter != null) {
      setState(() => _filter = widget.initialFilter!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final chips = <(MatchSegment, String)>[
      (MatchSegment.challenges, l10n.playTabChallenges),
      (MatchSegment.active, l10n.playTabActive),
      (MatchSegment.history, l10n.playTabHistory),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: Row(
            children: [
              for (final (segment, label) in chips) ...[
                DriftFilterChip(
                  label: label,
                  selected: _filter == segment,
                  onTap: () => setState(() => _filter = segment),
                ),
                const SizedBox(width: 8),
              ],
              const SizedBox(width: 4),
              _FindOpponentButton(
                onTap: () => context.go('/home?tab=discover&discover=players'),
              ),
            ],
          ),
        ),
        Expanded(
          child: switch (_filter) {
            MatchSegment.challenges => const PlayChallengesTab(),
            MatchSegment.active => const PlayActiveTab(),
            MatchSegment.history => const PlayHistoryTab(),
          },
        ),
      ],
    );
  }
}

class _FindOpponentButton extends StatelessWidget {
  const _FindOpponentButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: colors.primaryLight,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.person_search_outlined, size: 18, color: colors.primary),
            const SizedBox(width: 6),
            Text(
              context.l10n.playFindOpponent,
              style: type.label.copyWith(
                color: colors.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
