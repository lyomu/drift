import 'package:flutter/material.dart';

import '../../features/competitions/presentation/compete_hub_screen.dart';
import '../../features/discover/presentation/discover_hub_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/matches/presentation/play_hub_screen.dart';
import '../../features/profile/presentation/profile_home_screen.dart';

/// Bottom-navigation shell — Home / Play / Compete / Discover / Profile,
/// per `foundation/02-information-architecture.md` §1.2. Home is real as of
/// Phase M4, Discover as of M5 (a Discover Hub with Players/Courts/Clubs
/// segments as of M9), Play as of M6, and Compete as of M8; Profile gets its
/// first real content in M10 (just the Learn entry point — see
/// `ProfileHomeScreen`). Play Hub and Discover's Players segment both
/// surface player search, as the IA documents two entry points for it.
/// Plain [IndexedStack] is enough here; deep links go through the router.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  static const _destinations = [
    (icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Home'),
    (
      icon: Icons.sports_tennis_outlined,
      selectedIcon: Icons.sports_tennis,
      label: 'Play',
    ),
    (
      icon: Icons.emoji_events_outlined,
      selectedIcon: Icons.emoji_events,
      label: 'Compete',
    ),
    (
      icon: Icons.explore_outlined,
      selectedIcon: Icons.explore,
      label: 'Discover',
    ),
    (icon: Icons.person_outline, selectedIcon: Icons.person, label: 'Profile'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          const HomeScreen(),
          const PlayHubScreen(),
          const CompeteHubScreen(),
          const DiscoverHubScreen(),
          const ProfileHomeScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _destinations
            .map(
              (d) => NavigationDestination(
                icon: Icon(d.icon),
                selectedIcon: Icon(d.selectedIcon),
                label: d.label,
              ),
            )
            .toList(),
      ),
    );
  }
}
