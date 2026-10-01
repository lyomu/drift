import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import 'widgets/onboarding_scaffold.dart';

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
    return DriftOnboardingScaffold(
      step: OnboardingStepIndex.clubCourts,
      title: 'Where do you play?',
      highlight: 'play?',
      subtitle: 'No club yet? Skip this one.',
      loading: _isSubmitting,
      onContinue: _isSubmitting ? null : _submit,
      errorText: _errorText,
      footer: DriftButton(
        label: 'Skip',
        variant: DriftButtonVariant.text,
        onPressed: _isSubmitting ? null : _submit,
      ),
      children: [
        DriftTextField(
          label: 'Club name (optional)',
          controller: _clubController,
        ),
        const SizedBox(height: DriftSpacing.s4),
        DriftTextField(
          label: 'Preferred court (optional)',
          controller: _courtController,
        ),
      ],
    );
  }
}
