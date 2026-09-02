import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../auth/data/auth_repository.dart';
import '../../courts/data/courts_repository.dart';
import '../application/clubs_providers.dart';
import '../data/clubs_repository.dart';

/// Club Profile — `foundation/04-screen-inventory.md` §A.6 (redesign 2026-08:
/// `App.tsx` `ClubDetailScreen`). Read-only: name, description, contact,
/// and its owned courts (may be empty — a club owning no court is still a
/// valid profile).
class ClubProfileScreen extends ConsumerWidget {
  const ClubProfileScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(clubDetailProvider(clubId));

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Club'),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(clubDetailProvider(clubId));
                  await ref.read(clubDetailProvider(clubId).future);
                },
                child: switch (profile) {
                  AsyncData(:final value) => _ProfileBody(profile: value),
                  AsyncError() => const Center(
                    child: Text('Club not available.'),
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

class _ProfileBody extends ConsumerStatefulWidget {
  const _ProfileBody({required this.profile});

  final ClubProfile profile;

  @override
  ConsumerState<_ProfileBody> createState() => _ProfileBodyState();
}

class _ProfileBodyState extends ConsumerState<_ProfileBody> {
  bool _isBusy = false;
  String? _errorText;

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _isBusy = true;
      _errorText = null;
    });
    try {
      await action();
      ref.invalidate(clubDetailProvider(widget.profile.summary.id));
    } on AuthException catch (e) {
      if (mounted) setState(() => _errorText = e.message);
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final summary = profile.summary;
    final clubId = summary.id;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: Text(summary.name, style: type.h2)),
            if (summary.verificationStatus ==
                ListingVerificationStatus.verified) ...[
              const SizedBox(width: 8),
              const Padding(
                padding: EdgeInsets.only(top: 4),
                child: DriftPill(
                  label: 'Verified',
                  tone: DriftPillTone.success,
                ),
              ),
            ],
          ],
        ),
        if (summary.address != null) ...[
          const SizedBox(height: 4),
          Text(
            summary.address!,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
        if (profile.description != null) ...[
          const SizedBox(height: 8),
          Text(
            profile.description!,
            style: type.bodySmall.copyWith(
              color: colors.textSecondary,
              height: 1.5,
            ),
          ),
        ],
        const SizedBox(height: 16),

        _MembershipActions(
          membership: profile.membership,
          isBusy: _isBusy,
          clubId: clubId,
          onJoin: () => _run(
            () => ref.read(clubsRepositoryProvider).requestToJoin(clubId),
          ),
          onLeave: () =>
              _run(() => ref.read(clubsRepositoryProvider).leave(clubId)),
        ),
        if (_errorText != null) ...[
          const SizedBox(height: 8),
          Text(
            _errorText!,
            style: type.bodySmall.copyWith(color: colors.error),
          ),
        ],
        const SizedBox(height: 8),

        DriftTextLink(
          label: 'View coaches',
          onPressed: () => context.push(
            Uri(
              path: '/discover/coaches',
              queryParameters: {'clubId': clubId, 'clubName': summary.name},
            ).toString(),
          ),
        ),

        if (profile.phone != null || profile.website != null) ...[
          const SizedBox(height: 12),
          DriftSoftCard(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Contact',
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                if (profile.phone != null)
                  Text(profile.phone!, style: type.bodySmall),
                if (profile.website != null)
                  Text(profile.website!, style: type.bodySmall),
              ],
            ),
          ),
        ],

        const SizedBox(height: 18),
        Text('Courts', style: type.h4),
        const SizedBox(height: 10),
        if (profile.courts.isEmpty)
          Text(
            'No courts found',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          )
        else
          for (final court in profile.courts)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _CourtRow(court: court, clubName: summary.name),
            ),
      ],
    );
  }
}

class _CourtRow extends StatelessWidget {
  const _CourtRow({required this.court, required this.clubName});

  final CourtSummary court;
  final String clubName;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: () => context.push('/discover/courts/${court.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            court.name,
            style: type.title.copyWith(fontWeight: FontWeight.w700),
          ),
          if (court.address != null) ...[
            const SizedBox(height: 4),
            _MetaRow(icon: Icons.place_outlined, text: court.address!),
          ],
          const SizedBox(height: 2),
          _MetaRow(icon: Icons.groups_outlined, text: clubName),
          if (court.surfaces.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final s in court.surfaces)
                  DriftPill(label: s, tone: DriftPillTone.neutral),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Row(
      children: [
        Icon(icon, size: 12, color: colors.textSecondary),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: type.caption.copyWith(color: colors.textSecondary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// Join / Requested / Leave, plus the community links a member has earned.
class _MembershipActions extends StatelessWidget {
  const _MembershipActions({
    required this.membership,
    required this.isBusy,
    required this.clubId,
    required this.onJoin,
    required this.onLeave,
  });

  final ClubMembership membership;
  final bool isBusy;
  final String clubId;
  final VoidCallback onJoin;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return switch (membership) {
      ClubMembership.none => DriftPrimaryButton(
        label: isBusy ? 'Requesting…' : 'Request to join',
        onPressed: isBusy ? null : onJoin,
      ),
      ClubMembership.pending || ClubMembership.invited => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            membership == ClubMembership.pending
                ? 'Your request is waiting for a club admin.'
                : 'You have been invited to this club.',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          DriftTextLink(
            label: isBusy ? 'Working…' : 'Withdraw request',
            onPressed: isBusy ? null : onLeave,
          ),
        ],
      ),
      ClubMembership.active => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftPrimaryButton(
            label: 'Announcements',
            onPressed: () =>
                context.push('/discover/clubs/$clubId/announcements'),
          ),
          const SizedBox(height: 4),
          DriftTextLink(
            label: 'Club Feed',
            onPressed: () => context.push('/discover/clubs/$clubId/feed'),
          ),
          DriftTextLink(
            label: isBusy ? 'Working…' : 'Leave club',
            onPressed: isBusy ? null : onLeave,
          ),
        ],
      ),
      ClubMembership.suspended => Text(
        'Your membership of this club is suspended.',
        style: type.bodySmall.copyWith(color: colors.textSecondary),
      ),
    };
  }
}
