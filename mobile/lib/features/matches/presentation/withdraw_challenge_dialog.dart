import 'package:flutter/material.dart';

Future<bool> confirmWithdrawChallenge(BuildContext context) async {
  return await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Undo this challenge?'),
          content: const Text(
            'The invited player will be told that the challenge was withdrawn.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Keep challenge'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Undo challenge'),
            ),
          ],
        ),
      ) ??
      false;
}
