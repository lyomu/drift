import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import '../application/courts_providers.dart';
import 'court_filters_sheet.dart';
import 'court_list_view.dart';
import 'court_map_view.dart';

/// Court Finder Hub — `foundation/04-screen-inventory.md` §A.6. Map/List
/// toggle over one shared search (redesign 2026-08: `App.tsx`
/// `DiscoverCourtsTab`, plus the Map segment the prototype omits).
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
    final filters = ref.watch(courtFiltersProvider);

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(16, widget.embedded ? 0 : 8, 16, 12),
          child: Row(
            children: [
              Expanded(
                child: DriftPillTabs(
                  labels: _labels,
                  selected: _segment,
                  onChanged: (i) => setState(() => _segment = i),
                ),
              ),
              const SizedBox(width: 8),
              DriftHeaderSquareButton(
                icon: filters.isEmpty ? Icons.tune : Icons.filter_alt,
                onTap: () => showCourtFiltersSheet(context, ref),
              ),
            ],
          ),
        ),
        Expanded(
          child: switch (_segment) {
            0 => const CourtMapView(),
            _ => const CourtListView(),
          },
        ),
      ],
    );

    if (widget.embedded) return body;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Text('Courts', style: type.h2),
          ),
          Expanded(child: body),
        ],
      ),
    );
  }
}
