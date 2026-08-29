import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
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
  AssessmentQuestion? _pendingQuestion;
  bool _showProgressInterstitial = false;
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

      final midpoint = (_questionBudget / 2).ceil();
      final shouldReassure =
          _answeredCount < midpoint && outcome.answeredCount >= midpoint;
      setState(() {
        _answeredCount = outcome.answeredCount;
        if (shouldReassure) {
          _pendingQuestion = outcome.nextQuestion;
          _showProgressInterstitial = true;
        } else {
          _question = outcome.nextQuestion;
        }
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

    return DriftScaffold(
      title: widget.title,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _showProgressInterstitial
          ? _AssessmentProgressInterstitial(
              answeredCount: _answeredCount,
              questionBudget: _questionBudget,
              onContinue: () {
                setState(() {
                  _question = _pendingQuestion;
                  _pendingQuestion = null;
                  _showProgressInterstitial = false;
                });
              },
            )
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
    );
  }
}

class _AssessmentProgressInterstitial extends StatelessWidget {
  const _AssessmentProgressInterstitial({
    required this.answeredCount,
    required this.questionBudget,
    required this.onContinue,
  });

  final int answeredCount;
  final int questionBudget;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LinearProgressIndicator(
            value: questionBudget == 0
                ? 0
                : (answeredCount / questionBudget).clamp(0, 1),
          ),
          const SizedBox(height: DriftSpacing.s8),
          Icon(Icons.trending_up, size: 44, color: colors.primary),
          const SizedBox(height: DriftSpacing.s4),
          Text('Good progress', style: type.h2, textAlign: TextAlign.center),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            'You are halfway through. The next questions fine-tune your level so Drift can suggest better matches.',
            style: type.body.copyWith(color: colors.textSecondary),
            textAlign: TextAlign.center,
          ),
          const Spacer(),
          DriftButton(label: 'Continue', onPressed: onContinue),
        ],
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
