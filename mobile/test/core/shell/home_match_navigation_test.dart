import 'package:drift_tennis/core/shell/app_shell.dart';
import 'package:drift_tennis/core/shell/drift_bottom_nav.dart';
import 'package:drift_tennis/core/theme/app_theme.dart';
import 'package:drift_tennis/features/achievements/application/achievements_providers.dart';
import 'package:drift_tennis/features/home/application/home_feed_provider.dart';
import 'package:drift_tennis/features/home/data/home_repository.dart';
import 'package:drift_tennis/features/home/presentation/home_screen.dart';
import 'package:drift_tennis/features/matches/application/matches_providers.dart';
import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/presentation/play_hub_screen.dart';
import 'package:drift_tennis/features/news/application/news_providers.dart';
import 'package:drift_tennis/features/notifications/application/notifications_providers.dart';
import 'package:drift_tennis/features/players/application/players_providers.dart';
import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../support/fixtures.dart';

void main() {
  testWidgets('Home match actions select the requested Play segment', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: '/home',
      routes: [
        GoRoute(
          path: '/home',
          builder: (context, state) => AppShell(
            initialIndex: state.uri.queryParameters['tab'] == 'play' ? 1 : 0,
            initialPlaySegment: switch (state.uri.queryParameters['play']) {
              'find' => 0,
              'active' => 2,
              _ => null,
            },
          ),
        ),
      ],
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homeFeedProvider.overrideWith((ref) async => <HomeCard>[]),
          homeSummaryProvider.overrideWith((ref) async => homeSummary()),
          notificationsListProvider.overrideWith(
            (ref) async => notificationsPage(),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
          achievementsProvider.overrideWith(
            (ref) async => throw Exception('fixture'),
          ),
          newsFeedProvider.overrideWith((ref) async => []),
          matchListProvider.overrideWith(
            (ref, segment) async => <DriftMatch>[],
          ),
          playerSearchProvider.overrideWith((ref) async => <PlayerSummary>[]),
        ],
        child: MaterialApp.router(
          theme: AppTheme.light(),
          routerConfig: router,
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(
      tester.widget<DriftBottomNav>(find.byType(DriftBottomNav)).selectedIndex,
      0,
    );
    await tester.tap(find.text('Find Match'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(
      tester.widget<DriftBottomNav>(find.byType(DriftBottomNav)).selectedIndex,
      1,
    );
    expect(
      tester.widget<PlayHubScreen>(find.byType(PlayHubScreen)).initialSegment,
      0,
    );

    await tester.tap(find.text('Home').last);
    await tester.pump();
    expect(
      tester.widget<DriftBottomNav>(find.byType(DriftBottomNav)).selectedIndex,
      0,
    );
    await tester.tap(find.text('Find Match'));
    await tester.pump();
    expect(
      tester.widget<DriftBottomNav>(find.byType(DriftBottomNav)).selectedIndex,
      1,
    );

    await tester.tap(find.text('Home').last);
    await tester.pump();
    await tester.drag(find.byType(HomeScreen), const Offset(0, -500));
    await tester.pump();
    await tester.tap(find.text('View all').first);
    await tester.pump();
    expect(
      tester.widget<DriftBottomNav>(find.byType(DriftBottomNav)).selectedIndex,
      1,
    );
    expect(
      tester.widget<PlayHubScreen>(find.byType(PlayHubScreen)).initialSegment,
      2,
    );

    await tester.tap(find.text('Home').last);
    await tester.pump();
    await tester.drag(find.byType(HomeScreen), const Offset(0, -100));
    await tester.pump();
    await tester.tap(find.text('Find a match'));
    await tester.pump();
    expect(
      tester.widget<DriftBottomNav>(find.byType(DriftBottomNav)).selectedIndex,
      1,
    );
    expect(
      tester.widget<PlayHubScreen>(find.byType(PlayHubScreen)).initialSegment,
      0,
    );
  });
}
