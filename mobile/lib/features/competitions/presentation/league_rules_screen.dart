import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../application/competitions_providers.dart';

/// League Rules — `foundation/04-screen-inventory.md` §A.5. Plain text.
class LeagueRulesScreen extends ConsumerWidget {
  const LeagueRulesScreen({super.key, required this.leagueId});

  final String leagueId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final league = ref.watch(leagueDetailProvider(leagueId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

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
                  AsyncData(:final value) => ListView(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                    children: [
                      Text(
                        value.rulesText?.isNotEmpty == true
                            ? value.rulesText!
                            : 'No rules have been published for this league '
                                  'yet.',
                        style: type.body.copyWith(
                          height: 1.65,
                          color: value.rulesText?.isNotEmpty == true
                              ? null
                              : colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
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
