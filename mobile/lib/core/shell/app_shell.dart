import 'package:flutter/material.dart';

import 'drift_bottom_nav.dart';
import '../../features/competitions/presentation/compete_hub_screen.dart';
import '../../features/discover/presentation/discover_hub_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/matches/presentation/play_hub_screen.dart';
import '../../features/profile/presentation/profile_home_screen.dart';

/// Bottom-navigation shell — Home / Play / Compete / Discover / Profile,
/// per `foundation/02-information-architecture.md` §1.2. Plain [IndexedStack]
/// is enough here; deep links go through the router. (The old Home FAB /
/// quick-actions sheet was dropped in the 2026-08 redesign — Home now has a
/// Quick actions grid.)
class AppShell extends StatefulWidget {
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
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          const HomeScreen(),
          PlayHubScreen(initialSegment: widget.initialPlaySegment),
          const CompeteHubScreen(),
          DiscoverHubScreen(initialSegment: widget.initialDiscoverSegment),
          const ProfileHomeScreen(),
        ],
      ),
      bottomNavigationBar: DriftBottomNav(
        selectedIndex: _index,
        onSelected: (i) => setState(() => _index = i),
      ),
    );
  }
}
