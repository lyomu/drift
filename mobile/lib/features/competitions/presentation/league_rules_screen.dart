import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../application/competitions_providers.dart';
import '../data/competitions_repository.dart';

/// League Rules — `foundation/04-screen-inventory.md` §A.5. `rulesText` is
/// sanitised HTML from the Club Admin editor (backend
/// `common/rich-text.util.ts`); the scoring / walkover / unfinished-match
/// fields are plain text set on the same admin page.
class LeagueRulesScreen extends ConsumerWidget {
  const LeagueRulesScreen({super.key, required this.leagueId});

  final String leagueId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final league = ref.watch(leagueDetailProvider(leagueId));

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Rules'),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(leagueDetailProvider(leagueId));
                  await ref.read(leagueDetailProvider(leagueId).future);
                },
                child: switch (league) {
                  AsyncData(:final value) => _RulesBody(league: value),
                  AsyncError() => const Center(
                    child: Text('Rules not available.'),
                  ),
                  _ => const Center(child: CircularProgressIndicator()),
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RulesBody extends StatelessWidget {
  const _RulesBody({required this.league});

  final League league;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final hasRules = league.rulesText?.isNotEmpty == true;
    final policies = <(String, String?)>[
      ('Scoring format', league.scoringFormat),
      ('Walkovers', league.walkoverRule),
      ('Unfinished matches', league.unfinishedMatchPolicy),
    ].where((e) => e.$2?.isNotEmpty == true).toList();

    if (!hasRules && policies.isEmpty) {
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          Text(
            'No rules have been published for this league yet.',
            style: type.body.copyWith(
              height: 1.65,
              color: colors.textSecondary,
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
      children: [
        if (hasRules)
          HtmlWidget(
            league.rulesText!,
            textStyle: type.body.copyWith(height: 1.65),
            onTapUrl: (url) async {
              final uri = Uri.tryParse(url);
              if (uri == null) return false;
              return launchUrl(uri, mode: LaunchMode.externalApplication);
            },
          ),
        for (final (label, value) in policies) ...[
          const SizedBox(height: 20),
          Text(label, style: type.title.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(value!, style: type.body.copyWith(height: 1.6)),
        ],
      ],
    );
  }
}
