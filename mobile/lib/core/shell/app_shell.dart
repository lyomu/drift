import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'drift_app_drawer.dart';
import 'drift_app_header.dart';
import 'drift_bottom_nav.dart';
import '../../features/competitions/presentation/compete_hub_screen.dart';
import '../../features/discover/presentation/discover_hub_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/learning/presentation/learning_home_screen.dart';
import '../../features/matches/presentation/play_hub_screen.dart';
import '../../features/players/presentation/player_filters_sheet.dart';
import '../../shared/widgets/drift_back_header.dart';

/// Bottom-navigation shell — Home / Play / Compete / Discover / Learn, per
/// `foundation/02-information-architecture.md` §1.2. Plain [IndexedStack] is
/// enough here; deep links go through the router.
///
/// 2026-09 redesign: the shell now owns the app's chrome. A persistent
/// [DriftAppHeader] sits above the tab stack (the hub screens no longer draw
/// their own title rows), and [DriftAppDrawer] behind its hamburger carries
/// the profile navigation that used to be the fifth tab — Learn took that
/// slot. Tab-specific header actions are declared here rather than inside
/// each hub, since the header lives outside them now.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({
    super.key,
    this.initialIndex = 0,
    this.initialPlaySegment,
    this.initialDiscoverSegment,
  });

  final int initialIndex;
  final int? initialPlaySegment;
  final int? initialDiscoverSegment;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
  }

  @override
  void didUpdateWidget(covariant AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialIndex != widget.initialIndex) {
      setState(() => _index = widget.initialIndex);
    }
  }

  /// Home shows the greeting instead of a title.
  String? get _title => switch (_index) {
    1 => 'Play',
    2 => 'Compete',
    3 => 'Discover',
    4 => 'Learn',
    _ => null,
  };

  List<Widget> get _actions => switch (_index) {
    1 => [
      DriftHeaderSquareButton(
        icon: Icons.tune,
        onTap: () => showPlayerFiltersSheet(context, ref),
      ),
    ],
    2 => [
      DriftHeaderSquareButton(
        icon: Icons.event_note_outlined,
        onTap: () => context.push('/compete/my-leagues'),
      ),
    ],
    _ => const [],
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const DriftAppDrawer(),
      body: Column(
        children: [
          DriftAppHeader(title: _title, actions: _actions),
          Expanded(
            child: IndexedStack(
              index: _index,
              children: [
                const HomeScreen(),
                PlayHubScreen(initialSegment: widget.initialPlaySegment),
                const CompeteHubScreen(),
                DiscoverHubScreen(
                  initialSegment: widget.initialDiscoverSegment,
                ),
                const LearningHomeScreen(embedded: true),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: DriftBottomNav(
        selectedIndex: _index,
        onSelected: (i) => setState(() => _index = i),
      ),
    );
  }
}
