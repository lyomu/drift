import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/players_providers.dart';
import '../data/players_repository.dart';
import 'player_filters_sheet.dart';

/// Player Search / Discovery — `foundation/04-screen-inventory.md` §A.4
/// (redesign 2026-08: `App.tsx` `DiscoverPlayersTab`). Results are ranked
/// server-side (proximity + level compatibility); the search box filters the
/// loaded page by name (the API has no text query).
///
/// Renders [embedded] inside the Discover Hub, which already supplies the
/// title and SafeArea.
class PlayerSearchScreen extends ConsumerStatefulWidget {
  const PlayerSearchScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  ConsumerState<PlayerSearchScreen> createState() => _PlayerSearchScreenState();
}

class _PlayerSearchScreenState extends ConsumerState<PlayerSearchScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final results = ref.watch(playerSearchProvider);
    final filtersActive = !ref.watch(playerFiltersProvider).isEmpty;

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!widget.embedded)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Text(
              'Players',
              style: type.h2.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: colors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.border, width: 1.5),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.search, size: 18, color: colors.textSecondary),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          onChanged: (v) => setState(() => _query = v),
                          style: type.body,
                          cursorColor: colors.primary,
                          decoration: InputDecoration(
                            isDense: true,
                            filled: false,
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            hintText: 'Search players…',
                            hintStyle: type.body.copyWith(
                              color: colors.textSecondary,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _FilterButton(
                active: filtersActive,
                onTap: () => showPlayerFiltersSheet(context, ref),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(playerSearchProvider.future),
            child: switch (results) {
              AsyncData(:final value) => _list(_filter(value)),
              AsyncError() => _message("Couldn't load players. Pull to retry."),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );

    return widget.embedded ? content : SafeArea(child: content);
  }

  List<PlayerSummary> _filter(List<PlayerSummary> players) {
    if (_query.trim().isEmpty) return players;
    final q = _query.trim().toLowerCase();
    return players
        .where((p) => p.displayName.toLowerCase().contains(q))
        .toList();
  }

  Widget _list(List<PlayerSummary> players) {
    if (players.isEmpty) {
      return _message(
        'No players match these filters — try widening distance or level '
        'range.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      itemCount: players.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) => _PlayerRow(player: players[i]),
    );
  }

  Widget _message(String text) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.active, required this.onTap});

  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colors.border, width: 1.5),
          ),
          child: Icon(
            Icons.tune,
            size: 18,
            color: active ? colors.primary : colors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _PlayerRow extends StatelessWidget {
  const _PlayerRow({required this.player});

  final PlayerSummary player;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final meta = [
      if (player.level != null && player.levelLabel != null)
        'Level ${player.level!.toStringAsFixed(1)} · ${player.levelLabel}',
      if (player.distanceBand != null) player.distanceBand!,
      if (player.generalLocation != null) player.generalLocation!,
    ].join(' · ');

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () => context.push('/players/${player.id}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DriftPlayerAvatar(player: player, radius: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  player.displayName,
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  meta,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
                if (player.availabilitySummary != null) ...[
                  const SizedBox(height: 6),
                  DriftPill(label: player.availabilitySummary!),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          _ConnectButton(playerId: player.id),
        ],
      ),
    );
  }
}

class _ConnectButton extends StatelessWidget {
  const _ConnectButton({required this.playerId});

  final String playerId;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Material(
      color: colors.primary,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/players/$playerId'),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(
            'Connect',
            style: type.caption.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
