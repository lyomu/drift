import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/drift_colors.dart';
import '../theme/drift_spacing.dart';
import '../theme/drift_typography.dart';
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
          PlayHubScreen(initialSegment: widget.initialPlaySegment),
          const CompeteHubScreen(),
          DiscoverHubScreen(initialSegment: widget.initialDiscoverSegment),
          const ProfileHomeScreen(),
        ],
      ),
      floatingActionButton: _index == 0
          ? FloatingActionButton(
              onPressed: () => _showQuickActions(context),
              tooltip: 'Quick actions',
              child: const Icon(Icons.add),
            )
          : null,
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

void _showQuickActions(BuildContext context) {
  final type = Theme.of(context).extension<DriftTypography>()!;
  final colors = Theme.of(context).extension<DriftColors>()!;

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (_) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s4,
          0,
          DriftSpacing.s4,
          DriftSpacing.s4,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quick actions', style: type.h3),
            const SizedBox(height: DriftSpacing.s3),
            _QuickActionTile(
              icon: Icons.person_search_outlined,
              label: 'Find Players',
              onTap: () => context.go('/home?tab=play&play=find'),
            ),
            _QuickActionTile(
              icon: Icons.edit_note,
              label: 'Log Practice',
              onTap: () => context.push('/learn/practice/add'),
            ),
            _QuickActionTile(
              icon: Icons.scoreboard_outlined,
              label: 'Enter Result',
              onTap: () => context.go('/home?tab=play&play=active'),
            ),
            _QuickActionTile(
              icon: Icons.sports_tennis_outlined,
              label: 'Find Court',
              onTap: () => context.go('/home?tab=discover&discover=courts'),
            ),
            const SizedBox(height: DriftSpacing.s2),
            Text(
              'Actions open the existing Drift flows, so each step keeps its current state and permissions.',
              style: type.caption.copyWith(color: colors.textSecondary),
            ),
          ],
        ),
      ),
    ),
  );
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundColor: colors.primaryLight,
        child: Icon(icon, color: colors.primaryDark),
      ),
      title: Text(label, style: type.title),
      trailing: Icon(Icons.chevron_right, color: colors.textSecondary),
      onTap: () {
        Navigator.of(context).pop();
        onTap();
      },
    );
  }
}
