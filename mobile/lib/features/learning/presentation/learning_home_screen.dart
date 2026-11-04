import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../application/learning_providers.dart';
import '../data/learning_repository.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/enum_labels.dart';

/// One of the four destinations above the fold. [accent] is decorative, taken
/// from the redesign mock.
class _QuickLink {
  const _QuickLink({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.accent,
    required this.route,
  });

  final String Function(AppLocalizations) label;
  final String Function(AppLocalizations) subtitle;
  final IconData icon;
  final Color accent;
  final String route;
}

final _quickLinks = <_QuickLink>[
  _QuickLink(
    label: (l) => l.learnSkillProfile,
    subtitle: (l) => l.learnSkillProfileSub,
    icon: Icons.bar_chart_rounded,
    accent: Color(0xFF1A7AFF),
    route: '/learn/skill-profile',
  ),
  _QuickLink(
    label: (l) => l.learnPracticeLog,
    subtitle: (l) => l.learnPracticeLogSub,
    icon: Icons.history_edu_rounded,
    accent: Color(0xFF22C55E),
    route: '/learn/practice',
  ),
  _QuickLink(
    label: (l) => l.learnGoals,
    subtitle: (l) => l.learnGoalsSub,
    icon: Icons.flag_rounded,
    accent: Color(0xFFF97316),
    route: '/learn/goals',
  ),
  _QuickLink(
    label: (l) => l.learnProgressReport,
    subtitle: (l) => l.learnProgressReportSub,
    icon: Icons.trending_up_rounded,
    accent: Color(0xFF8B5CF6),
    route: '/learn/progress',
  ),
];

/// Browse-by-skill chips. Keys are `AssessmentPillar` values, which is what
/// `/learn/browse/:skill` takes. `FOOTWORK` has no chip in the mock but is a
/// real pillar with its own content, so it keeps its entry.
const _skills = <(String, Color)>[
  ('FOREHAND', Color(0xFF1A7AFF)),
  ('BACKHAND', Color(0xFFEC4899)),
  ('SERVE', Color(0xFFF97316)),
  ('RETURN', Color(0xFF22C55E)),
  ('NET_PLAY', Color(0xFFEAB308)),
  ('MOVEMENT', Color(0xFF8B5CF6)),
  ('MATCH_PLAY', Color(0xFFEF4444)),
  ('FOOTWORK', Color(0xFF14B8A6)),
];

/// Accents cycled across the featured list, in the mock's order. The API
/// returns no colour of its own, so position decides.
const _lessonAccents = <Color>[
  Color(0xFF1A7AFF),
  Color(0xFF8B5CF6),
  Color(0xFF22C55E),
];

/// How many lessons the featured strip shows. The endpoint is a full browse,
/// so the cap lives here rather than in the query.
const _featuredCount = 3;

/// Learning Home — `foundation/04-screen-inventory.md` §A.7. Entry to
/// structured learning, a browse-by-skill rail, and the featured lessons.
///
/// Set [embedded] when the screen is hosted as the Learn tab of [AppShell]
/// (2026-09 redesign): the shell already supplies the scaffold and the app
/// header, and there is nothing to go back *to* from a root tab. The `/learn`
/// route keeps rendering it standalone, with its own back header.
class LearningHomeScreen extends StatelessWidget {
  const LearningHomeScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    const body = _LearningHomeBody();
    if (embedded) return body;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(title: context.l10n.navLearn),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

class _LearningHomeBody extends ConsumerWidget {
  const _LearningHomeBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const params = (type: null, targetSkill: null);
    final featured = ref.watch(contentBrowseProvider(params));
    final colors = Theme.of(context).extension<DriftColors>()!;

    return RefreshIndicator(
      onRefresh: () => ref.refresh(contentBrowseProvider(params).future),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          for (var i = 0; i < _quickLinks.length; i++) ...[
            if (i > 0) const SizedBox(height: 8),
            _QuickLinkCard(link: _quickLinks[i]),
          ],
          const SizedBox(height: 24),
          _SectionHeading(context.l10n.learnBrowseBySkill),
          const SizedBox(height: 12),
          const _SkillChips(),
          const SizedBox(height: 24),
          ..._featuredSection(featured, colors),
        ],
      ),
    );
  }

  /// The featured strip is backed by the live content endpoint. Empty data
  /// gets an honest coming-soon state; it never fills the dashboard with
  /// sample lessons.
  List<Widget> _featuredSection(
    AsyncValue<List<ContentSummary>> featured,
    DriftColors colors,
  ) {
    return switch (featured) {
      AsyncData(:final value) when value.isEmpty => [
        _SectionHeading(l10nNow.learnFeaturedLessons),
        const SizedBox(height: 12),
        _LessonsEmptyState(colors: colors),
      ],
      AsyncData(:final value) => [
        _SectionHeading(l10nNow.learnFeaturedLessons),
        const SizedBox(height: 12),
        for (var i = 0; i < value.take(_featuredCount).length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _LessonCard(
            content: value[i],
            accent: _lessonAccents[i % _lessonAccents.length],
          ),
        ],
      ],
      AsyncError() => [
        _SectionHeading(l10nNow.learnFeaturedLessons),
        SizedBox(height: 12),
        Text(
          l10nNow.learnLessonsFailed,
          style: TextStyle(
            fontSize: 12,
            height: 1.4,
            color: colors.textSecondary,
          ),
        ),
      ],
      _ => [
        _SectionHeading(l10nNow.learnFeaturedLessons),
        SizedBox(height: 16),
        Center(child: CircularProgressIndicator()),
      ],
    };
  }
}

