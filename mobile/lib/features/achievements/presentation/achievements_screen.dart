import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_symbol.dart';
import '../application/achievements_providers.dart';
import '../data/achievements_repository.dart';

/// Drift's official readable text family.
const _font = 'Outfit';

const _ink = Color(0xFF0F172A);
const _lockedInk = Color(0xFF94A3B8);
const _lockedFill = Color(0xFFF1F5F9);
const _lockedBorder = Color(0xFFE2E8F0);
const _earnedPillFill = Color(0xFFDCFCE7);
const _earnedPillInk = Color(0xFF16A34A);
const _lockedPillFill = Color(0xFFFEF9C3);
const _lockedPillInk = Color(0xFFCA8A04);

/// Achievements List — `foundation/04-screen-inventory.md` §A.9. The rule
/// catalogue is transparent: locked rows show exactly what real activity
/// earns them.
class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final achievements = ref.watch(achievementsProvider);

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Header(),
            Expanded(
              child: switch (achievements) {
                AsyncData(:final value) => _AchievementList(response: value),
                AsyncError() => _LoadFailed(
                  onRetry: () => ref.invalidate(achievementsProvider),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: colors.surface,
        border: Border(bottom: BorderSide(color: _hairline(colors), width: 1)),
      ),
      child: Row(
        children: [
          Material(
            color: _tintedFill(colors),
            borderRadius: BorderRadius.circular(12),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () {
                if (context.canPop()) context.pop();
              },
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _tintedBorder(colors), width: 1.5),
                ),
                child: const Icon(
                  DriftSymbolsFilled.arrowBack,
                  size: 20,
                  color: _ink,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'Achievements',
            style: TextStyle(
              fontFamily: _font,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              height: 1.2,
              color: _ink,
            ),
          ),
        ],
      ),
    );
  }
}

class _AchievementList extends StatelessWidget {
  const _AchievementList({required this.response});

  final AchievementsResponse response;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        _SummaryCard(
          earnedCount: response.earnedCount,
          totalCount: response.totalCount,
        ),
        const SizedBox(height: 12),
        for (final achievement in response.achievements) ...[
          _AchievementCard(achievement: achievement),
          const SizedBox(height: 12),
        ],
        const SizedBox(height: 4),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.earnedCount, required this.totalCount});

  final int earnedCount;
  final int totalCount;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final pct = totalCount == 0 ? 0.0 : earnedCount / totalCount;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _cardBorder(colors), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your badges',
                      style: TextStyle(
                        fontFamily: _font,
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        height: 1.2,
                        color: _ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '$earnedCount of $totalCount earned',
                      style: const TextStyle(
                        fontFamily: _font,
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        height: 1.3,
                        color: _ink,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                '$earnedCount/$totalCount',
                style: TextStyle(
                  fontFamily: _font,
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  height: 1.2,
                  color: colors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _ProgressBar(value: pct, height: 6, filled: true),
        ],
      ),
    );
  }
}

class _AchievementCard extends StatelessWidget {
  const _AchievementCard({required this.achievement});

  final Achievement achievement;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final earned = achievement.earned;
    final progress = achievement.target == 0
        ? 0.0
        : (achievement.current / achievement.target).clamp(0.0, 1.0);

