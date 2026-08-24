import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../auth/data/auth_repository.dart';
import '../application/padel_providers.dart';
import '../data/padel_repository.dart';

/// Add Padel — confirm intent — `foundation/03-user-journeys.md` §9.
/// "Confirms intent to add Padel" before the separate adaptive assessment.
class AddPadelScreen extends ConsumerStatefulWidget {
  const AddPadelScreen({super.key});

  @override
  ConsumerState<AddPadelScreen> createState() => _AddPadelScreenState();
}

class _AddPadelScreenState extends ConsumerState<AddPadelScreen> {
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _confirm() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      await ref.read(padelRepositoryProvider).addPadel();
      ref.invalidate(padelProfileProvider);
      if (!mounted) return;
      context.pushReplacement('/profile/padel/assessment');
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Add Padel')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(
                Icons.sports_baseball_outlined,
                size: 56,
                color: colors.primary,
              ),
              const SizedBox(height: DriftSpacing.s4),
              Text('Add Padel to your profile', style: type.h3),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                "You'll complete a short adaptive assessment scoped to "
                "Padel — rally consistency, net play, wall shots, and more. "
                "It generates a Padel Profile that's fully separate from "
                'your Tennis Profile.',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(
                label: _isSubmitting ? 'Adding…' : 'Start Padel Assessment',
                onPressed: _isSubmitting ? null : _confirm,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