class _LessonsEmptyState extends StatelessWidget {
  const _LessonsEmptyState({required this.colors});

  final DriftColors colors;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _hairline(colors), width: 1.5),
      ),
      child: Row(
        children: [
          _AccentTile(
            icon: Icons.sports_tennis_rounded,
            accent: colors.primary,
            size: 48,
            radius: 13,
            iconSize: 23,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.l10n.learnLessonsComingSoon,
                  style: type.label.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(
                  context.l10n.learnLessonsComingSoonBody,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Text(
      label,
      style: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        height: 1.2,
        color: colors.textPrimary,
      ),
    );
  }
}

/// The mock's brand-tinted hairline (#E8EEFF / #E2EAFF), derived from the
/// theme's primary so it tracks the palette rather than being pinned to the
/// prototype's blue.
Color _hairline(DriftColors colors, {double alpha = 0.1}) =>
    Color.alphaBlend(colors.primary.withValues(alpha: alpha), colors.surface);

/// Rounded square holding a tinted glyph: 42px in the quick links, 48px in the
/// featured lessons.
class _AccentTile extends StatelessWidget {
  const _AccentTile({
    required this.icon,
    required this.accent,
    required this.size,
    required this.radius,
    required this.iconSize,
  });

  final IconData icon;
  final Color accent;
  final double size;
  final double radius;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: accent.withValues(alpha: 0.16), width: 1.5),
      ),
      child: Icon(icon, size: iconSize, color: accent),
    );
  }
}

/// Shared frame for both card kinds: white, 14px radius, tinted hairline.
class _OutlinedCard extends StatelessWidget {
  const _OutlinedCard({
    required this.onTap,
    required this.padding,
    required this.child,
  });

  final VoidCallback onTap;
  final EdgeInsets padding;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _hairline(colors), width: 1.5),
          ),
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}

class _QuickLinkCard extends StatelessWidget {
  const _QuickLinkCard({required this.link});

  final _QuickLink link;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return _OutlinedCard(
      onTap: () => context.push(link.route),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          _AccentTile(
            icon: link.icon,
            accent: link.accent,
            size: 42,
            radius: 12,
            iconSize: 20,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  link.label(context.l10n),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                    color: colors.textPrimary,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  link.subtitle(context.l10n),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                    height: 1.3,
                    color: colors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            size: 18,
            color: colors.textSecondary,
          ),
        ],
      ),
    );
  }
}

/// Pill chips, one per skill pillar. Tapping navigates to that pillar's
/// browse list — the mock toggles a local "active" state instead, but it
/// filters nothing there, and this screen has a real destination.
class _SkillChips extends StatelessWidget {
  const _SkillChips();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final (key, accent) in _skills)
          Material(
            color: colors.surface,
            borderRadius: BorderRadius.circular(999),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              // The accent the mock shows on selection lands on the press
              // instead, so each chip still has its own colour.
              splashColor: accent.withValues(alpha: 0.12),
              highlightColor: accent.withValues(alpha: 0.08),
              onTap: () => context.push('/learn/browse/$key'),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: _hairline(colors, alpha: 0.18),
                    width: 1.5,
                  ),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 7,
                ),
                child: Text(
                  pillarLabel(context.l10n, key),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    height: 1.3,
                    color: colors.textPrimary,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _LessonCard extends StatelessWidget {
  const _LessonCard({required this.content, required this.accent});

  final ContentSummary content;
  final Color accent;

  /// Content tiers reuse the onboarding assessment's branch rather than a
  /// second level scale, and a null branch means "suitable at any level".
  static String _branchLabel(String? branch) => switch (branch) {
    'BEGINNER' => l10nNow.levelBeginner,
    'FOUNDATIONAL' => l10nNow.levelFoundational,
    'INTERMEDIATE' => l10nNow.levelIntermediate,
    'ADVANCED' => l10nNow.levelAdvanced,
    _ => l10nNow.levelAll,
  };

  @override
  Widget build(BuildContext context) {
    final duration = content.durationMinutes;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return _OutlinedCard(
      onTap: () => context.push(
        content.isTrainingPlan
            ? '/learn/plans/${content.id}'
            : '/learn/content/${content.id}',
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          _AccentTile(
            icon: content.isDrill
                ? Icons.sports_tennis_rounded
                : Icons.play_circle_fill_rounded,
            accent: accent,
            size: 48,
            radius: 13,
            iconSize: 24,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  content.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                    color: colors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Flexible(
                      child: Container(
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.09),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        child: Text(
                          _branchLabel(content.branch),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            height: 1.4,
                            color: accent,
                          ),
                        ),
                      ),
                    ),
                    if (duration != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        '$duration min',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                          height: 1.4,
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(
            Icons.chevron_right_rounded,
            size: 18,
            color: colors.textSecondary,
          ),
        ],
      ),
    );
  }
}
