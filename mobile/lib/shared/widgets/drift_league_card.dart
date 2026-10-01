import 'package:flutter/material.dart';

import '../../features/competitions/data/competitions_repository.dart';
import 'drift_competition_card.dart';

/// League Card (redesign 2026-10). White card with a trophy tile, the
/// league's name, its format, where it is played and how many have enrolled,
/// plus a Join / Joined action.
///
/// The gradient tile this replaces carried the name and a format pill and
/// nothing else. The fields behind the new lines were already on the list
/// payload (`enrolledCount`) or were added to it for this card
/// (`clubName`, `viewerRegistrationStatus`); anything the API does not send is
/// simply not rendered, so a league with no club shows no location row rather
/// than a placeholder.
///
/// There is no level band on the card: the mock shows one, but nothing in
/// `League` or the league payload models a level, and inventing one would put
/// a number on a league that the league does not have.
class DriftLeagueCard extends StatelessWidget {
  const DriftLeagueCard({
    super.key,
    required this.league,
    this.accentIndex = 0,
    this.onTap,
    this.onJoin,
  });

  final League league;

  /// Position in the list, which picks the tile's accent.
  final int accentIndex;

  final VoidCallback? onTap;

  /// Defaults to [onTap] — registration happens on the league's own screen,
  /// so the button and the card lead to the same place unless a caller
  /// wires something else.
  final VoidCallback? onJoin;

  @override
  Widget build(BuildContext context) {
    final accent = driftCompetitionAccent(accentIndex);
    final joined = league.viewerHasPlace;
    final enrolled = league.enrolledCount;

    return DriftCompetitionCard(
      leading: DriftCompetitionIconTile(
        icon: Icons.emoji_events_rounded,
        accent: accent,
      ),
      title: league.name,
      badge: league.format == 'DOUBLES' ? 'Doubles' : 'Singles',
      badgeAccent: accent,
      details: [
        if (league.clubName != null)
          DriftCompetitionDetail(
            icon: Icons.location_on,
            label: league.clubName!,
          ),
        if (enrolled != null)
          DriftCompetitionDetail(
            icon: Icons.group,
            label: league.capacity == null
                ? '$enrolled ${enrolled == 1 ? 'member' : 'members'}'
                : '$enrolled/${league.capacity} members',
          ),
      ],
      action: DriftCompetitionActionButton(
        label: joined
            ? (league.viewerRegistrationStatus ==
                      SeasonRegistrationStatus.waitlisted
                  ? 'Waitlisted'
                  : 'Joined')
            : 'Join',
        style: joined
            ? DriftCompetitionActionStyle.selected
            : DriftCompetitionActionStyle.filled,
        onTap: onJoin ?? onTap,
      ),
      onTap: onTap,
    );
  }
}
