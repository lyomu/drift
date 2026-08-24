import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../auth/data/auth_repository.dart';
import '../data/assessment_repository.dart';

/// Adaptive Assessment — Question — `foundation/04-screen-inventory.md` A.2.
/// One screen, re-rendered per question (not a route per question); resumes
/// mid-session automatically since `startOrResumeSession` is idempotent.
///
/// Reused as-is for the Padel assessment (M13, `add_padel_screen.dart`'s
/// "Add Padel — Assessment") — the two Tennis-specific pieces ([title] and
/// [onComplete]'s navigation) are parameterized rather than duplicating
/// this ~150-line adaptive-question loop.
class AssessmentQuestionScreen extends ConsumerStatefulWidget {
  const AssessmentQuestionScreen({
    super.key,
    this.title = 'Tennis Assessment',
    this.repositoryProvider,
    this.onComplete,
  });

  final String title;

  /// Defaults to [assessmentRepositoryProvider] (Tennis) when omitted.
  final Provider<AssessmentRepository>? repositoryProvider;

  /// Defaults to Tennis's onboarding hand-off
  /// (`/onboarding/level-review`) when omitted.
  final void Function(BuildContext context, AssessmentResult result)?
  onComplete;

  @override
  ConsumerState<AssessmentQuestionScreen> createState() =>
      _AssessmentQuestionScreenState();
}

class _AssessmentQuestionScreenState
    extends ConsumerState<AssessmentQuestionScreen> {
  String? _sessionId;
  int _questionBudget = 0;
  int _answeredCount = 0;
  AssessmentQuestion? _question;
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _errorText;

  Provider<AssessmentRepository> get _repositoryProvider =>
      widget.repositoryProvider ?? assessmentRepositoryProvider;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    setState(() {
      _isLoading = true;
      _errorText = null;
    });
    try {
      final session = await ref
          .read(_repositoryProvider)
          .startOrResumeSession();
      setState(() {
        _sessionId = session.sessionId;
        _questionBudget = session.questionBudget;
        _answeredCount = session.answeredCount;
        _question = session.nextQuestion;
      });
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _selectOption(String key) async {
    if (_sessionId == null || _question == null || _isSubmitting) return;

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final outcome = await ref
          .read(_repositoryProvider)
          .submitAnswer(
            sessionId: _sessionId!,
            questionId: _question!.questionId,
            selectedOption: key,
          );

      if (!mounted) return;

      if (outcome.isComplete) {
        if (widget.onComplete != null) {
          widget.onComplete!(context, outcome.result!);
        } else {
          context.go('/onboarding/level-review', extra: outcome.result);
        }
        return;
      }

      setState(() {
        _question = outcome.nextQuestion;
        _answeredCount = outcome.answeredCount;
      });
    } on AuthException catch (e) {
      setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _question == null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(DriftSpacing.s6),
                  child: Text(_errorText ?? 'Unable to load the assessment.'),
                ),
              )
            : Padding(
                padding: const EdgeInsets.all(DriftSpacing.s6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    LinearProgressIndicator(
                      value: _questionBudget == 0
                          ? 0
                          : (_answeredCount / _questionBudget).clamp(0, 1),
                    ),
                    const SizedBox(height: DriftSpacing.s2),
                    Text(
                      'Question ${_answeredCount + 1} of $_questionBudget',
                      style: type.label.copyWith(color: colors.textSecondary),
                    ),
                    const SizedBox(height: DriftSpacing.s4),
                    Text(_question!.prompt, style: type.h3),
                    const SizedBox(height: DriftSpacing.s4),
                    if (_errorText != null) ...[
                      Text(_errorText!, style: TextStyle(color: colors.error)),
                      const SizedBox(height: DriftSpacing.s3),
                    ],
                    Expanded(
                      child: ListView.separated(
                        itemCount: _question!.options.length,
                        separatorBuilder: (_, _) =>
                            const SizedBox(height: DriftSpacing.s2),
                        itemBuilder: (context, index) {
                          final option = _question!.options[index];
                          return _AssessmentOptionCard(
                            optionKey: option.key,
                            text: option.text,
                            enabled: !_isSubmitting,
                            onTap: () => _selectOption(option.key),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _AssessmentOptionCard extends StatelessWidget {
  const _AssessmentOptionCard({
    required this.optionKey,
    required this.text,
    required this.enabled,
    required this.onTap,
  });

  final String optionKey;
  final String text;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(DriftSpacing.s4),
        decoration: BoxDecoration(
          color: colors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.border),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 14,
              backgroundColor: colors.primaryLight,
              child: Text(
                optionKey,
                style: type.label.copyWith(
                  color: colors.primaryDark,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: DriftSpacing.s3),
            Expanded(child: Text(text, style: type.body)),
          ],
        ),
      ),
    );
  }
}
