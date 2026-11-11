import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/swing_check/data/native_pose_channel.dart';
import '../../features/swing_check/swing_check_config.dart';
import '../l10n/l10n.dart';
import '../theme/drift_colors.dart';

const _font = 'Outfit';

/// Floating "AI Coach" entry point. Opens a small menu with Swing Check and
/// clip analysis. Until Swing Check launches (`DRIFT_SWING_CHECK`), a tap still
/// shows the "Coming soon" tooltip, as before.
class AiCoachFab extends StatefulWidget {
  const AiCoachFab({super.key});

  @override
  State<AiCoachFab> createState() => _AiCoachFabState();
}

class _AiCoachFabState extends State<AiCoachFab> {
  final _tooltipKey = GlobalKey<TooltipState>();

  Future<void> _openMenu(BuildContext context) async {
    // Swing Check needs Android 13+ or iOS 15+. On older phones it's left out
    // of the menu; the rest of the app works as usual.
    final swingCheckSupported = await const NativePoseChannel().isSupported();
    if (!context.mounted) return;
    final l10n = context.l10n;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (swingCheckSupported)
              ListTile(
                leading: const Icon(Icons.accessibility_new_rounded),
                title: Text(l10n.swingCheckTitle),
                subtitle: Text(l10n.aiCoachSwingCheckSubtitle),
                onTap: () {
                  Navigator.of(sheetContext).pop();
                  context.push('/swing-check');
                },
              ),
            ListTile(
              leading: const Icon(Icons.videocam_outlined),
              title: Text(l10n.settingsAnalyseClip),
              subtitle: Text(l10n.aiCoachAnalyseClipSubtitle),
              onTap: () {
                Navigator.of(sheetContext).pop();
                context.push('/video-analysis');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

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
        onPressed: kSwingCheckEnabled
            ? () => _openMenu(context)
            : () => _tooltipKey.currentState?.ensureTooltipVisible(),
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
