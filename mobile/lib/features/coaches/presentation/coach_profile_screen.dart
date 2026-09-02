import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/coaches_providers.dart';
import '../data/coaches_repository.dart';

/// Coach Profile — `foundation/04-screen-inventory.md` §A.6 (redesign
/// 2026-08: `App.tsx` `CoachProfileScreen`).
class CoachProfileScreen extends ConsumerWidget {
  const CoachProfileScreen({super.key, required this.coachId});
  final String coachId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(coachProfileProvider(coachId));
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Coach'),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () =>
                    ref.refresh(coachProfileProvider(coachId).future),
                child: switch (profile) {
                  AsyncData(:final value) => _ProfileBody(profile: value),
                  AsyncError() => ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text(
                          'Coach profile is not available.',
                          textAlign: TextAlign.center,
                          style: type.body,
                        ),
                      ),
                    ],
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

class _ProfileBody extends StatelessWidget {
  const _ProfileBody({required this.profile});
  final CoachProfile profile;

  @override
  Widget build(BuildContext context) {
    final coach = profile.summary;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final initials = coach.displayName
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 32,
              backgroundColor: colors.primary,
              foregroundImage: coach.photoUrl == null
                  ? null
                  : NetworkImage(coach.photoUrl!),
              onForegroundImageError: coach.photoUrl == null ? null : (_, _) {},
              child: Text(
                initials.isEmpty ? 'C' : initials,
                style: type.h4.copyWith(color: Colors.white),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(coach.displayName, style: type.h2),
                  if (coach.yearsExperience != null) ...[
                    const SizedBox(height: 3),
                    Text(
                      '${coach.yearsExperience} years coaching',
                      style: type.bodySmall.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        if (coach.bio != null) ...[
          const SizedBox(height: 14),
          Text(
            coach.bio!,
            style: type.body.copyWith(color: colors.textSecondary, height: 1.6),
          ),
        ],
        const SizedBox(height: 16),
        DriftPrimaryButton(
          label: 'Contact / Book',
          onPressed: () => _showContactSheet(context, profile),
        ),

        if (coach.specialisations.isNotEmpty) ...[
          const SizedBox(height: 20),
          _Section(
            title: 'Specialisations',
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in coach.specialisations)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: colors.border, width: 1.5),
                    ),
                    child: Text(item, style: type.bodySmall),
                  ),
              ],
            ),
          ),
        ],

        if (coach.levels.isNotEmpty) ...[
          const SizedBox(height: 12),
          _Section(
            title: 'Players coached',
            child: Text(
              coach.levels.map((l) => l.label).join(' · '),
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
        ],

        if (profile.qualifications.isNotEmpty) ...[
          const SizedBox(height: 12),
          _Section(
            title: 'Qualifications',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final q in profile.qualifications)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          size: 16,
                          color: colors.primary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            q,
                            style: type.bodySmall.copyWith(
                              color: colors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],

        if (profile.availabilityNote != null) ...[
          const SizedBox(height: 12),
          _Section(
            title: 'Availability',
            child: Text(
              profile.availabilityNote!,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
        ],

        if (coach.clubs.isNotEmpty) ...[
          const SizedBox(height: 12),
          _Section(
            title: 'Clubs',
            child: Column(
              children: [
                for (final club in coach.clubs)
                  InkWell(
                    onTap: () => context.push('/discover/clubs/${club.id}'),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          const DriftIconTile(icon: Icons.apartment_outlined),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              club.name,
                              style: type.title.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Icon(
                            Icons.chevron_right,
                            color: colors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return DriftSoftCard(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: type.title.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

Future<void> _showContactSheet(BuildContext context, CoachProfile profile) {
  final contact = profile.contact;
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Contact ${profile.summary.displayName}',
              style: Theme.of(context).extension<DriftTypography>()!.h3,
            ),
            const SizedBox(height: 16),
            if (contact.bookingUrl != null) ...[
              DriftPrimaryButton(
                label: 'Open booking page',
                onPressed: () => _launch(
                  context,
                  sheetContext,
                  Uri.parse(contact.bookingUrl!),
                ),
              ),
              const SizedBox(height: 8),
            ],
            if (contact.phone != null)
              DriftTextLink(
                label: 'Call ${contact.phone}',
                onPressed: () => _launch(
                  context,
                  sheetContext,
                  Uri(scheme: 'tel', path: contact.phone!),
                ),
              ),
            if (contact.email != null)
              DriftTextLink(
                label: 'Email coach',
                onPressed: () => _launch(
                  context,
                  sheetContext,
                  Uri(scheme: 'mailto', path: contact.email!),
                ),
              ),
          ],
        ),
      ),
    ),
  );
}

Future<void> _launch(
  BuildContext pageContext,
  BuildContext sheetContext,
  Uri uri,
) async {
  Navigator.of(sheetContext).pop();
  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && pageContext.mounted) {
    ScaffoldMessenger.of(pageContext).showSnackBar(
      const SnackBar(content: Text('Could not open that contact method.')),
    );
  }
}
