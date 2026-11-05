import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/media_url.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../data/tennis_facts_repository.dart';

/// Opens [fact] as a short bottom sheet and records it as opened, so the
/// Home rail drops back to "Needs you".
Future<void> showTennisFactSheet(
  BuildContext context,
  WidgetRef ref,
  TennisFact fact,
) async {
  // Optimistic: the rail updates now; the server call is best-effort.
  ref.read(openedFactIdsProvider.notifier).update((ids) => {...ids, fact.id});
  if (!fact.opened) {
    ref
        .read(tennisFactsRepositoryProvider)
        .markOpened(fact.id)
        .catchError((Object _) {});
  }
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: false,
    backgroundColor: Colors.transparent,
    builder: (_) => TennisFactSheet(fact: fact),
  );
}

/// Loads a fact by id (from a notification tap) and opens it.
Future<void> openTennisFactById(
  BuildContext context,
  WidgetRef ref,
  String id,
) async {
  try {
    final fact = await ref.read(tennisFactsRepositoryProvider).getById(id);
    if (!context.mounted) return;
    await showTennisFactSheet(context, ref, fact);
  } catch (_) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(context.l10n.commonErrorGeneric)));
  }
}

class TennisFactSheet extends StatelessWidget {
  const TennisFactSheet({super.key, required this.fact});

  final TennisFact fact;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 16:9 on a phone, capped so a tablet/landscape sheet doesn't hand
          // most of the screen to the photo.
          LayoutBuilder(
            builder: (context, constraints) => SizedBox(
              height: (constraints.maxWidth * 9 / 16).clamp(0, 220).toDouble(),
              child: TennisFactImage(imageUrl: fact.imageUrl, iconSize: 56),
            ),
          ),
          // Facts are capped at 280 characters so this normally fits; the
          // scroll is only a safety net for large text sizes on small phones.
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.tennisFactEyebrow.toUpperCase(),
                    style: type.caption.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    fact.title,
                    style: type.h3.copyWith(
                      fontWeight: FontWeight.w800,
                      color: colors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    fact.body,
                    style: type.body.copyWith(
                      color: colors.textPrimary,
                      height: 1.45,
                    ),
                  ),
                  if (fact.source != null && fact.source!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      l10n.tennisFactSource(fact.source!),
                      style: type.caption.copyWith(color: colors.textSecondary),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(l10n.tennisFactGotIt),
            ),
          ),
        ],
      ),
    );
  }
}

/// The fact's photo, or a branded tennis-ball gradient when it has none (or
/// it fails to load) — facts are seeded without photos until an admin adds
/// one, so the fallback has to look intentional.
class TennisFactImage extends StatelessWidget {
  const TennisFactImage({
    super.key,
    required this.imageUrl,
    this.iconSize = 32,
  });

  final String? imageUrl;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, const Color(0xFF22C55E)],
        ),
      ),
      child: Center(
        child: Icon(
          Icons.sports_tennis_rounded,
          size: iconSize,
          color: Colors.white.withValues(alpha: 0.9),
        ),
      ),
    );

    final url = driftMediaUrl(imageUrl);
    if (url == null) return fallback;
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => fallback,
      loadingBuilder: (context, child, progress) =>
          progress == null ? child : fallback,
    );
  }
}
