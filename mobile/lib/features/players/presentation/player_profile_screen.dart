import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../../auth/data/auth_repository.dart';
import '../../connections/application/connections_providers.dart';
import '../../connections/data/connections_repository.dart';
import '../../safety/presentation/block_report_sheet.dart';
import '../application/players_providers.dart';
import '../data/players_repository.dart';

const _pillarLabels = {
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'NET_PLAY': 'Net Play',
  'MOVEMENT': 'Movement',
  'MATCH_PLAY': 'Match Play',
  'COMPETITION_EXPERIENCE': 'Competition Experience',
};

const _dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/// Player Profile (other player) — `foundation/04-screen-inventory.md` §A.4.
/// Development areas and detailed availability are gated to connections;
/// the API returns null for them otherwise, and this screen shows a prompt
/// rather than an empty state so the gate reads as intentional.
///
/// Connect and Challenge both live here as of M6 — §4.1 permits challenging
/// without connecting first.
class PlayerProfileScreen extends ConsumerStatefulWidget {
  const PlayerProfileScreen({super.key, required this.playerId});

  final String playerId;

  @override
  ConsumerState<PlayerProfileScreen> createState() =>
      _PlayerProfileScreenState();
}

class _PlayerProfileScreenState extends ConsumerState<PlayerProfileScreen> {
  bool _isSubmitting = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _isSubmitting = true);
    try {
      await action();
      ref.invalidate(playerProfileProvider(widget.playerId));
      ref.invalidate(connectionsProvider);
      ref.invalidate(pendingRequestsProvider);
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(playerProfileProvider(widget.playerId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Player'),
        actions: [
          IconButton(
            onPressed: () => showBlockReportSheet(
              context,
              ref,
              playerId: widget.playerId,
              onBlocked: () => Navigator.of(context).pop(),
            ),
            icon: const Icon(Icons.more_vert),
            tooltip: 'Safety options',
          ),
        ],
      ),
      body: SafeArea(
        child: switch (profile) {
          AsyncData(:final value) => _ProfileBody(
            profile: value,
            isSubmitting: _isSubmitting,
            onAction: _run,
            playerId: widget.playerId,
          ),
          AsyncError() => const Center(child: Text('Player not available.')),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _ProfileBody extends ConsumerWidget {
  const _ProfileBody({
    required this.profile,
    required this.isSubmitting,
    required this.onAction,
    required this.playerId,
  });

  final PlayerProfile profile;
  final bool isSubmitting;
  final Future<void> Function(Future<void> Function()) onAction;
  final String playerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final summary = profile.summary;
    final repo = ref.read(connectionsRepositoryProvider);

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Row(
          children: [
            DriftPlayerAvatar(player: summary, radius: 34),
            const SizedBox(width: DriftSpacing.s4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(summary.displayName, style: type.h2),
                  const SizedBox(height: DriftSpacing.s1),
                  Text(
                    summary.distanceBand ?? 'Distance unknown',
                    style: type.bodySmall.copyWith(color: colors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: DriftSpacing.s4),

        _ConnectionAction(
          state: profile.connectionState,
          isSubmitting: isSubmitting,
          onConnect: () => onAction(() async {
            final connectionId = await repo.request(summary.id);
            if (!context.mounted) return;
            _showRequestSentSheet(
              context,
              ref,
              connectionId: connectionId,
              playerId: playerId,
              playerName: summary.displayName,
            );
          }),
        ),
        const SizedBox(height: DriftSpacing.s2),
        // §4.1 allows challenging without connecting first — the connection
        // is created implicitly when the challenge is accepted.
        DriftButton(
          label: 'Challenge to a match',
          variant: DriftButtonVariant.text,
          onPressed: isSubmitting
              ? null
              : () => context.push('/challenge', extra: summary),
        ),
        const SizedBox(height: DriftSpacing.s5),

        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('At a glance', style: type.h4),
              const SizedBox(height: DriftSpacing.s3),
              if (summary.level != null)
                _Fact(
                  label: 'Level',
                  value:
                      '${summary.level!.toStringAsFixed(1)} · ${summary.levelLabel}',
                ),
              if (summary.generalLocation != null)
                _Fact(label: 'Location', value: summary.generalLocation!),
              if (summary.preferredClubName != null)
                _Fact(label: 'Club', value: summary.preferredClubName!),
              if (profile.dominantHand != null)
                _Fact(
                  label: 'Plays',
                  value: '${_titleCase(profile.dominantHand!)} handed',
                ),
              if (summary.formatPreference != null)
                _Fact(
                  label: 'Format',
                  value: _titleCase(summary.formatPreference!),
                ),
              if (summary.stylePreference != null)
                _Fact(
                  label: 'Style',
                  value: _titleCase(summary.stylePreference!),
                ),
              if (summary.availabilitySummary != null)
                _Fact(
                  label: 'Availability',
                  value: summary.availabilitySummary!,
                ),
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s4),

        DriftButton(
          label: 'View Stats',
          variant: DriftButtonVariant.text,
          onPressed: () => context.push(
            '/stats',
            extra: (
              title: '${summary.displayName}\'s Stats',
              stats: profile.stats,
            ),
          ),
        ),
        const SizedBox(height: DriftSpacing.s2),

        _SkillBreakdown(breakdown: profile.skillBreakdown),
        const SizedBox(height: DriftSpacing.s4),
        _DetailedAvailability(slots: profile.availabilitySlots),
      ],
    );
  }
}

void _showRequestSentSheet(
  BuildContext context,
  WidgetRef ref, {
  required String connectionId,
  required String playerId,
  required String playerName,
}) {
  final type = Theme.of(context).extension<DriftTypography>()!;
  final colors = Theme.of(context).extension<DriftColors>()!;
  var isCancelling = false;

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => StatefulBuilder(
      builder: (sheetContext, setSheetState) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            DriftSpacing.s5,
            0,
            DriftSpacing.s5,
            DriftSpacing.s5,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.schedule_send, color: colors.primary),
                  const SizedBox(width: DriftSpacing.s3),
                  Expanded(child: Text('Request sent', style: type.h3)),
                ],
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                '$playerName will see your connection request. You can cancel it while it is still pending.',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              const SizedBox(height: DriftSpacing.s5),
              DriftButton(
                label: 'Done',
                onPressed: () => Navigator.of(sheetContext).pop(),
              ),
              const SizedBox(height: DriftSpacing.s2),
              DriftButton(
                label: isCancelling ? 'Cancelling...' : 'Cancel Request',
                variant: DriftButtonVariant.text,
                onPressed: isCancelling
                    ? null
                    : () async {
                        setSheetState(() => isCancelling = true);
                        try {
                          await ref
                              .read(connectionsRepositoryProvider)
                              .remove(connectionId);
                          ref.invalidate(playerProfileProvider(playerId));
                          ref.invalidate(connectionsProvider);
                          ref.invalidate(pendingRequestsProvider);
                          if (sheetContext.mounted) {
                            Navigator.of(sheetContext).pop();
                          }
                        } on AuthException catch (e) {
                          if (sheetContext.mounted) {
                            ScaffoldMessenger.of(sheetContext).showSnackBar(
                              SnackBar(content: Text(e.message)),
                            );
                          }
                        } finally {
                          if (sheetContext.mounted) {
                            setSheetState(() => isCancelling = false);
                          }
                        }
                      },
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

String _titleCase(String enumValue) {
  return enumValue
      .split('_')
      .map((w) => w.isEmpty ? w : w[0] + w.substring(1).toLowerCase())
      .join(' ');
}

class _ConnectionAction extends StatelessWidget {
  const _ConnectionAction({
    required this.state,
    required this.isSubmitting,
    required this.onConnect,
  });

  final PlayerConnectionState state;
  final bool isSubmitting;
  final VoidCallback onConnect;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      PlayerConnectionState.none => DriftButton(
        label: isSubmitting ? 'Sending…' : 'Connect',
        onPressed: isSubmitting ? null : onConnect,
      ),
      PlayerConnectionState.pendingOutgoing => const Align(
        alignment: Alignment.centerLeft,
        child: DriftStatusBadge(
          label: 'Request sent',
          tone: DriftStatusTone.info,
          icon: Icons.schedule_send,
        ),
      ),
      PlayerConnectionState.pendingIncoming => const Align(
        alignment: Alignment.centerLeft,
        child: DriftStatusBadge(
          label: 'Wants to connect — respond in Requests',
          tone: DriftStatusTone.warning,
          icon: Icons.mark_email_unread_outlined,
        ),
      ),
      PlayerConnectionState.connected => const Align(
        alignment: Alignment.centerLeft,
        child: DriftStatusBadge(
          label: 'Connected',
          tone: DriftStatusTone.success,
          icon: Icons.link,
        ),
      ),
    };
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
          Expanded(child: Text(value, style: type.body)),
        ],
      ),
    );
  }
}

