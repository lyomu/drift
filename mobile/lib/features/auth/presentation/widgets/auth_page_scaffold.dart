import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';

/// White, scrollable page shell for the redesigned auth screens
/// (Join the Court, Login). A circular grey back button sits top-left;
/// [child] scrolls beneath it with 28px side padding.
class AuthPageScaffold extends StatelessWidget {
  const AuthPageScaffold({
    super.key,
    required this.child,
    this.fallbackRoute = '/intro',
  });

  final Widget child;

  /// Where the back button goes when there is nothing on the nav stack to
  /// pop to (e.g. Join the Court, reached via `context.go`).
  final String fallbackRoute;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
              child: _BackButton(
                onTap: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go(fallbackRoute);
                  }
                },
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 0, 28, 32),
                child: child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  const _BackButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: const Color(0xFFF3F4F6),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(Icons.chevron_left, size: 22, color: colors.textPrimary),
        ),
      ),
    );
  }
}
