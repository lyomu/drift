import 'package:flutter/material.dart';

import '../../../../shared/widgets/drift_section_header.dart';
import '../../../../core/theme/drift_colors.dart';

/// Home's banded layout (redesign 2026-10): each section is a white panel,
/// separated by a thick tinted rule rather than by whitespace.
///
/// The hero card, Action needed and Quick actions sit on the tinted ground
/// above the first band; everything from Next match down is panelled. That is
/// what gives the page its "dashboard at the top, feed below" split.

/// The ground between panels, and behind the top of the page.

/// One white section band. [title] and [actionLabel] render the standard
/// section header inside it.
class HomeSectionPanel extends StatelessWidget {
  const HomeSectionPanel({
    super.key,
    required this.title,
    required this.child,
    this.actionLabel,
    this.onAction,
    this.contentPadding = const EdgeInsets.symmetric(horizontal: 16),
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Widget child;

  /// Horizontal inset for [child]. Rails that bleed to the screen edge pass
  /// `EdgeInsets.zero` and inset their own scroll padding instead.
  final EdgeInsets contentPadding;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).extension<DriftColors>()!.surface,
      padding: EdgeInsets.symmetric(vertical: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: DriftSectionHeader(
              title: title,
              actionLabel: actionLabel,
              onAction: onAction,
            ),
          ),
          SizedBox(height: 12),
          Padding(padding: contentPadding, child: child),
        ],
      ),
    );
  }
}

/// The 8px rule between panels.
class HomeDivider extends StatelessWidget {
  const HomeDivider({super.key});

  @override
  Widget build(BuildContext context) =>
      SizedBox(height: 8, child: ColoredBox(color: Theme.of(context).extension<DriftColors>()!.surfaceRaised));
}
