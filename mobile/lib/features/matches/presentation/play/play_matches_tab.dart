import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_segmented_filter.dart';
import '../../../../shared/widgets/motion/fade_switcher.dart';
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
    const segments = [
      MatchSegment.challenges,
      MatchSegment.active,
      MatchSegment.history,
    ];

    // Second-level control: a segmented track, visibly quieter than the
    // section pills above it, so the two rows don't read as one group.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 12, 12),
          child: Row(
            children: [
              Expanded(
                child: DriftSegmentedFilter(
                  labels: [
                    l10n.playTabChallenges,
                    l10n.playTabActive,
                    l10n.playTabHistory,
                  ],
                  selected: segments.indexOf(_filter),
                  onChanged: (i) => setState(() => _filter = segments[i]),
                ),
              ),
              const SizedBox(width: 4),
              _FindOpponentButton(
                onTap: () => context.go('/home?tab=discover&discover=players'),
              ),
            ],
          ),
        ),
        Expanded(
          child: DriftFadeSwitcher(
            child: KeyedSubtree(
              key: ValueKey(_filter),
              child: switch (_filter) {
                MatchSegment.challenges => const PlayChallengesTab(),
                MatchSegment.active => const PlayActiveTab(),
                MatchSegment.history => const PlayHistoryTab(),
              },
            ),
          ),
        ),
      ],
    );
  }
}

/// Compact icon + text link at the end of the filter row. Styled as a link
/// (no filled pill) so it isn't mistaken for a fourth filter segment.
class _FindOpponentButton extends StatelessWidget {
  const _FindOpponentButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Semantics(
      button: true,
      label: context.l10n.playFindOpponent,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.person_search_outlined,
                  size: 18,
                  color: colors.primary,
                ),
                const SizedBox(width: 4),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 96),
                  child: Text(
                    context.l10n.playFindOpponent,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: type.caption.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.w700,
                      height: 1.15,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
