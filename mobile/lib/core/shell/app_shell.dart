import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'drift_app_drawer.dart';
import 'drift_app_header.dart';
import 'drift_bottom_nav.dart';
import '../../features/communities/presentation/community_hub_screen.dart';
import '../../features/communities/presentation/create_community_sheet.dart';
import '../../features/discover/presentation/discover_hub_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/learning/presentation/learning_home_screen.dart';
import '../../features/matches/application/matches_providers.dart';
import '../../features/matches/presentation/play_hub_screen.dart';
import '../../shared/widgets/drift_back_header.dart';
import '../l10n/l10n.dart';

/// Bottom-navigation shell — Home / Play / Community / Discover / Learn.
/// Plain [IndexedStack] is enough here; deep links go through the router.
///
/// 2026-11 restructure: Play and Compete merged into Play (Matches /
/// Leagues / Ladders / Tournaments / Events), and Community took the freed
/// slot.
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
    this.initialMatchFilter,
    this.initialDiscoverSegment,
  });

  final int initialIndex;
  final int? initialPlaySegment;
  final MatchSegment? initialMatchFilter;
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
    1 => context.l10n.navPlay,
    2 => context.l10n.navCommunity,
    3 => context.l10n.navDiscover,
    4 => context.l10n.navLearn,
    _ => null,
  };

  List<Widget> get _actions => switch (_index) {
    // Home only: the streak is about the player's own activity, and the chip
    // hides itself below two weeks.
    0 => [const DriftStreakChip()],
    1 => [
      DriftHeaderSquareButton(
        icon: Icons.event_note_outlined,
        onTap: () => context.push('/compete/my-leagues'),
      ),
    ],
    2 => [
      DriftHeaderSquareButton(
        icon: Icons.add,
        onTap: () => showCreateCommunitySheet(context, ref),
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
                PlayHubScreen(
                  initialSegment: widget.initialPlaySegment,
                  initialMatchFilter: widget.initialMatchFilter,
                ),
                const CommunityHubScreen(),
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
        onSelected: (i) => context.go(switch (i) {
          1 => '/home?tab=play',
          2 => '/home?tab=community',
          3 => '/home?tab=discover',
          4 => '/home?tab=learn',
          _ => '/home',
        }),
      ),
    );
  }
}
