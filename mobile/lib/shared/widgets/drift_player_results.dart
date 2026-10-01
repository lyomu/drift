import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/network/media_url.dart';
import '../../core/theme/drift_colors.dart';
import '../../features/players/data/players_repository.dart';

/// Ranked-player result list furniture, shared by Discover → Players and
/// Play → Find (redesign 2026-10). The two screens render the same search
/// bar and the same card; only the trailing action differs (Connect vs
/// Challenge), so that is the one thing the card takes from its caller.
///
/// Both screens read the same `playerSearchProvider` and the same
/// `playerFiltersProvider`, so keeping one card keeps them honest: a change
/// to how a player is summarised cannot land on one surface and not the other.

const _ink = Color(0xFF0F172A);
const _subdued = Color(0xFF64748B);
const _muted = Color(0xFF94A3B8);

/// Avatar tints, assigned by a stable hash of the player id so a given player
/// keeps the same colour across rebuilds and sessions. The API sends no colour
/// of its own, and cycling by list position would recolour people as results
/// re-rank.
const _avatarAccents = <Color>[
  Color(0xFF1A7AFF),
  Color(0xFF22C55E),
  Color(0xFF8B5CF6),
  Color(0xFFEC4899),
  Color(0xFFF97316),
];

/// The level badge follows the band, not the player, so two Intermediates
/// always read the same. Bands match `labelForLevel` on the server.
Color _levelAccent(double level) => level < 4.0
    ? const Color(0xFF22C55E)
    : level < 5.5
    ? const Color(0xFF1A7AFF)
    : const Color(0xFF8B5CF6);

/// The redesign's brand-tinted hairline (#E8EEFF / #E2EAFF against white),
/// derived from the theme so it tracks the palette.
Color _hairline(DriftColors colors, {double alpha = 0.1}) =>
    Color.alphaBlend(colors.primary.withValues(alpha: alpha), colors.surface);

/// Search field and filter button on their own white band, sitting directly
/// under the hub's tabs.
class DriftPlayerSearchBar extends StatelessWidget {
  const DriftPlayerSearchBar({
    super.key,
    required this.controller,
    required this.onChanged,
    required this.filtersActive,
    required this.onFilters,
    this.hintText = 'Search players…',
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  /// Tints the filter button so an applied filter is visible without opening
  /// the sheet.
  final bool filtersActive;
  final VoidCallback onFilters;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      color: colors.surface,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: colors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _hairline(colors, alpha: 0.18),
                  width: 1.5,
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  const Icon(Icons.search_rounded, size: 18, color: _muted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: controller,
                      onChanged: onChanged,
                      cursorColor: colors.primary,
                      style: const TextStyle(fontSize: 13, color: _ink),
                      decoration: InputDecoration(
                        isDense: true,
                        filled: false,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        hintText: hintText,
                        hintStyle: const TextStyle(
                          fontSize: 13,
                          color: _muted,
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
          const SizedBox(width: 10),
          _FilterButton(active: filtersActive, onTap: onFilters),
        ],
      ),
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
      color: active ? colors.primaryLight : colors.background,
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: active ? colors.primary : _hairline(colors, alpha: 0.18),
              width: 1.5,
            ),
          ),
          child: Icon(Icons.tune_rounded, size: 20, color: colors.primary),
        ),
      ),
    );
  }
}

/// One player in a ranked result list: avatar, name, level badge, location and
/// availability, with [action] in the top-right corner.
///
/// Tapping the card opens the player's profile; [action] handles its own tap.
class DriftPlayerResultCard extends StatelessWidget {
  const DriftPlayerResultCard({
    super.key,
    required this.player,
    required this.action,
  });

  final PlayerSummary player;

