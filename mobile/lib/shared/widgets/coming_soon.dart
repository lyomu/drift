import 'package:flutter/material.dart';

/// Shown when a tap lands on a feature that isn't live yet.
Future<void> showComingSoon(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Coming soon'),
      content: const Text(
        "Apple sign-in isn't ready yet — we're still setting it up. Please "
        "continue with Google or email for now.",
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
