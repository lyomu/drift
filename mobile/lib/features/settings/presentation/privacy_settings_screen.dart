import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../../users/data/users_repository.dart';
import '../application/settings_providers.dart';

/// Privacy Settings — `foundation/04-screen-inventory.md` §A.10. Closes the
/// open dependency M5's PROGRESS.md entry named: skill breakdown and
/// availability visibility become real per-user config here instead of the
/// hardcoded "connections only" gate `player.mapper.ts` used through M11.
class PrivacySettingsScreen extends ConsumerWidget {
  const PrivacySettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(privacySettingsProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftScaffold(
      title: 'Privacy Settings',
      body: switch (settings) {
        AsyncData(:final value) => _PrivacyForm(settings: value),
        AsyncError() => Center(
          child: Text("Couldn't load your privacy settings.", style: type.body),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _PrivacyForm extends ConsumerStatefulWidget {
  const _PrivacyForm({required this.settings});

  final PrivacySettings settings;

  @override
  ConsumerState<_PrivacyForm> createState() => _PrivacyFormState();
}

class _PrivacyFormState extends ConsumerState<_PrivacyForm> {
  late FieldVisibility _skillBreakdownVisibility =
      widget.settings.skillBreakdownVisibility;
  late FieldVisibility _availabilityVisibility =
      widget.settings.availabilityVisibility;
  bool _isSaving = false;

  Future<void> _update({
    FieldVisibility? skillBreakdownVisibility,
    FieldVisibility? availabilityVisibility,
  }) async {
    final previousSkill = _skillBreakdownVisibility;
    final previousAvailability = _availabilityVisibility;
    setState(() {
      _isSaving = true;
      if (skillBreakdownVisibility != null) {
        _skillBreakdownVisibility = skillBreakdownVisibility;
      }
      if (availabilityVisibility != null) {
        _availabilityVisibility = availabilityVisibility;
      }
    });

    try {
      await ref
          .read(usersRepositoryProvider)
          .updatePrivacySettings(
            skillBreakdownVisibility: skillBreakdownVisibility,
            availabilityVisibility: availabilityVisibility,
          );
    } on AuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _skillBreakdownVisibility = previousSkill;
        _availabilityVisibility = previousAvailability;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Development areas', style: type.title),
              const SizedBox(height: DriftSpacing.s1),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Show to everyone'),
                subtitle: const Text(
                  'Off means only your connections can see your skill '
                  'breakdown',
                ),
                value: _skillBreakdownVisibility == FieldVisibility.everyone,
                onChanged: _isSaving
                    ? null
                    : (value) => _update(
                        skillBreakdownVisibility: value
                            ? FieldVisibility.everyone
                            : FieldVisibility.connectionsOnly,
                      ),
              ),
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s3),
        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Availability', style: type.title),
              const SizedBox(height: DriftSpacing.s1),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Show to everyone'),
                subtitle: const Text(
                  'Off means only your connections can see your detailed '
                  'availability',
                ),
                value: _availabilityVisibility == FieldVisibility.everyone,
                onChanged: _isSaving
                    ? null
                    : (value) => _update(
                        availabilityVisibility: value
                            ? FieldVisibility.everyone
                            : FieldVisibility.connectionsOnly,
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
