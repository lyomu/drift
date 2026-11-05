import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../application/padel_providers.dart';
import '../data/padel_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Padel Preferences & Goals — `foundation/04-screen-inventory.md` §A.10.
class PadelPreferencesGoalsScreen extends ConsumerWidget {
  const PadelPreferencesGoalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(padelProfileProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftScaffold(
      title: context.l10n.padelPrefsGoals,
      body: switch (profile) {
        AsyncData(:final value) when value != null => _PreferencesForm(
          profile: value,
        ),
        AsyncError() => Center(
          child: Text(context.l10n.padelProfileFailed, style: type.body),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _PreferencesForm extends ConsumerStatefulWidget {
  const _PreferencesForm({required this.profile});

  final PadelProfile profile;

  @override
  ConsumerState<_PreferencesForm> createState() => _PreferencesFormState();
}

class _PreferencesFormState extends ConsumerState<_PreferencesForm> {
  late PadelSide? _preferredSide = widget.profile.preferredSide;
  late final _partnerPreferenceController = TextEditingController(
    text: widget.profile.partnerPreference ?? '',
  );
  late final _goalsController = TextEditingController(
    text: widget.profile.goals.join(', '),
  );
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _partnerPreferenceController.dispose();
    _goalsController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });
    try {
      final goals = _goalsController.text
          .split(',')
          .map((g) => g.trim())
          .where((g) => g.isNotEmpty)
          .toList();
      await ref
          .read(padelRepositoryProvider)
          .updatePreferences(
            preferredSide: _preferredSide,
            partnerPreference: _partnerPreferenceController.text.trim(),
            goals: goals,
          );
      ref.invalidate(padelProfileProvider);
      if (!mounted) return;
      Navigator.of(context).pop();
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            context.l10n.padelPreferredSide,
            style: Theme.of(context).textTheme.labelLarge,
          ),
          const SizedBox(height: DriftSpacing.s2),
          Wrap(
            spacing: DriftSpacing.s2,
            children: PadelSide.values
                .map(
                  (side) => DriftFilterChip(
                    label: side.label,
                    selected: _preferredSide == side,
                    onTap: () => setState(() => _preferredSide = side),
                  ),
                )
                .toList(),
          ),
          const SizedBox(height: DriftSpacing.s4),
          DriftTextField(
            label: context.l10n.padelPartnerPreference,
            controller: _partnerPreferenceController,
            hintText: context.l10n.padelPartnerHint,
            maxLines: 3,
          ),
          const SizedBox(height: DriftSpacing.s4),
          DriftTextField(
            label: context.l10n.learnGoals,
            controller: _goalsController,
            hintText: context.l10n.padelGoalsHint,
            maxLines: 3,
          ),
          if (_errorText != null) ...[
            const SizedBox(height: DriftSpacing.s3),
            Text(_errorText!, style: TextStyle(color: colors.error)),
          ],
          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: _isSubmitting
                ? context.l10n.commonSaving
                : context.l10n.commonSave,
            onPressed: _isSubmitting ? null : _save,
          ),
        ],
      ),
    );
  }
}
