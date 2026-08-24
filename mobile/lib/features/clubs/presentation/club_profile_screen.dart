import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_court_card.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../auth/data/auth_repository.dart';
import '../../courts/data/courts_repository.dart';
import '../application/clubs_providers.dart';
import '../data/clubs_repository.dart';

/// Club Profile — `foundation/04-screen-inventory.md` §A.6. Read-only:
/// name, description, contact, amenities, and its owned courts (may be
/// empty — a club owning no court is still a valid profile, not an error,
/// since courts and clubs are independently discoverable).
class ClubProfileScreen extends ConsumerWidget {
  const ClubProfileScreen({super.key, required this.clubId});

  final String clubId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(clubDetailProvider(clubId));

    return Scaffold(
      appBar: AppBar(title: const Text('Club')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(clubDetailProvider(clubId));
            await ref.read(clubDetailProvider(clubId).future);
          },
          child: switch (profile) {
            AsyncData(:final value) => _ProfileBody(profile: value),
            AsyncError() => const Center(child: Text('Club not available.')),
            _ => const Center(child: CircularProgressIndicator()),
          },
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

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Row(
          children: [
            Expanded(child: Text(summary.name, style: type.h2)),
            if (summary.verificationStatus ==
                ListingVerificationStatus.verified)
              const DriftStatusBadge(
                label: 'Verified',
                tone: DriftStatusTone.success,
                icon: Icons.verified_outlined,
              ),
          ],
        ),
        if (summary.address != null) ...[
          const SizedBox(height: DriftSpacing.s1),
          Text(
            summary.address!,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
        if (profile.description != null) ...[
          const SizedBox(height: DriftSpacing.s3),
          Text(profile.description!, style: type.body),
        ],
        const SizedBox(height: DriftSpacing.s4),

        _MembershipActions(
          profile: profile,
          isBusy: _isBusy,
          onJoin: () => _run(
            () => ref
                .read(clubsRepositoryProvider)
                .requestToJoin(profile.summary.id),
          ),
          onLeave: () => _run(
            () => ref.read(clubsRepositoryProvider).leave(profile.summary.id),
          ),
        ),
        if (_errorText != null) ...[
          const SizedBox(height: DriftSpacing.s2),
          Text(_errorText!, style: TextStyle(color: colors.error)),
        ],
        const SizedBox(height: DriftSpacing.s4),

        if (profile.phone != null || profile.website != null)
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Contact', style: type.h4),
                const SizedBox(height: DriftSpacing.s2),
                if (profile.phone != null)
                  Text(profile.phone!, style: type.body),
                if (profile.website != null)
                  Text(profile.website!, style: type.body),
              ],
            ),
          ),
        if (profile.phone != null || profile.website != null)
          const SizedBox(height: DriftSpacing.s4),

        Text('Courts', style: type.h4),
        const SizedBox(height: DriftSpacing.s3),
        if (profile.courts.isEmpty)
          Text(
            'No courts found',
            style: type.body.copyWith(color: colors.textSecondary),
          )
        else
          for (final court in profile.courts)
            Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
              child: DriftCourtCard(
                court: court,
                onTap: () => context.push('/discover/courts/${court.id}'),
              ),
            ),
      ],
    );
  }
}

/// Join / Requested / Leave, plus the community links a member has earned.
/// Doc 2 §67: "Club Profile → Join / Follow → Club Feed".
class _MembershipActions extends StatelessWidget {
  const _MembershipActions({
    required this.profile,
    required this.isBusy,
    required this.onJoin,
    required this.onLeave,
  });

  final ClubProfile profile;
  final bool isBusy;
  final VoidCallback onJoin;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final clubId = profile.summary.id;

    return switch (profile.membership) {
      ClubMembership.none => DriftButton(
        label: isBusy ? 'Requesting…' : 'Request to join',
        onPressed: isBusy ? null : onJoin,
      ),
      // A request an admin hasn't actioned yet. Withdrawing is the only
      // move available, so the button does that rather than nothing.
      ClubMembership.pending || ClubMembership.invited => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            profile.membership == ClubMembership.pending
                ? 'Your request is waiting for a club admin.'
                : 'You have been invited to this club.',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: isBusy ? 'Working…' : 'Withdraw request',
            variant: DriftButtonVariant.text,
            onPressed: isBusy ? null : onLeave,
          ),
        ],
      ),
      ClubMembership.active => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftButton(
            label: 'Announcements',
            onPressed: () => context.push('/discover/clubs/$clubId/announcements'),
          ),
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'Club Feed',
            variant: DriftButtonVariant.text,
            onPressed: () => context.push('/discover/clubs/$clubId/feed'),
          ),
          DriftButton(
            label: isBusy ? 'Working…' : 'Leave club',
            variant: DriftButtonVariant.text,
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
