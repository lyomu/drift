import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:drift_tennis/core/theme/app_theme.dart';

/// Pumps a single screen inside the real app theme.
///
/// Supplying `AppTheme` is load-bearing rather than cosmetic: every screen
/// reads `Theme.of(context).extension<DriftColors>()!` (and `DriftTypography`),
/// so a bare `MaterialApp` makes them all throw on build. Rendering through
/// the real theme means these tests also prove the extensions stay wired.
Future<void> pumpScreen(
  WidgetTester tester,
  Widget screen, {
  List<Override> overrides = const [],
  Brightness brightness = Brightness.light,
  bool settle = true,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: brightness == Brightness.dark
            ? AppTheme.dark()
            : AppTheme.light(),
        home: screen,
      ),
    ),
  );
  // Loading-state tests pass `settle: false` — a never-completing future
  // would make pumpAndSettle time out rather than show the spinner.
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
}

/// Same, but behind a real [GoRouter] so `context.push` works. Only needed
/// for tests that actually navigate; [pumpScreen] is cheaper for the rest.
Future<void> pumpRouted(
  WidgetTester tester,
  Widget screen, {
  List<Override> overrides = const [],
  List<GoRoute> extraRoutes = const [],
}) async {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (_, _) => screen),
      ...extraRoutes,
    ],
  );

  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp.router(theme: AppTheme.light(), routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

/// A future that never resolves — the loading branch of an `AsyncValue`
/// switch. Pair with `settle: false`.
Future<T> pending<T>() => Completer<T>().future;

/// A future that fails — the error branch.
Future<T> failing<T>([String message = 'boom']) =>
    Future<T>.error(Exception(message));
