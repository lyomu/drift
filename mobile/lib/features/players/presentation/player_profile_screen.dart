import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_soft_card.dart';
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

/// Player Profile (other player) — `foundation/04-screen-inventory.md` §A.4
/// (redesign 2026-08: `App.tsx` `PlayerProfileScreen`).
///
/// Development areas and detailed availability are gated to connections; the
/// API returns null for them otherwise, and this screen shows a lock card
/// rather than an empty state so the gate reads as intentional.
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
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(
              title: 'Player',
              trailing: DriftHeaderSquareButton(
                icon: Icons.more_vert,
                onTap: () => showBlockReportSheet(
                  context,
                  ref,
                  playerId: widget.playerId,
                  onBlocked: () => Navigator.of(context).pop(),
                ),
              ),
            ),
            Expanded(
              child: switch (profile) {
                AsyncData(:final value) => _ProfileBody(
                  profile: value,
                  isSubmitting: _isSubmitting,
                  onAction: _run,
                  playerId: widget.playerId,
                ),
                AsyncError() => const Center(
                  child: Text('Player not available.'),
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
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        Row(
          children: [
            DriftPlayerAvatar(player: summary, radius: 32),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(summary.displayName, style: type.h2),
                  const SizedBox(height: 3),
                  Text(
                    summary.distanceBand ?? 'Distance unknown',
                    style: type.bodySmall.copyWith(color: colors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

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

        // §4.1 allows challenging without connecting first — the connection
        // is created implicitly when the challenge is accepted.
        DriftTextLink(
          label: 'Challenge to a match',
          onPressed: isSubmitting
              ? null
              : () => context.push('/challenge', extra: summary),
        ),
        const SizedBox(height: 14),

        DriftSoftCard(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'AT A GLANCE',
                style: type.caption.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              _facts(profile),
            ],
          ),
        ),
        const SizedBox(height: 4),

        DriftTextLink(
          label: 'View Stats',
          onPressed: () => context.push(
            '/stats',
            extra: (
              title: '${summary.displayName}\'s Stats',
              stats: profile.stats,
            ),
          ),
        ),
        const SizedBox(height: 10),

        _SkillBreakdown(breakdown: profile.skillBreakdown),
        const SizedBox(height: 12),
        _DetailedAvailability(slots: profile.availabilitySlots),
      ],
    );
  }

  Widget _facts(PlayerProfile profile) {
    final summary = profile.summary;
    final rows = <(String, String)>[
      if (summary.level != null)
        (
          'Level',
          '${summary.level!.toStringAsFixed(1)} · ${summary.levelLabel}',
        ),
      if (summary.generalLocation != null)
        ('Location', summary.generalLocation!),
      if (summary.preferredClubName != null)
        ('Club', summary.preferredClubName!),
      if (profile.dominantHand != null)
        ('Plays', '${_titleCase(profile.dominantHand!)} handed'),
      if (summary.formatPreference != null)
        ('Format', _titleCase(summary.formatPreference!)),
      if (summary.stylePreference != null)
        ('Style', _titleCase(summary.stylePreference!)),
      if (summary.availabilitySummary != null)
        ('Availability', summary.availabilitySummary!),
    ];

    return Column(
      children: [
        for (var i = 0; i < rows.length; i++)
          _Fact(
            label: rows[i].$1,
            value: rows[i].$2,
            last: i == rows.length - 1,
          ),
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
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(Icons.schedule_send, color: colors.primary),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Request sent', style: type.h3)),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                '$playerName will see your connection request. You can cancel '
                'it while it is still pending.',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              const SizedBox(height: 20),
              DriftPrimaryButton(
                label: 'Done',
                onPressed: () => Navigator.of(sheetContext).pop(),
              ),
              const SizedBox(height: 4),
              DriftTextLink(
                label: isCancelling ? 'Cancelling…' : 'Cancel Request',
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
                            ScaffoldMessenger.of(
                              sheetContext,
                            ).showSnackBar(SnackBar(content: Text(e.message)));
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
    switch (state) {
      case PlayerConnectionState.none:
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: DriftPrimaryButton(
            label: isSubmitting ? 'Sending…' : 'Connect',
            onPressed: isSubmitting ? null : onConnect,
          ),
        );
      case PlayerConnectionState.pendingOutgoing:
        return const _Banner(
          icon: Icons.schedule_send,
          label: 'Request sent',
          tone: _BannerTone.info,
        );
      case PlayerConnectionState.pendingIncoming:
        return const _Banner(
          icon: Icons.mark_email_unread_outlined,
          label: 'Wants to connect — respond in Requests',
          tone: _BannerTone.warning,
        );
      case PlayerConnectionState.connected:
        return const _Banner(
          icon: Icons.link,
          label: 'Connected',
          tone: _BannerTone.success,
        );
    }
  }
}

enum _BannerTone { info, success, warning }

class _Banner extends StatelessWidget {
  const _Banner({required this.icon, required this.label, required this.tone});

  final IconData icon;
  final String label;
  final _BannerTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final (bg, fg) = switch (tone) {
      _BannerTone.info => (colors.primaryLight, colors.primary),
      _BannerTone.success => (colors.successSurface, colors.success),
      _BannerTone.warning => (colors.warningSurface, colors.warning),
    };

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: fg),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: type.caption.copyWith(
                color: fg,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value, this.last = false});

  final String label;
  final String value;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        border: last ? null : Border(bottom: BorderSide(color: colors.border)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: type.bodySmall.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
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
      return const _LockCard(
        title: 'Development areas',
        message: 'Connect with this player to see their skill breakdown.',
      );
    }
    if (breakdown!.isEmpty) {
      return DriftSoftCard(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Development areas',
              style: type.title.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            Text(
              "This player hasn't completed an assessment yet.",
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ],
        ),
      );
    }

    return DriftSoftCard(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Development areas',
            style: type.title.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          for (final entry in breakdown!.entries) ...[
            Text(_pillarLabels[entry.key] ?? entry.key, style: type.caption),
            const SizedBox(height: 5),
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: (entry.value / 6).clamp(0.0, 1.0).toDouble(),
                minHeight: 5,
                backgroundColor: colors.primaryLight,
                valueColor: AlwaysStoppedAnimation(colors.primary),
              ),
            ),
            const SizedBox(height: 11),
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
      return const _LockCard(
        title: 'Availability',
        message: 'Connect to see when this player is usually free.',
      );
    }
    if (slots!.isEmpty) return const SizedBox.shrink();

    return DriftSoftCard(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Availability',
            style: type.title.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final slot in slots!)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: colors.primaryLight,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '${_dayNames[slot.dayOfWeek]} · ${_titleCase(slot.timeBlock)}',
                    style: type.caption.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A field the viewer isn't entitled to see yet — shown as a deliberate
/// gate, never as an empty state.
class _LockCard extends StatelessWidget {
  const _LockCard({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftSoftCard(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: colors.background,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.lock_outline,
              size: 18,
              color: colors.textSecondary,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: type.label.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(
                  message,
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
