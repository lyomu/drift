import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../core/l10n/l10n.dart';

/// Court Photos Gallery — `foundation/04-screen-inventory.md` §A.6. Plain
/// `Image.network` (no `cached_network_image`) — external URLs only, no
/// upload flow exists, so the dependency footprint stays minimal; revisit
/// if photo volume/perf ever demands caching.
class CourtPhotosGalleryScreen extends StatelessWidget {
  const CourtPhotosGalleryScreen({super.key, required this.photoUrls});

  final List<String> photoUrls;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.courtPhotos,
      body: photoUrls.isEmpty
          ? Center(
              child: Text(
                context.l10n.courtNoPhotos,
                style: type.body.copyWith(color: colors.textSecondary),
              ),
            )
          : PageView.builder(
              itemCount: photoUrls.length,
              itemBuilder: (context, index) => Image.network(
                photoUrls[index],
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Center(
                  child: Icon(
                    Icons.broken_image_outlined,
                    size: 48,
                    color: colors.textSecondary,
                  ),
                ),
              ),
            ),
    );
  }
}
