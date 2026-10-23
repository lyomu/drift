import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';

/// Drift-owned, code-rendered artwork used whenever publisher imagery is not
/// licensed, missing, or unavailable. The API is the authority for image use.
class DriftNewsImage extends StatelessWidget {
  const DriftNewsImage({super.key, required this.url, this.height});

  final String? url;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final fallback = Container(
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [colors.primaryDark, colors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      alignment: Alignment.center,
      child: Icon(
        Icons.sports_tennis,
        color: Theme.of(context).colorScheme.onPrimary,
        size: 64,
        semanticLabel: 'Tennis news artwork',
      ),
    );
    final uri = Uri.tryParse(url ?? '');
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
      return fallback;
    }
    return Image.network(
      url!,
      height: height,
      width: double.infinity,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => fallback,
    );
  }
}
