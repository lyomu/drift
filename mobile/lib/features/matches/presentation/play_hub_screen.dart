import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import '../../players/presentation/player_filters_sheet.dart';
import 'play/play_active_tab.dart';
import 'play/play_challenges_tab.dart';
import 'play/play_find_tab.dart';
import 'play/play_history_tab.dart';

/// Play Hub — `foundation/04-screen-inventory.md` §A.4 (redesign 2026-08).
/// Scrollable pill tabs: Find / Challenges / Active / History.
class PlayHubScreen extends ConsumerStatefulWidget {
  const PlayHubScreen({super.key, this.initialSegment});

  final int? initialSegment;

  @override
  ConsumerState<PlayHubScreen> createState() => _PlayHubScreenState();
}

class _PlayHubScreenState extends ConsumerState<PlayHubScreen> {
  late int _segment;

  static const _labels = ['Find', 'Challenges', 'Active', 'History'];

  @override
  void initState() {
    super.initState();
    _segment = widget.initialSegment ?? 0;
  }

  @override
  void didUpdateWidget(covariant PlayHubScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialSegment != widget.initialSegment &&
        widget.initialSegment != null) {
      setState(() => _segment = widget.initialSegment!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Play',
                    style: type.h2.copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
                DriftHeaderSquareButton(
                  icon: Icons.tune,
                  onTap: () => showPlayerFiltersSheet(context, ref),
                ),
              ],
            ),
          ),
          DriftPillTabs(
            labels: _labels,
            selected: _segment,
            onChanged: (i) => setState(() => _segment = i),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Container(
              color: colors.background,
              child: switch (_segment) {
                0 => const PlayFindTab(),
                1 => const PlayChallengesTab(),
                2 => const PlayActiveTab(),
                _ => const PlayHistoryTab(),
              },
            ),
          ),
        ],
      ),
    );
  }
}
