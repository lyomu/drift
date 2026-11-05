import 'package:flutter/material.dart';
import '../../../core/l10n/l10n.dart';

Future<bool> confirmWithdrawChallenge(BuildContext context) async {
  return await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(context.l10n.withdrawTitle),
          content: Text(context.l10n.withdrawBody),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(context.l10n.withdrawKeep),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(context.l10n.matchUndoChallenge),
            ),
          ],
        ),
      ) ??
      false;
}
