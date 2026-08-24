import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../assessment/data/assessment_repository.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

const _pillarLabels = {
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'NET_PLAY': 'Net Play',
  'MOVEMENT': 'Movement',
  'MATCH_PLAY': 'Match Play',
  'COMPETITION_EXPERIENCE': 'Competition Experience',
};

/// Suggested Level Review — `foundation/03-user-journeys.md` §3.3.4.
class SuggestedLevelReviewScreen extends ConsumerStatefulWidget {
  const SuggestedLevelReviewScreen({super.key, required this.result});

  final AssessmentResult result;

  @override
  ConsumerState<SuggestedLevelReviewScreen> createState() =>
      _SuggestedLevelReviewScreenState();
}

class _SuggestedLevelReviewScreenState
    extends ConsumerState<SuggestedLevelReviewScreen> {
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _confirm() => _save(widget.result.level);

  Future<void> _save(double level) async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateLevel(level);
      if (!mounted) return;
      goToOnboardingStep(context, nextStep);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _adjust() async {
    final adjusted = await context.push<double>(
      '/onboarding/adjust-level',
      extra: widget.result.level,
    );
    if (adjusted != null) {
      await _save(adjusted);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Your Suggested Level')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Level ${widget.result.level.toStringAsFixed(1)}',
                style: type.display,
              ),
              Text(
                widget.result.label,
                style: type.title.copyWith(color: colors.primary),
              ),
              const SizedBox(height: DriftSpacing.s2),
              Text(
                'Based on your answers, this is where we think you fit. You can adjust it '
                'any time from your profile.',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              const SizedBox(height: DriftSpacing.s6),
              Expanded(
                child: ListView(
                  children: widget.result.skillBreakdown.entries.map((entry) {
                    final percent = (entry.value / 6).clamp(0.0, 1.0);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _pillarLabels[entry.key] ?? entry.key,
                            style: type.label,
                          ),
                          const SizedBox(height: DriftSpacing.s1),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: percent,
                              minHeight: 8,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
              if (_errorText != null) ...[
                Text(_errorText!, style: TextStyle(color: colors.error)),
                const SizedBox(height: DriftSpacing.s3),
              ],
              DriftButton(
                label: _isSubmitting ? 'Saving…' : 'Confirm Level',
                onPressed: _isSubmitting ? null : _confirm,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: DriftButton(
                  label: 'Adjust Level',
                  variant: DriftButtonVariant.text,
                  onPressed: _isSubmitting ? null : _adjust,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
