import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../application/notifications_providers.dart';
import '../data/notifications_repository.dart';
import '../../../core/l10n/l10n.dart';

(String, String) _categoryLabel(AppLocalizations l, NotificationCategory c) =>
    switch (c) {
      NotificationCategory.connections => (
        l.connectionsTitle,
        l.notifPrefConnections,
      ),
      NotificationCategory.matches => (l.notifPrefMatchesTitle, l.notifPrefMatches),
      NotificationCategory.messages => (l.navMessages, l.notifPrefMessages),
      NotificationCategory.competitions => (
        l.searchCompetitions,
        l.notifPrefCompetitions,
      ),
      NotificationCategory.learning => (l.notifPrefLearningTitle, l.notifPrefLearning),
      NotificationCategory.news => (l.navNews, l.notifPrefNews),
      NotificationCategory.clubs => (l.discoverClubs, l.notifPrefClubs),
      NotificationCategory.announcements => (
        l.clubAnnouncements,
        l.notifPrefAnnouncements,
      ),
      NotificationCategory.communities => (
        l.navCommunity,
        l.notifPrefCommunities,
      ),
      NotificationCategory.unknown => ('', ''),
    };

/// Notification Preferences — `foundation/04-screen-inventory.md` §A.11.
/// News defaults off on the backend (Doc 6 §5); everything else defaults on.
class NotificationPreferencesScreen extends ConsumerWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(notificationPreferencesProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftScaffold(
      title: context.l10n.settingsNotificationPreferences,
      body: switch (prefs) {
        AsyncData(:final value) => _PreferencesList(preferences: value),
        AsyncError() => Center(
          child: Text(context.l10n.notifPrefLoadFailed, style: type.body),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _PreferencesList extends ConsumerStatefulWidget {
  const _PreferencesList({required this.preferences});

  final NotificationPreferences preferences;

  @override
  ConsumerState<_PreferencesList> createState() => _PreferencesListState();
}

class _PreferencesListState extends ConsumerState<_PreferencesList> {
  late Map<NotificationCategory, bool> _values;
  final _pending = <NotificationCategory>{};

  @override
  void initState() {
    super.initState();
    _values = {
      for (final category in NotificationCategory.values)
        if (category != NotificationCategory.unknown)
          category: widget.preferences.forCategory(category),
    };
  }

  Future<void> _toggle(NotificationCategory category, bool value) async {
    setState(() {
      _values[category] = value;
      _pending.add(category);
    });
    try {
      await ref.read(notificationsRepositoryProvider).updatePreferences({
        category: value,
      });
    } on AuthException catch (e) {
      if (!mounted) return;
      setState(() => _values[category] = !value);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _pending.remove(category));
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        // `unknown` is the degrade-don't-throw placeholder for categories
        // this build predates — it has no wire value to persist and no
        // label, so it gets no toggle row rather than a null-check crash.
        for (final category in NotificationCategory.values)
          if (category != NotificationCategory.unknown) ...[
            DriftCard(
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  _categoryLabel(context.l10n, category).$1,
                  style: type.title,
                ),
                subtitle: Text(_categoryLabel(context.l10n, category).$2),
                value: _values[category]!,
                onChanged: _pending.contains(category)
                    ? null
                    : (value) => _toggle(category, value),
              ),
            ),
            const SizedBox(height: DriftSpacing.s3),
          ],
      ],
    );
  }
}
