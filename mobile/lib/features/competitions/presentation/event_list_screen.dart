import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';

const _ink = Color(0xFF0F172A);
const _subdued = Color(0xFF64748B);

/// Events segment (redesign 2026-10).
///
/// There is no events backend: nothing models a club event, an RSVP or an
/// attendee count, and no endpoint lists them. The redesign mock shows four
/// event cards, but they are invented data, so this tab says what is true
/// instead of rendering them.
///
/// The card shape those events will take is already built and waiting —
/// [DriftCompetitionCard] with a [DriftCompetitionDateTile] leading it and an
/// RSVP [DriftCompetitionActionButton] — so when the model lands this screen
/// becomes a list builder over it and nothing new has to be designed.
class EventListScreen extends StatelessWidget {
  const EventListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(32, 0, 32, 60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: colors.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: colors.primary.withValues(alpha: 0.16),
                  width: 1.5,
                ),
              ),
              child: Icon(
                Icons.calendar_month_rounded,
                size: 30,
                color: colors.primary,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Events coming soon',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                height: 1.3,
                color: _ink,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Club socials, clinics and mixers will appear here once your '
              'club starts running them.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, height: 1.5, color: _subdued),
            ),
          ],
        ),
      ),
    );
  }
}