    return Opacity(
      // The mock dims a locked card as a whole rather than restating the
      // muted colour on every child.
      opacity: earned ? 1 : 0.75,
      child: Material(
        color: colors.surface,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _showAchievementDetail(context, achievement),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: earned ? _cardBorder(colors) : _lockedFill,
                width: 1.5,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: earned
                        ? colors.primary.withValues(alpha: 0.08)
                        : _lockedFill,
                    borderRadius: BorderRadius.circular(11),
                    border: Border.all(
                      color: earned
                          ? colors.primary.withValues(alpha: 0.19)
                          : _lockedBorder,
                      width: 1.5,
                    ),
                  ),
                  // A locked badge shows a padlock, not its own glyph — the
                  // reward stays hidden until it is earned.
                  child: earned
                      ? Icon(
                          achievementSymbol(achievement.icon),
                          size: 20,
                          color: colors.primary,
                        )
                      : const Icon(
                          Symbols.lock_rounded,
                          size: 20,
                          color: _lockedInk,
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              achievement.title,
                              style: TextStyle(
                                fontFamily: _font,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                height: 1.2,
                                color: earned ? _ink : _lockedInk,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StatePill(earned: earned),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        achievement.description,
                        style: const TextStyle(
                          fontFamily: _font,
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          height: 1.4,
                          color: _ink,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _ProgressBar(
                        value: progress.toDouble(),
                        height: 4,
                        filled: earned,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${achievement.current}/${achievement.target}',
                        style: const TextStyle(
                          fontFamily: _font,
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          height: 1.2,
                          color: _ink,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StatePill extends StatelessWidget {
  const _StatePill({required this.earned});

  final bool earned;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: earned ? _earnedPillFill : _lockedPillFill,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        earned ? 'Earned' : 'Locked',
        style: TextStyle(
          fontFamily: _font,
          fontSize: 11,
          fontWeight: FontWeight.w600,
          height: 1.3,
          color: earned ? _earnedPillInk : _lockedPillInk,
        ),
      ),
    );
  }
}

/// Rounded track with a brand-filled bar. [filled] is the mock's rule that a
/// locked badge's bar reads empty even when some progress exists.
class _ProgressBar extends StatelessWidget {
  const _ProgressBar({
    required this.value,
    required this.height,
    required this.filled,
  });

  final double value;
  final double height;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ClipRRect(
      borderRadius: BorderRadius.circular(99),
      child: SizedBox(
        height: height,
        child: DecoratedBox(
          decoration: BoxDecoration(color: _cardBorder(colors)),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: filled ? value.clamp(0.0, 1.0) : 0.0,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: colors.primary,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoadFailed extends StatelessWidget {
  const _LoadFailed({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Couldn't load achievements.",
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: _font,
                fontSize: 14,
                fontWeight: FontWeight.w500,
                height: 1.4,
                color: _ink,
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: onRetry,
              child: Text(
                'Retry',
                style: TextStyle(
                  fontFamily: _font,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: colors.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _showAchievementDetail(BuildContext context, Achievement achievement) {
  final colors = Theme.of(context).extension<DriftColors>()!;

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    backgroundColor: colors.surface,
    builder: (context) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: achievement.earned
                        ? colors.primary.withValues(alpha: 0.08)
                        : _lockedFill,
                    borderRadius: BorderRadius.circular(11),
                    border: Border.all(
                      color: achievement.earned
                          ? colors.primary.withValues(alpha: 0.19)
                          : _lockedBorder,
                      width: 1.5,
                    ),
                  ),
                  child: achievement.earned
                      ? Icon(
                          achievementSymbol(achievement.icon),
                          size: 20,
                          color: colors.primary,
                        )
                      : const Icon(
                          Symbols.lock_rounded,
                          size: 20,
                          color: _lockedInk,
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    achievement.title,
                    style: const TextStyle(
                      fontFamily: _font,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      height: 1.2,
                      color: _ink,
                    ),
                  ),
                ),
                _StatePill(earned: achievement.earned),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              achievement.description,
              style: const TextStyle(
                fontFamily: _font,
                fontSize: 14,
                fontWeight: FontWeight.w400,
                height: 1.45,
                color: _ink,
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Criteria',
              style: TextStyle(
                fontFamily: _font,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                height: 1.3,
                color: _ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              achievement.criteria,
              style: const TextStyle(
                fontFamily: _font,
                fontSize: 13,
                fontWeight: FontWeight.w400,
                height: 1.45,
                color: _lockedInk,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Brand-tinted neutrals — the mock's #F0F4FF / #F7F9FF / #E2EAFF / #E8EEFF are
// its blue at low opacity, derived here so they track the theme's primary.
// ---------------------------------------------------------------------------

Color _hairline(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.07), colors.surface);

Color _tintedFill(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.04), colors.surface);

Color _tintedBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.18), colors.surface);

Color _cardBorder(DriftColors colors) =>
    Color.alphaBlend(colors.primary.withValues(alpha: 0.12), colors.surface);
