import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_competition_card.dart';
import '../data/expansion_repository.dart';

const _muted = Color(0xFF94A3B8);

/// Ladders segment — browse and open the rung standings (redesign 2026-10).
///
/// The mock's Ladders tab shows one ladder's rungs: ranked rows with medals,
/// points and a movement delta. That is this app's *ladder detail* screen
/// (`/compete/ladders/:id`, which already renders the standings table) — the
/// tab itself is the index of every ladder a player can open, which is the
/// "two listings" collapse the 2026-08 pass settled on. So the tab keeps its
/// index role and takes the redesign's card, rather than pinning one
/// arbitrary ladder's rungs here.
class LadderListScreen extends ConsumerWidget {
  const LadderListScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ladders = ref.watch(laddersListProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    final content = RefreshIndicator(
      onRefresh: () => ref.refresh(laddersListProvider.future),
      child: switch (ladders) {
        AsyncData(:final value) when value.isEmpty => _message(
          'No ladders yet. Ask your club to start one.',
        ),
        AsyncData(:final value) => ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          itemCount: value.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => _LadderCard(ladder: value[i], index: i),
        ),
        AsyncError() => _message("Couldn't load ladders."),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );

    if (embedded) return content;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text('Ladders', style: type.h2),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }

  Widget _message(String text) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, height: 1.4, color: _muted),
          ),
        ),
      ],
    );
  }
}

class _LadderCard extends StatelessWidget {
  const _LadderCard({required this.ladder, required this.index});

  final LadderSummary ladder;
  final int index;

  @override
  Widget build(BuildContext context) {
    final accent = driftCompetitionAccent(index);

    return DriftCompetitionCard(
      leading: DriftCompetitionIconTile(
        icon: Icons.stairs_rounded,
        accent: accent,
      ),
      title: ladder.name,
      details: [
        // `clubName` is '' when the payload carried no club.
        if (ladder.clubName.isNotEmpty)
          DriftCompetitionDetail(
            icon: Icons.location_on,
            label: ladder.clubName,
          ),
        DriftCompetitionDetail(
          icon: Icons.group,
          label:
              '${ladder.entryCount} '
              '${ladder.entryCount == 1 ? 'player' : 'players'}',
        ),
      ],
      action: DriftCompetitionActionButton(
        label: 'View',
        style: DriftCompetitionActionStyle.filled,
        accent: accent,
        onTap: () => context.push('/compete/ladders/${ladder.id}'),
      ),
      onTap: () => context.push('/compete/ladders/${ladder.id}'),
    );
  }
}
