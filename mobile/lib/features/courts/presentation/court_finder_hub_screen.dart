import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../application/courts_providers.dart';
import 'court_filters_sheet.dart';
import 'court_list_view.dart';
import 'court_map_view.dart';

/// Court Finder Hub — `foundation/04-screen-inventory.md` §A.6. Map/List
/// toggle over one shared search (no separate "Court List" screen row in
/// the inventory — list is a segment inside this Hub, same as Map).
class CourtFinderHubScreen extends ConsumerStatefulWidget {
  const CourtFinderHubScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  ConsumerState<CourtFinderHubScreen> createState() =>
      _CourtFinderHubScreenState();
}

class _CourtFinderHubScreenState extends ConsumerState<CourtFinderHubScreen> {
  int _segment = 0;

  static const _labels = ['Map', 'List'];

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final filters = ref.watch(courtFiltersProvider);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            DriftSpacing.s4,
            widget.embedded ? 0 : DriftSpacing.s4,
            DriftSpacing.s4,
            DriftSpacing.s3,
          ),
          child: Row(
            children: [
              if (!widget.embedded)
                Expanded(child: Text('Courts', style: type.display))
              else
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SegmentedButton<int>(
                      segments: [
                        for (var i = 0; i < _labels.length; i++)
                          ButtonSegment(value: i, label: Text(_labels[i])),
                      ],
                      selected: {_segment},
                      showSelectedIcon: false,
                      onSelectionChanged: (s) =>
                          setState(() => _segment = s.first),
                    ),
                  ),
                ),
              IconButton(
                onPressed: () => showCourtFiltersSheet(context, ref),
                tooltip: 'Filters',
                icon: Icon(
                  filters.isEmpty
                      ? Icons.filter_alt_outlined
                      : Icons.filter_alt,
                  color: filters.isEmpty ? null : colors.primary,
                ),
              ),
            ],
          ),
        ),
        if (!widget.embedded)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DriftSpacing.s4),
            child: SegmentedButton<int>(
              segments: [
                for (var i = 0; i < _labels.length; i++)
                  ButtonSegment(value: i, label: Text(_labels[i])),
              ],
              selected: {_segment},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _segment = s.first),
            ),
          ),
        const SizedBox(height: DriftSpacing.s3),
        Expanded(
          child: switch (_segment) {
            0 => const CourtMapView(),
            _ => const CourtListView(),
          },
        ),
      ],
    );

    return widget.embedded ? content : SafeArea(child: content);
  }
}
