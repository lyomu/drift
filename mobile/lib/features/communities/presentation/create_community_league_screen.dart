import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../auth/data/auth_repository.dart';
import '../application/communities_providers.dart';
import '../data/communities_repository.dart';

/// New league for a community (owner/admins). Everything the league needs
/// to run on its own: the registration window, the start date, the number
/// of rounds and the days between them. It is published at once — members
/// see it in the community's Competitions tab — and its rounds generate by
/// themselves on the start date, as club leagues do.
class CreateCommunityLeagueScreen extends ConsumerStatefulWidget {
  const CreateCommunityLeagueScreen({super.key, required this.communityId});

  final String communityId;

  @override
  ConsumerState<CreateCommunityLeagueScreen> createState() =>
      _CreateCommunityLeagueScreenState();
}

class _CreateCommunityLeagueScreenState
    extends ConsumerState<CreateCommunityLeagueScreen> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  final _capacity = TextEditingController();
  late DateTime _opens = _today();
  late DateTime _closes = _today().add(const Duration(days: 7));
  late DateTime _starts = _today().add(const Duration(days: 8));
  int _rounds = 5;
  int _intervalDays = 7;
  bool _submitting = false;
  String? _error;

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _capacity.dispose();
    super.dispose();
  }

  /// Mirrors the server's window rule, so the form says what's wrong before
  /// a round trip does.
  String? _windowError(AppLocalizations l10n) {
    if (!_opens.isBefore(_closes)) return l10n.communityLeagueOpenBeforeClose;
    if (_closes.isAfter(_starts)) return l10n.communityLeagueCloseBeforeStart;
    return null;
  }

  Future<void> _pick(DateTime current, ValueChanged<DateTime> onPicked) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: _today(),
      lastDate: _today().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => onPicked(picked));
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    final router = GoRouter.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final created = context.l10n.communityLeagueCreated;
    try {
      await ref
          .read(communitiesRepositoryProvider)
          .createLeague(
            widget.communityId,
            name: _name.text.trim(),
            description: _description.text,
            registrationOpensAt: _opens,
            // Registration runs to the end of its last day.
            registrationClosesAt: _closes.add(
              const Duration(hours: 23, minutes: 59),
            ),
            startsAt: _starts.add(const Duration(hours: 23, minutes: 59)),
            roundCount: _rounds,
            roundIntervalDays: _intervalDays,
            capacity: int.tryParse(_capacity.text.trim()),
          );
      ref.invalidate(communityCompetitionsProvider(widget.communityId));
      messenger.showSnackBar(SnackBar(content: Text(created)));
      if (router.canPop()) router.pop();
    } on AuthException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final windowError = _windowError(l10n);
    final valid = _name.text.trim().length >= 2 && windowError == null;
    final dateFormat = DateFormat.yMMMEd(localeTagNow);

    Widget dateRow(String label, DateTime value, ValueChanged<DateTime> set) =>
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(label, style: type.body),
          subtitle: Text(dateFormat.format(value), style: type.title),
          trailing: const Icon(Icons.calendar_month_outlined),
          onTap: () => _pick(value, set),
        );

    Widget stepper(String label, int value, int min, int max, ValueChanged<int> set) =>
        Row(
          children: [
            Expanded(child: Text(label, style: type.body)),
            IconButton(
              onPressed: value > min ? () => setState(() => set(value - 1)) : null,
              icon: const Icon(Icons.remove_circle_outline),
            ),
            SizedBox(
              width: 32,
              child: Text(
                '$value',
                textAlign: TextAlign.center,
                style: type.title.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            IconButton(
              onPressed: value < max ? () => setState(() => set(value + 1)) : null,
              icon: const Icon(Icons.add_circle_outline),
            ),
          ],
        );

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Column(
          children: [
            DriftBackHeader(title: l10n.communityNewLeague),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                children: [
                  DriftSoftCard(
                    child: Column(
                      children: [
                        TextField(
                          controller: _name,
                          maxLength: 60,
                          onChanged: (_) => setState(() {}),
                          decoration: InputDecoration(
                            labelText: l10n.communityLeagueName,
                            counterText: '',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _description,
                          maxLines: 3,
                          maxLength: 1000,
                          decoration: InputDecoration(
                            labelText: l10n.communityLeagueDescription,
                            counterText: '',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  DriftSoftCard(
                    child: Column(
                      children: [
                        dateRow(
                          l10n.communityLeagueRegistrationOpens,
                          _opens,
                          (d) => _opens = d,
                        ),
                        dateRow(
                          l10n.communityLeagueRegistrationCloses,
                          _closes,
                          (d) => _closes = d,
                        ),
                        dateRow(
                          l10n.communityLeagueStarts,
                          _starts,
                          (d) => _starts = d,
                        ),
                        if (windowError != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              windowError,
                              style: type.bodySmall.copyWith(
                                color: colors.error,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  DriftSoftCard(
                    child: Column(
                      children: [
                        stepper(
                          l10n.communityLeagueRounds,
                          _rounds,
                          1,
                          30,
                          (v) => _rounds = v,
                        ),
                        stepper(
                          l10n.communityLeagueDaysBetweenRounds,
                          _intervalDays,
                          1,
                          60,
                          (v) => _intervalDays = v,
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _capacity,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: l10n.communityLeagueCapacity,
                            helperText: l10n.communityLeagueCapacityHint,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: type.bodySmall.copyWith(color: colors.error),
                    ),
                  ],
                  const SizedBox(height: 20),
                  DriftPrimaryButton(
                    label: l10n.communityLeagueCreate,
                    loading: _submitting,
                    onPressed: valid && !_submitting ? _submit : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
