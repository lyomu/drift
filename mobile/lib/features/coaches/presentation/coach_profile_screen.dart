import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../application/coaches_providers.dart';
import '../data/coaches_repository.dart';

class CoachProfileScreen extends ConsumerWidget {
  const CoachProfileScreen({super.key, required this.coachId});
  final String coachId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(coachProfileProvider(coachId));
    return Scaffold(
      appBar: AppBar(title: const Text('Coach')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(coachProfileProvider(coachId).future),
          child: switch (profile) {
            AsyncData(:final value) => _ProfileBody(profile: value),
            AsyncError() => ListView(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(DriftSpacing.s6),
                    child: Column(
                      children: [
                        const Text('Coach profile is not available.'),
                        const SizedBox(height: DriftSpacing.s3),
                        DriftButton(
                          label: 'Retry',
                          variant: DriftButtonVariant.text,
                          onPressed: () => ref.invalidate(
                            coachProfileProvider(coachId),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            _ => const Center(child: CircularProgressIndicator()),
          },
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

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 36,
              backgroundImage: coach.photoUrl == null
                  ? null
                  : NetworkImage(coach.photoUrl!),
              child: coach.photoUrl == null
                  ? const Icon(Icons.sports_tennis_outlined, size: 30)
                  : null,
            ),
            const SizedBox(width: DriftSpacing.s4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(coach.displayName, style: type.h2),
                  if (coach.verificationStatus ==
                      CoachVerificationStatus.verified) ...[
                    const SizedBox(height: DriftSpacing.s2),
                    const DriftStatusBadge(
                      label: 'Verified coach',
                      tone: DriftStatusTone.success,
                      icon: Icons.verified_outlined,
                    ),
                  ],
                  if (coach.yearsExperience != null) ...[
                    const SizedBox(height: DriftSpacing.s2),
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
          const SizedBox(height: DriftSpacing.s5),
          Text(coach.bio!, style: type.bodyLarge),
        ],
        const SizedBox(height: DriftSpacing.s5),
        DriftButton(
          label: 'Contact / Book',
          onPressed: () => _showContactSheet(context, profile),
        ),
        if (coach.specialisations.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s6),
          _Section(
            title: 'Specialisations',
            child: Wrap(
              spacing: DriftSpacing.s2,
              runSpacing: DriftSpacing.s2,
              children: [
                for (final item in coach.specialisations) Chip(label: Text(item)),
              ],
            ),
          ),
        ],
        if (coach.levels.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          _Section(
            title: 'Players coached',
            child: Text(
              coach.levels.map((level) => level.label).join(' · '),
              style: type.body,
            ),
          ),
        ],
        if (profile.qualifications.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          _Section(
            title: 'Qualifications',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final item in profile.qualifications)
                  Padding(
                    padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.check_circle_outline,
                          size: 18,
                          color: colors.primary,
                        ),
                        const SizedBox(width: DriftSpacing.s2),
                        Expanded(child: Text(item, style: type.body)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
        if (profile.availabilityNote != null) ...[
          const SizedBox(height: DriftSpacing.s5),
          _Section(
            title: 'Availability',
            child: Text(profile.availabilityNote!, style: type.body),
          ),
        ],
        if (coach.clubs.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          _Section(
            title: 'Clubs',
            child: Column(
              children: [
                for (final club in coach.clubs)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.groups_outlined),
                    title: Text(club.name),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/discover/clubs/${club.id}'),
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
    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: type.h4),
          const SizedBox(height: DriftSpacing.s3),
          child,
        ],
      ),
    );
  }
}

Future<void> _showContactSheet(
  BuildContext context,
  CoachProfile profile,
) {
  final contact = profile.contact;
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s5,
          0,
          DriftSpacing.s5,
          DriftSpacing.s5,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Contact ${profile.summary.displayName}',
              style: Theme.of(context).extension<DriftTypography>()!.h3,
            ),
            const SizedBox(height: DriftSpacing.s4),
            if (contact.bookingUrl != null)
              DriftButton(
                label: 'Open booking page',
                onPressed: () => _launch(
                  context,
                  sheetContext,
                  Uri.parse(contact.bookingUrl!),
                ),
              ),
            if (contact.phone != null)
              DriftButton(
                label: 'Call ${contact.phone}',
                variant: DriftButtonVariant.text,
                onPressed: () => _launch(
                  context,
                  sheetContext,
                  Uri(scheme: 'tel', path: contact.phone!),
                ),
              ),
            if (contact.email != null)
              DriftButton(
                label: 'Email coach',
                variant: DriftButtonVariant.text,
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
