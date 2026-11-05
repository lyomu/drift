import 'package:flutter/material.dart';

import '../l10n/l10n.dart';
import '../theme/drift_colors.dart';

const _font = 'Outfit';

/// Floating "AI Coach" entry point for clip analysis. The feature isn't ready,
/// so a tap only pops a "Coming soon" tooltip above the button — it does not
/// navigate to `/video-analysis`.
class AiCoachFab extends StatefulWidget {
  const AiCoachFab({super.key});

  @override
  State<AiCoachFab> createState() => _AiCoachFabState();
}

class _AiCoachFabState extends State<AiCoachFab> {
  final _tooltipKey = GlobalKey<TooltipState>();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final l10n = context.l10n;

    return Tooltip(
      key: _tooltipKey,
      message: l10n.commonComingSoon,
      triggerMode: TooltipTriggerMode.manual,
      preferBelow: false,
      showDuration: const Duration(seconds: 2),
      textStyle: const TextStyle(
        fontFamily: _font,
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      child: FloatingActionButton.extended(
        heroTag: 'ai-coach-fab',
        onPressed: () => _tooltipKey.currentState?.ensureTooltipVisible(),
        backgroundColor: colors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.auto_awesome_rounded, size: 20),
        label: Text(
          l10n.aiCoachLabel,
          style: const TextStyle(
            fontFamily: _font,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
