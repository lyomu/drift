import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/learning_providers.dart';
import '../data/learning_repository.dart';

/// Lesson/Drill Detail, unified — `foundation/04-screen-inventory.md` §A.7
/// gives Lesson Detail and Drill Detail near-identical shape ("Text/steps"
/// vs. "Drill instructions", "Mark Complete" vs. "Log this drill in
/// Practice"). One screen, branching on `content.type`, rather than two
/// near-duplicate screens — same discipline M7's `EnterScoreScreen` used
/// unifying three near-duplicate score-entry screens via a mode enum.
///
/// Lessons with a `videoUrl` open the dedicated in-app Video Lesson Player
/// rather than handing off to a browser.
class ContentDetailScreen extends ConsumerStatefulWidget {
  const ContentDetailScreen({super.key, required this.contentId});

  final String contentId;

  @override
  ConsumerState<ContentDetailScreen> createState() =>
      _ContentDetailScreenState();
}

class _ContentDetailScreenState extends ConsumerState<ContentDetailScreen> {
  bool _isMarking = false;

  Future<void> _markComplete() async {
    setState(() => _isMarking = true);
    try {
      await ref
          .read(learningRepositoryProvider)
          .markContentComplete(widget.contentId);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Marked complete.')));
    } finally {
      if (mounted) setState(() => _isMarking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = ref.watch(contentDetailProvider(widget.contentId));

    return DriftScaffold(
      title: 'Learn',
      body: switch (content) {
        AsyncData(:final value) => _Body(
          content: value,
          isMarking: _isMarking,
          onMarkComplete: _markComplete,
        ),
        AsyncError() => const Center(child: Text('Content not available.')),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.content,
    required this.isMarking,
    required this.onMarkComplete,
  });

  final ContentDetail content;
  final bool isMarking;
  final VoidCallback onMarkComplete;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final summary = content.summary;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Text(summary.title, style: type.h2),
        if (summary.durationMinutes != null) ...[
          const SizedBox(height: DriftSpacing.s1),
          Text(
            '${summary.durationMinutes} min',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
        if (summary.summary != null) ...[
          const SizedBox(height: DriftSpacing.s3),
          Text(summary.summary!, style: type.body),
        ],
        if (content.bodyText != null) ...[
          const SizedBox(height: DriftSpacing.s4),
          Text(content.bodyText!, style: type.body),
        ],
        if (content.videoUrl != null) ...[
          const SizedBox(height: DriftSpacing.s4),
          DriftButton(
            label: 'Watch video',
            variant: DriftButtonVariant.text,
            onPressed: () => context.push('/learn/content/${summary.id}/video'),
          ),
        ],
        const SizedBox(height: DriftSpacing.s6),
        if (summary.isDrill)
          DriftButton(
            label: 'Log this drill in Practice',
            onPressed: () => context.push(
              '/learn/practice/add',
              extra: (drillId: summary.id, skillFocus: summary.targetSkill),
            ),
          )
        else
          DriftButton(
            label: isMarking ? 'Marking…' : 'Mark Complete',
            onPressed: isMarking ? null : onMarkComplete,
          ),
      ],
    );
  }
}
