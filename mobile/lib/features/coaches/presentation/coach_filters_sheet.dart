import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../application/coaches_providers.dart';
import '../data/coaches_repository.dart';

Future<void> showCoachFiltersSheet(BuildContext context, WidgetRef ref) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => const _CoachFiltersSheet(),
  );
}

class _CoachFiltersSheet extends ConsumerStatefulWidget {
  const _CoachFiltersSheet();

  @override
  ConsumerState<_CoachFiltersSheet> createState() =>
      _CoachFiltersSheetState();
}

class _CoachFiltersSheetState extends ConsumerState<_CoachFiltersSheet> {
  late CoachFilters _draft;
  late final TextEditingController _specialisationController;
  late final TextEditingController _clubController;

  @override
  void initState() {
    super.initState();
    _draft = ref.read(coachFiltersProvider);
    _specialisationController = TextEditingController(
      text: _draft.specialisation,
    );
    _clubController = TextEditingController(text: _draft.clubName);
  }

  @override
  void dispose() {
    _specialisationController.dispose();
    _clubController.dispose();
    super.dispose();
  }

  void _apply() {
    ref.read(coachFiltersProvider.notifier).state = _draft.copyWith(
      specialisation: _specialisationController.text.trim(),
      clubName: _draft.clubId == null ? _clubController.text.trim() : null,
    );
    Navigator.of(context).pop();
  }

  void _reset() {
    ref.read(coachFiltersProvider.notifier).state = const CoachFilters();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          DriftSpacing.s5,
          0,
          DriftSpacing.s5,
          MediaQuery.viewInsetsOf(context).bottom + DriftSpacing.s5,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Coach filters', style: type.h3),
              const SizedBox(height: DriftSpacing.s4),
              DriftTextField(
                label: 'Specialisation',
                hintText: 'e.g. Serve, juniors, match play',
                controller: _specialisationController,
              ),
              const SizedBox(height: DriftSpacing.s4),
              if (_draft.clubId == null)
                DriftTextField(
                  label: 'Club',
                  hintText: 'Search by club name',
                  controller: _clubController,
                )
              else
                Text('Club: ${_draft.clubName ?? 'Selected club'}', style: type.body),
              const SizedBox(height: DriftSpacing.s4),
              Text('Players coached', style: type.label),
              const SizedBox(height: DriftSpacing.s2),
              Wrap(
                spacing: DriftSpacing.s2,
                runSpacing: DriftSpacing.s2,
                children: [
                  for (final level in CoachLevel.values)
                    DriftFilterChip(
                      label: level.label,
                      selected: _draft.level == level,
                      onTap: () => setState(() {
                        _draft = _draft.level == level
                            ? _draft.copyWith(clearLevel: true)
                            : _draft.copyWith(level: level);
                      }),
                    ),
                ],
              ),
              const SizedBox(height: DriftSpacing.s6),
              DriftButton(label: 'Apply filters', onPressed: _apply),
              DriftButton(
                label: 'Reset',
                variant: DriftButtonVariant.text,
                onPressed: _reset,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
