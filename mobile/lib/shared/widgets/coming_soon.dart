import 'package:flutter/material.dart';
import '../../core/l10n/l10n.dart';

/// Shown when a tap lands on a feature that isn't live yet.
Future<void> showComingSoon(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(context.l10n.comingSoon),
      content: Text(
        context.l10n.comingSoonApple,
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(context.l10n.commonGotIt),
        ),
      ],
    ),
  );
}
