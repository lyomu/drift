import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/onboarding/onboarding_step_route.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';

const _dominantHands = [
  ('LEFT', 'Left'),
  ('RIGHT', 'Right'),
  ('AMBIDEXTROUS', 'Ambidextrous'),
];

/// Basic Profile — `foundation/04-screen-inventory.md` A.2. Photo upload is
/// deferred (P1 polish); this checkpoint stores `photoUrl` as null.
class BasicProfileScreen extends ConsumerStatefulWidget {
  const BasicProfileScreen({super.key});

  @override
  ConsumerState<BasicProfileScreen> createState() => _BasicProfileScreenState();
}

class _BasicProfileScreenState extends ConsumerState<BasicProfileScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  String? _dominantHand;
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_dominantHand == null) {
      setState(() => _errorText = 'Choose your playing hand to continue.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final nextStep = await ref
          .read(usersRepositoryProvider)
          .updateBasicProfile(
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
            dominantHand: _dominantHand!,
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
      appBar: AppBar(title: const Text('Basic Profile')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DriftTextField(
                label: 'First name',
                controller: _firstNameController,
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: 'Last name',
                controller: _lastNameController,
              ),
              const SizedBox(height: DriftSpacing.s6),
              Text(
                'Playing hand',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: DriftSpacing.s2),
              Wrap(
                spacing: DriftSpacing.s2,
                children: _dominantHands
                    .map(
                      (hand) => DriftFilterChip(
                        label: hand.$2,
                        selected: _dominantHand == hand.$1,
                        onTap: () => setState(() => _dominantHand = hand.$1),
                      ),
                    )
                    .toList(),
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
            ],
          ),
        ),
      ),
    );
  }
}
