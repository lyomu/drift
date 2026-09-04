import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/home/application/home_feed_provider.dart';
import '../../features/notifications/application/notifications_providers.dart';
import '../theme/drift_colors.dart';
import '../theme/drift_typography.dart';

/// The app's persistent chrome (2026-09 redesign): a drawer button, the
/// salutation or tab name, and the trailing actions.
///
///     [≡]  Hi, Gideon                                       [🔔]
///
/// Mounted once in [AppShell] above the tab stack, so it stays put while tab
/// content scrolls under it — the five hub screens no longer draw their own
/// title rows. Pass [title] for a named tab; leave it null (Home) and the
/// header shows the greeting instead.
///
/// Degrades quietly: the greeting falls back to "Welcome back" while
/// `/home/summary` is loading or has failed.
class DriftAppHeader extends ConsumerWidget {
  const DriftAppHeader({super.key, this.title, this.actions = const []});

  /// Tab name, or null on Home to show the greeting.
  final String? title;

  /// Tab-specific actions, placed before the bell.
  final List<Widget> actions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Container(
      color: colors.background,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 16, 8),
          child: Row(
            children: [
              _MenuButton(onTap: () => Scaffold.of(context).openDrawer()),
              const SizedBox(width: 6),
              Expanded(
                child: title != null
                    ? Text(title!, style: type.h2)
                    : const _Greeting(),
              ),
              const SizedBox(width: 8),
              for (final action in actions) ...[
                action,
                const SizedBox(width: 8),
              ],
              const _NotificationBell(),
            ],
          ),
        ),
      ),
    );
  }
}

class _Greeting extends ConsumerWidget {
  const _Greeting();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final summary = ref.watch(homeSummaryProvider).valueOrNull;

    final greeting = summary?.firstName == null
        ? 'Welcome back'
        : 'Hi, ${summary!.firstName}';

    return Text(
      greeting,
      style: type.h2.copyWith(fontSize: 22),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

/// Opens the app drawer, which carries the profile navigation that used to
/// live behind the fifth bottom-nav tab.
class _MenuButton extends StatelessWidget {
  const _MenuButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Material(
      color: Colors.transparent,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(Icons.menu, size: 24, color: colors.textPrimary),
        ),
      ),
    );
  }
}

/// One of Notification Center's two entry points (with the drawer). It sits
/// in the app header now rather than inside Home's scroll content, so the
/// unread badge is visible from every tab.
class _NotificationBell extends ConsumerWidget {
  const _NotificationBell();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final unread = ref
        .watch(notificationsListProvider)
        .valueOrNull
        ?.unreadCount;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Material(
          color: colors.surface,
          shape: CircleBorder(side: BorderSide(color: colors.border)),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => context.push('/notifications'),
            child: SizedBox(
              width: 40,
              height: 40,
              child: Icon(
                Icons.notifications_outlined,
                size: 20,
                color: colors.textPrimary,
              ),
            ),
          ),
        ),
        if (unread != null && unread > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: colors.error,
                shape: BoxShape.circle,
                border: Border.all(color: colors.background, width: 2),
              ),
            ),
          ),
      ],
    );
  }
}
