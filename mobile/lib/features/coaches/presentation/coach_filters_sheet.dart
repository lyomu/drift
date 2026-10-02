import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_filter_sheet.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../application/coaches_providers.dart';
import '../data/coaches_repository.dart';

/// Coach Filters. Uses the app-wide [DriftFilterSheet] (2026-10).
Future<void> showCoachFiltersSheet(BuildContext context, WidgetRef ref) {
  return showDriftFilterSheet<void>(
    context: context,
    builder: (_) => const _CoachFiltersSheet(),
  );
}

class _CoachFiltersSheet extends ConsumerStatefulWidget {
  const _CoachFiltersSheet();

  @override
  ConsumerState<_CoachFiltersSheet> createState() => _CoachFiltersSheetState();
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

  /// The text fields are uncontrolled while the sheet is open, so they are
  /// read at apply time rather than mirrored into the draft on every keystroke.
  int get _activeCount =>
      (_specialisationController.text.trim().isEmpty ? 0 : 1) +
      (_draft.level != null ? 1 : 0) +
      (_draft.clubId != null || _clubController.text.trim().isNotEmpty ? 1 : 0);

  void _apply() {
    ref.read(coachFiltersProvider.notifier).state = _draft.copyWith(
      specialisation: _specialisationController.text.trim(),
      clubName: _draft.clubId == null ? _clubController.text.trim() : null,
    );
    Navigator.of(context).pop();
  }

  /// Clears in place rather than closing, so "Clear all" behaves the way it
  /// does on every other filter sheet — the old Reset button applied and
  /// dismissed in one go, which made it impossible to clear and re-pick.
  void _clear() {
    setState(() {
      _draft = const CoachFilters();
      _specialisationController.clear();
      _clubController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftFilterSheet(
      title: 'Coach filters',
      activeCount: _activeCount,
      onClear: _clear,
      onApply: _apply,
      sections: [
        DriftFilterSection(
          title: 'Specialisation',
          child: DriftTextField(
            label: '',
            hintText: 'e.g. Serve, juniors, match play',
            controller: _specialisationController,
            onChanged: (_) => setState(() {}),
          ),
        ),
        DriftFilterSection(
          title: 'Club',
          child: _draft.clubId == null
              ? DriftTextField(
                  label: '',
                  hintText: 'Search by club name',
                  controller: _clubController,
                  onChanged: (_) => setState(() {}),
                )
              : Text(_draft.clubName ?? 'Selected club', style: type.body),
        ),
        DriftFilterSection(
          title: 'Players coached',
          child: DriftFilterPills<CoachLevel>(
            options: [
              for (final level in CoachLevel.values)
                DriftFilterOption(value: level, label: level.label),
            ],
            isSelected: (level) => _draft.level == level,
            onTap: (level) => setState(() {
              _draft = _draft.level == level
                  ? _draft.copyWith(clearLevel: true)
                  : _draft.copyWith(level: level);
            }),
          ),
        ),
      ],
    );
  }
}
