import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';
import 'motion/motion_tokens.dart';

/// Second-level filter: a compact segmented control that sits *under* a row
/// of [DriftPillTabs]. Deliberately quieter than the pills — one tinted track
/// with a raised thumb behind the current segment instead of solid blue — so
/// the two rows read as "section" and "filter within the section" rather
/// than one long run of identical buttons.
class DriftSegmentedFilter extends StatelessWidget {
  const DriftSegmentedFilter({
    super.key,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onChanged;

  static const _height = 44.0;
  static const _inset = 3.0;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final duration = DriftMotion.reduced(context)
        ? Duration.zero
        : const Duration(milliseconds: 220);

    final track = isDark
        ? Color.alphaBlend(Colors.white.withValues(alpha: 0.05), colors.surface)
        : Color.alphaBlend(
            colors.primary.withValues(alpha: 0.06),
            colors.surfaceRaised,
          );
    final thumb = isDark
        ? Color.alphaBlend(
            colors.primary.withValues(alpha: 0.18),
            colors.surface,
          )
        : colors.surface;

    // x position of the thumb, from -1 (first) to 1 (last).
    final x = labels.length < 2 ? 0.0 : -1 + 2 * selected / (labels.length - 1);

    return Container(
      height: _height,
      padding: const EdgeInsets.all(_inset),
      decoration: BoxDecoration(
        color: track,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.border.withValues(alpha: 0.6)),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: duration,
            curve: DriftMotion.enter,
            alignment: Alignment(x, 0),
            child: FractionallySizedBox(
              widthFactor: 1 / labels.length,
              heightFactor: 1,
              child: Container(
                decoration: BoxDecoration(
                  color: thumb,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: isDark
                      ? null
                      : [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                ),
              ),
            ),
          ),
          Row(
            children: [
              for (var i = 0; i < labels.length; i++)
                Expanded(
                  child: Semantics(
                    button: true,
                    selected: i == selected,
                    child: InkWell(
                      onTap: () => onChanged(i),
                      borderRadius: BorderRadius.circular(9),
                      child: Center(
                        child: AnimatedDefaultTextStyle(
                          duration: duration,
                          style: type.label.copyWith(
                            fontWeight: i == selected
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: i == selected
                                ? colors.primary
                                : colors.textSecondary,
                          ),
                          child: Text(
                            labels[i],
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
