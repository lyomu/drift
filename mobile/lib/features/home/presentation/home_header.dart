import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/home_feed_provider.dart';
import 'sections/home_stat_card.dart';

/// Home's gradient stat card.
///
/// The date, greeting and notification bell that used to sit above it moved
/// into the app-wide `DriftAppHeader` in the 2026-09 redesign — they belong to
/// the shell now, not to Home's scroll content. Degrades quietly: the card
/// renders its own empty state while `/home/summary` loads or fails.
class HomeHeader extends ConsumerWidget {
  const HomeHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(homeSummaryProvider).valueOrNull;
    return HomeStatCard(summary: summary);
  }
}
