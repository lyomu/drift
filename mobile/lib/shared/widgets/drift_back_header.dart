import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';

/// In-app detail-screen header (`DESIGN_SPEC.md` §4 "Back Header"): a 36×36
/// white/bordered chevron button + title, with an optional trailing action.
/// 12px top, 16px sides.
class DriftBackHeader extends StatelessWidget {
  const DriftBackHeader({
    super.key,
    required this.title,
    this.onBack,
    this.trailing,
  });

  final String title;
  final VoidCallback? onBack;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
      child: Row(
        children: [
          _SquareButton(
            icon: Icons.chevron_left,
            onTap:
                onBack ??
                () {
                  if (context.canPop()) context.pop();
                },
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: type.h3.copyWith(fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// 36×36 white square with a 1px border and a centred icon — also used on its
/// own for the header's trailing action (chat, share…).
class DriftHeaderSquareButton extends StatelessWidget {
  const DriftHeaderSquareButton({
    super.key,
    required this.icon,
    required this.onTap,
  });

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => _SquareButton(icon: icon, onTap: onTap);
}

class _SquareButton extends StatelessWidget {
  const _SquareButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: colors.border),
          ),
          child: Icon(icon, size: 20, color: colors.textPrimary),
        ),
      ),
    );
  }
}
