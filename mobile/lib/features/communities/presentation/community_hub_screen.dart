import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_community_card.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_section_header.dart';
import '../application/communities_providers.dart';
import '../data/communities_repository.dart';
import 'create_community_sheet.dart';

/// Community tab (2026-11) — took the bottom-nav slot freed when Play and
/// Compete merged. The viewer's own communities first (including ones under
/// review and pending requests), then approved communities nearby, with a
/// search box and Near me / city / type filters. Creating one is the shell
/// header's "+" or the empty state's button.
class CommunityHubScreen extends ConsumerStatefulWidget {
  const CommunityHubScreen({super.key});

  @override
  ConsumerState<CommunityHubScreen> createState() => _CommunityHubScreenState();
}

class _CommunityHubScreenState extends ConsumerState<CommunityHubScreen> {
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _search.text = ref.read(communityFiltersProvider).q ?? '';
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _setFilters(CommunityFilters Function(CommunityFilters) update) {
    final notifier = ref.read(communityFiltersProvider.notifier);
    notifier.state = update(notifier.state);
  }

  Future<void> _refresh() async {
    ref.invalidate(myCommunitiesProvider);
    ref.invalidate(communitySearchProvider);
    await ref.read(communitySearchProvider.future);
  }

  Future<void> _pickCity() async {
    final current = ref.read(communityFiltersProvider).city;
    final city = await showDialog<String>(
      context: context,
      builder: (context) => _CityDialog(initial: current),
    );
    if (city == null) return;
    _setFilters(
      (f) => f.copyWith(
        city: () => city.trim().isEmpty ? null : city.trim(),
        nearMe: false,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final filters = ref.watch(communityFiltersProvider);
    final mine = ref.watch(myCommunitiesProvider);
    final results = ref.watch(communitySearchProvider);

    final myList = mine.valueOrNull ?? const <Community>[];
    final myIds = myList.map((c) => c.id).toSet();
    // Already listed under "Your communities"; don't repeat them below.
    final discover = results.valueOrNull
        ?.where((c) => !myIds.contains(c.id))
        .toList();

    final nothingAtAll =
        filters.isEmpty &&
        mine.hasValue &&
        myList.isEmpty &&
        discover != null &&
        discover.isEmpty;

    return Container(
      color: colors.background,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
          children: [
            _SearchField(
              controller: _search,
              onChanged: (value) => _setFilters(
                (f) => f.copyWith(q: () => value.trim().isEmpty ? null : value),
              ),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  DriftFilterChip(
                    label: l10n.communityFilterNearMe,
                    selected: filters.nearMe,
                    onTap: () => _setFilters(
                      (f) => f.copyWith(nearMe: !f.nearMe, city: () => null),
                    ),
                  ),
                  const SizedBox(width: 8),
                  DriftFilterChip(
                    label: filters.city ?? l10n.communityFilterCity,
                    selected: filters.city != null,
                    onTap: _pickCity,
                  ),
                  for (final type in CommunityType.values) ...[
                    const SizedBox(width: 8),
                    DriftFilterChip(
                      label: type.label,
                      selected: filters.type == type,
                      onTap: () => _setFilters(
                        (f) => f.copyWith(
                          type: () => f.type == type ? null : type,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (nothingAtAll)
              _EmptyState(onCreate: () => showCreateCommunitySheet(context, ref))
            else ...[
              if (myList.isNotEmpty && filters.isEmpty) ...[
                DriftSectionHeader(title: l10n.communityYourCommunities),
                const SizedBox(height: 10),
                for (final community in myList) ...[
                  DriftCommunityCard(
                    community: community,
                    onTap: () => context.push('/communities/${community.id}'),
                  ),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 10),
              ],
              DriftSectionHeader(
                title: filters.isEmpty
                    ? l10n.communityNearYou
                    : l10n.communityResults,
              ),
              const SizedBox(height: 10),
              switch (results) {
                AsyncError() => _Message(
                  text: l10n.communityLoadFailed,
                  action: l10n.commonRetry,
                  onAction: () => ref.invalidate(communitySearchProvider),
                ),
                _ when discover == null => const Padding(
                  padding: EdgeInsets.only(top: 32),
                  child: Center(child: CircularProgressIndicator()),
                ),
                _ when discover.isEmpty => _Message(
                  text: filters.isEmpty
                      ? l10n.communityNoneNearby
                      : l10n.communityNoneMatch,
                  action: l10n.communityStart,
                  onAction: () => showCreateCommunitySheet(context, ref),
                ),
                _ => Column(
                  children: [
                    for (final community in discover) ...[
                      DriftCommunityCard(
                        community: community,
                        onTap: () =>
                            context.push('/communities/${community.id}'),
                      ),
                      const SizedBox(height: 10),
                    ],
                  ],
                ),
              },
            ],
          ],
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        hintText: context.l10n.communitySearchHint,
        prefixIcon: const Icon(Icons.search_rounded),
      ),
    );
  }
}

/// Screenshot-1 empty state: icon tile, headline, what a community is, and
/// the create button.
class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 48, 16, 24),
      child: Column(
        children: [
          Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: colors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.groups_outlined, size: 40, color: colors.primary),
          ),
          const SizedBox(height: 20),
          Text(
            l10n.communityEmptyTitle,
            textAlign: TextAlign.center,
            style: type.h3,
          ),
          const SizedBox(height: 8),
          Text(
            l10n.communityEmptyBody,
            textAlign: TextAlign.center,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: onCreate,
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              shape: const StadiumBorder(),
            ),
            child: Text(l10n.communityStart),
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.text, this.action, this.onAction});

  final String text;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
      child: Column(
        children: [
          Text(
            text,
            textAlign: TextAlign.center,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
          if (action != null) ...[
            const SizedBox(height: 8),
            TextButton(onPressed: onAction, child: Text(action!)),
          ],
        ],
      ),
    );
  }
}

class _CityDialog extends StatefulWidget {
  const _CityDialog({this.initial});

  final String? initial;

  @override
  State<_CityDialog> createState() => _CityDialogState();
}

class _CityDialogState extends State<_CityDialog> {
  late final _controller = TextEditingController(text: widget.initial ?? '');

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.communityFilterCityTitle),
      content: TextField(
        controller: _controller,
        autofocus: true,
        textCapitalization: TextCapitalization.words,
        decoration: InputDecoration(hintText: l10n.communityCityHint),
        onSubmitted: (value) => Navigator.of(context).pop(value),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(''),
          child: Text(l10n.communityFilterAnyCity),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(_controller.text),
          child: Text(l10n.commonDone),
        ),
      ],
    );
  }
}
