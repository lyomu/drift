import 'package:flutter/material.dart';

import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import 'buttons/drift_button.dart';

/// Standard "something failed, try again" block.
///
/// Ten screens had already hand-rolled this same message-plus-retry column,
/// and the ones that hadn't (Match Detail, Play Hub) simply left users stuck
/// on a dead end with no way back. Extracting it makes the convention
/// enforceable rather than a thing each screen remembers or forgets.
///
/// A retry affordance is never optional: `RefreshIndicator` alone doesn't
/// count, because a pull gesture on an error state is undiscoverable.
class DriftErrorRetry extends StatelessWidget {
  const DriftErrorRetry({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(DriftSpacing.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, style: type.body, textAlign: TextAlign.center),
            const SizedBox(height: DriftSpacing.s4),
            DriftButton(
              label: 'Retry',
              variant: DriftButtonVariant.text,
              onPressed: onRetry,
            ),
          ],
        ),
      ),
    );
  }
}
