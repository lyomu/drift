import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

const _formatOptions = [
  ('SINGLES', 'Singles'),
  ('DOUBLES', 'Doubles'),
  ('EITHER', 'Either'),
];
const _styleOptions = [
  ('SOCIAL', 'Social'),
  ('COMPETITIVE', 'Competitive'),
  ('EITHER', 'Either'),
];
const _timeOptions = [
  ('MORNING', 'Morning'),
  ('AFTERNOON', 'Afternoon'),
  ('EVENING', 'Evening'),
];

/// Playing Preferences — `foundation/03-user-journeys.md` §2.
class PlayingPreferencesScreen extends ConsumerStatefulWidget {
  const PlayingPreferencesScreen({super.key});

  @override
  ConsumerState<PlayingPreferencesScreen> createState() =>
      _PlayingPreferencesScreenState();
}

class _PlayingPreferencesScreenState
    extends ConsumerState<PlayingPreferencesScreen> {
  String? _format;
  String? _style;
  final Set<String> _times = {};
  bool _isSubmitting = false;
  String? _errorText;

  Future<void> _submit() async {
    if (_format == null || _style == null || _times.isEmpty) {
      setState(
        () => _errorText = 'Choose an option in each section to continue.',
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updatePreferences(
            formatPreference: _format!,
            stylePreference: _style!,
            preferredTimeSlots: _times.toList(),
          );
      if (!mounted) return;
      goToOnboardingStep(context, nextStep);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _chipGroup({
    required String title,
    required List<(String, String)> options,
    required bool Function(String) isSelected,
    required void Function(String) onTap,
  }) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: type.label),
        const SizedBox(height: DriftSpacing.s2),
        Wrap(
          spacing: DriftSpacing.s2,
          children: options
              .map(
                (o) => DriftFilterChip(
                  label: o.$2,
                  selected: isSelected(o.$1),
                  onTap: () => onTap(o.$1),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: DriftSpacing.s5),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Playing Preferences')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ListView(
                  children: [
                    _chipGroup(
                      title: 'Format',
                      options: _formatOptions,
                      isSelected: (v) => _format == v,
                      onTap: (v) => setState(() => _format = v),
                    ),
                    _chipGroup(
                      title: 'Style',
                      options: _styleOptions,
                      isSelected: (v) => _style == v,
                      onTap: (v) => setState(() => _style = v),
                    ),
                    _chipGroup(
                      title: 'Preferred times',
                      options: _timeOptions,
                      isSelected: (v) => _times.contains(v),
                      onTap: (v) => setState(() {
                        if (!_times.remove(v)) {
                          _times.add(v);
                        }
                      }),
                    ),
                  ],
                ),
              ),
              if (_errorText != null) ...[
                Text(_errorText!, style: TextStyle(color: colors.error)),
                const SizedBox(height: DriftSpacing.s3),
              ],
              DriftButton(
                label: _isSubmitting ? 'Saving…' : 'Continue',
                onPressed: _isSubmitting ? null : _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
