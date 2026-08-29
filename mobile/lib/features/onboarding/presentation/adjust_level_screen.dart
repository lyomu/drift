import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';

/// Adjust Level — `foundation/04-screen-inventory.md` A.2. Manual override
/// of the suggested level; "Cancel" reverts to the suggested value.
class AdjustLevelScreen extends StatefulWidget {
  const AdjustLevelScreen({super.key, required this.suggestedLevel});

  final double suggestedLevel;

  @override
  State<AdjustLevelScreen> createState() => _AdjustLevelScreenState();
}

class _AdjustLevelScreenState extends State<AdjustLevelScreen> {
  late double _level = widget.suggestedLevel;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftScaffold(
      title: 'Adjust Level',
      body: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(child: Text(_level.toStringAsFixed(1), style: type.display)),
            Slider(
              value: _level,
              min: 1.0,
              max: 7.0,
              divisions: 60,
              label: _level.toStringAsFixed(1),
              onChanged: (value) => setState(() => _level = value),
            ),
            Text(
              'Suggested: ${widget.suggestedLevel.toStringAsFixed(1)}',
              style: type.body.copyWith(color: colors.textSecondary),
            ),
            const Spacer(),
            DriftButton(label: 'Save', onPressed: () => context.pop(_level)),
            const SizedBox(height: DriftSpacing.s2),
            Center(
              child: DriftButton(
                label: 'Cancel',
                variant: DriftButtonVariant.text,
                onPressed: () => context.pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
