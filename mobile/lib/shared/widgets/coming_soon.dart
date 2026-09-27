import 'package:flutter/material.dart';

/// Shown when a tap lands on a feature that isn't live yet.
Future<void> showComingSoon(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Coming soon'),
      content: const Text(
        "Google and Apple sign-in aren't ready yet — we're still setting "
        "them up. Please continue with email for now.",
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Got it'),
        ),
      ],
    ),
  );
}