  /// The trailing button — [DriftPlayerActionButton] on both current callers.
  final Widget action;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final availability = player.availabilitySummary;

    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/players/${player.id}'),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _hairline(colors), width: 1.5),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Avatar(player: player),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          player.displayName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            height: 1.3,
                            color: _ink,
                          ),
                        ),
                        const SizedBox(height: 3),
                        _MetaRow(player: player),
                        if (player.generalLocation != null) ...[
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(
                                Icons.location_on,
                                size: 12,
                                color: _muted,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  player.generalLocation!,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    height: 1.3,
                                    color: _subdued,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  action,
                ],
              ),
              if (availability != null) ...[
                const SizedBox(height: 10),
                _AvailabilityChip(label: availability),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// "Level 4.5 · Intermediate · ~14 km". Each part is dropped when the API did
/// not send it, separators included.
class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.player});

  final PlayerSummary player;

  @override
  Widget build(BuildContext context) {
    final level = player.level;
    final trailing = [
      if (player.levelLabel != null) player.levelLabel!,
      if (player.distanceBand != null) player.distanceBand!,
    ];

    return Wrap(
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 4,
      runSpacing: 2,
      children: [
        if (level != null)
          Container(
            decoration: BoxDecoration(
              color: _levelAccent(level).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(999),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            child: Text(
              'Level ${level.toStringAsFixed(1)}',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                height: 1.4,
                color: _levelAccent(level),
              ),
            ),
          ),
        for (var i = 0; i < trailing.length; i++) ...[
          if (i > 0 || level != null)
            const Text(
              '·',
              style: TextStyle(fontSize: 11, height: 1.4, color: _subdued),
            ),
          Text(
            trailing[i],
            style: const TextStyle(fontSize: 11, height: 1.4, color: _subdued),
          ),
        ],
      ],
    );
  }
}

/// Photo when there is one, tinted initials otherwise. The tint is derived
/// from the id so it is stable per player.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.player});

  final PlayerSummary player;

  @override
  Widget build(BuildContext context) {
    final accent =
        _avatarAccents[player.id.hashCode.abs() % _avatarAccents.length];
    final initials = [player.firstName, player.lastName]
        .whereType<String>()
        .where((p) => p.isNotEmpty)
        .map((p) => p[0].toUpperCase())
        .take(2)
        .join();

    // Uploaded photos are stored as a path relative to the API origin, so
    // they go through `driftMediaUrl` before they can be fetched.
    final photoUrl = driftMediaUrl(player.photoUrl);

    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: accent.withValues(alpha: 0.1),
        border: Border.all(color: accent.withValues(alpha: 0.21), width: 2),
      ),
      child: ClipOval(
        child: photoUrl == null
            ? Center(child: _Initials(text: initials, accent: accent))
            : Image.network(
                photoUrl,
                fit: BoxFit.cover,
                // Without the error builder a dead or malformed URL throws on
                // every rebuild and leaves a blank circle with no fallback.
                errorBuilder: (_, _, _) =>
                    Center(child: _Initials(text: initials, accent: accent)),
              ),
      ),
    );
  }
}

class _Initials extends StatelessWidget {
  const _Initials({required this.text, required this.accent});

  final String text;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.isEmpty ? '?' : text,
      style: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w700,
        height: 1.2,
        color: accent,
      ),
    );
  }
}

class _AvailabilityChip extends StatelessWidget {
  const _AvailabilityChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      decoration: BoxDecoration(
        color: colors.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colors.primary.withValues(alpha: 0.13)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.schedule_rounded, size: 12, color: colors.primary),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                height: 1.4,
                color: colors.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// The filled pill in a result card's corner: "Connect" on Discover,
/// "Challenge" on Play.
///
/// Both prototypes toggle this to a sent/connected state in place, but
/// `PlayerSummary` carries no relationship state — the list endpoint does not
/// send one — so a toggle here would be showing a status the list cannot know.
/// Each caller instead sends the tap to the screen that owns the real action.
class DriftPlayerActionButton extends StatelessWidget {
  const DriftPlayerActionButton({
    super.key,
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withValues(alpha: 0.19),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: colors.primary,
        borderRadius: BorderRadius.circular(999),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                height: 1.2,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
