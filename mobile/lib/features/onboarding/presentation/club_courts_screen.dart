import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

/// Club / Preferred Courts — `foundation/03-user-journeys.md` §2. Free-text
/// only this checkpoint (Courts/Clubs modules land in Phase M9); optional
/// and skippable.
class ClubCourtsScreen extends ConsumerStatefulWidget {
  const ClubCourtsScreen({super.key});

  @override
  ConsumerState<ClubCourtsScreen> createState() => _ClubCourtsScreenState();
}

class _ClubCourtsScreenState extends ConsumerState<ClubCourtsScreen> {
  final _clubController = TextEditingController();
  final _courtController = TextEditingController();
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _clubController.dispose();
    _courtController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final club = _clubController.text.trim();
      final court = _courtController.text.trim();
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateClubCourts(
            preferredClubName: club.isEmpty ? null : club,
            preferredCourtNames: court.isEmpty ? [] : [court],
          );
      if (!mounted) return;
      goToOnboardingStep(context, nextStep);
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Club / Preferred Courts')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('No club yet? Skip for now.'),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: 'Club name (optional)',
                controller: _clubController,
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: 'Preferred court (optional)',
                controller: _courtController,
              ),
              if (_errorText != null) ...[
                const SizedBox(height: DriftSpacing.s3),
                Text(_errorText!, style: TextStyle(color: colors.error)),
              ],
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(
                label: _isSubmitting ? 'Saving…' : 'Continue',
                onPressed: _isSubmitting ? null : _submit,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Center(
                child: DriftButton(
                  label: 'Skip',
                  variant: DriftButtonVariant.text,
                  onPressed: _isSubmitting ? null : _submit,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