class _SkillBreakdown extends StatelessWidget {
  const _SkillBreakdown({required this.breakdown});

  final Map<String, num>? breakdown;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    if (breakdown == null) {
      return _GatedCard(
        title: 'Development areas',
        message: 'Connect with this player to see their skill breakdown.',
      );
    }
    if (breakdown!.isEmpty) {
      return DriftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Development areas', style: type.h4),
            const SizedBox(height: DriftSpacing.s2),
            Text(
              "This player hasn't completed an assessment yet.",
              style: type.body.copyWith(color: colors.textSecondary),
            ),
          ],
        ),
      );
    }

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Development areas', style: type.h4),
          const SizedBox(height: DriftSpacing.s3),
          for (final entry in breakdown!.entries) ...[
            Text(_pillarLabels[entry.key] ?? entry.key, style: type.label),
            const SizedBox(height: DriftSpacing.s1),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (entry.value / 6).clamp(0.0, 1.0).toDouble(),
                minHeight: 8,
              ),
            ),
            const SizedBox(height: DriftSpacing.s3),
          ],
        ],
      ),
    );
  }
}

class _DetailedAvailability extends StatelessWidget {
  const _DetailedAvailability({required this.slots});

  final List<AvailabilitySlot>? slots;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    if (slots == null) {
      return _GatedCard(
        title: 'Availability',
        message: "Connect to see when this player is usually free.",
      );
    }
    if (slots!.isEmpty) {
      return const SizedBox.shrink();
    }

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Availability', style: type.h4),
          const SizedBox(height: DriftSpacing.s2),
          for (final slot in slots!)
            Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s1),
              child: Text(
                '${_dayNames[slot.dayOfWeek]} · ${_titleCase(slot.timeBlock)}',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
            ),
        ],
      ),
    );
  }
}

/// A field the viewer isn't entitled to see yet — shown as a deliberate
/// gate, never as an empty state.
class _GatedCard extends StatelessWidget {
  const _GatedCard({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.lock_outline, size: 18, color: colors.textSecondary),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: type.h4),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  message,
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
