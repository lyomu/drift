import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';

/// How much of the screen the scrolling section list may take before it
/// scrolls. The header, the Apply button and the safe-area inset sit outside
/// it, so the sheet as a whole is always taller than this.
const _maxSectionsHeightFraction = 0.6;

/// The brand-tinted hairline the redesign uses in place of the neutral border
/// (#E2EAFF against white), derived from the theme so it tracks the palette.
Color _hairline(DriftColors colors, {double alpha = 0.18}) =>
    Color.alphaBlend(colors.primary.withValues(alpha: alpha), colors.surface);

/// Opens [sheet] as the app's standard filter sheet.
///
/// Transparent barrier colour and background: [DriftFilterSheet] draws its own
/// rounded white panel, so the default Material sheet decoration would show as
/// a second square edge behind the corners.
Future<T?> showDriftFilterSheet<T>({
  required BuildContext context,
  required WidgetBuilder builder,
}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    barrierColor: const Color(0x66000000),
    builder: builder,
  );
}

/// The app's filter sheet (redesign 2026-10). Adopted as the standard for
/// every filter surface, so the frame lives here and each feature supplies
/// only its [sections].
///
/// The caller owns a *draft* copy of its filters, mutates it as the user taps,
/// and commits it in [onApply]; nothing here touches providers. That is what
/// lets Cancel-by-dismissal work without an explicit cancel button: dropping
/// the sheet drops the draft.
///
///     showDriftFilterSheet(
///       context: context,
///       builder: (_) => DriftFilterSheet(
///         activeCount: draft.activeCount,
///         onClear: () => setState(() => draft = const MyFilters()),
///         onApply: _apply,
///         sections: [ DriftFilterSection(...) ],
///       ),
///     );
class DriftFilterSheet extends StatelessWidget {
  const DriftFilterSheet({
    super.key,
    this.title = 'Filters',
    required this.sections,
    required this.activeCount,
    required this.onClear,
    required this.onApply,
  });

  final String title;
  final List<Widget> sections;

  /// Shown on the Apply button and used to grey out "Clear all" at zero. The
  /// caller decides what counts as one filter.
  final int activeCount;

  final VoidCallback onClear;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final maxSections =
        MediaQuery.sizeOf(context).height * _maxSectionsHeightFraction;

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F000000),
            blurRadius: 40,
            offset: Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          // Lifts the sheet clear of the keyboard when a section holds a text
          // field; zero otherwise.
          padding: EdgeInsets.only(
            bottom: MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drawn rather than `showDragHandle: true`: the Material handle
            // sits in its own fixed-height band above the sheet's padding and
            // is not tintable to the brand hairline.
            Padding(
              padding: const EdgeInsets.only(top: 12, bottom: 4),
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: _hairline(colors),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        height: 1.2,
                        color: colors.textPrimary,
                      ),
                    ),
                  ),
                  _ClearAllButton(
                    enabled: activeCount > 0,
                    onTap: onClear,
                  ),
                ],
              ),
            ),
            Flexible(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxHeight: maxSections),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      for (var i = 0; i < sections.length; i++) ...[
                        if (i > 0) const SizedBox(height: 20),
                        sections[i],
                      ],
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              child: _ApplyButton(activeCount: activeCount, onTap: onApply),
            ),
          ],
          ),
        ),
      ),
    );
  }
}

class _ClearAllButton extends StatelessWidget {
  const _ClearAllButton({required this.enabled, required this.onTap});

  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: enabled ? onTap : null,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Text(
            'Clear all',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              height: 1.2,
              color: colors.textSecondary.withValues(alpha: enabled ? 1 : 0.5),
            ),
          ),
        ),
      ),
    );
  }
}

class _ApplyButton extends StatelessWidget {
  const _ApplyButton({required this.activeCount, required this.onTap});

  final int activeCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final label = activeCount > 0
        ? 'Apply filters ($activeCount)'
        : 'Apply filters';

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withValues(alpha: 0.25),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: colors.primary,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Center(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One labelled group inside a [DriftFilterSheet].
class DriftFilterSection extends StatelessWidget {
  const DriftFilterSection({
    super.key,
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            height: 1.2,
            color: colors.textPrimary,
          ),
        ),
        const SizedBox(height: 10),
        child,
      ],
    );
  }
}

/// One choice in a [DriftFilterPills] or [DriftFilterSegments] group.
class DriftFilterOption<T> {
  const DriftFilterOption({required this.value, required this.label});

  final T value;
  final String label;
}

/// Wrapping row of rounded pills, for groups whose labels vary in width or
/// whose count can grow (Level, Availability).
class DriftFilterPills<T> extends StatelessWidget {
  const DriftFilterPills({
    super.key,
    required this.options,
    required this.isSelected,
    required this.onTap,
  });

  final List<DriftFilterOption<T>> options;
  final bool Function(T) isSelected;
  final void Function(T) onTap;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final option in options)
          _FilterChoice(
            label: option.label,
            selected: isSelected(option.value),
            radius: 999,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
            onTap: () => onTap(option.value),
          ),
      ],
    );
  }
}

/// Equal-width row, for short fixed sets that read as one control
/// (Distance, Format). Falls back to [DriftFilterPills] shape per item, so a
/// long label ellipsises rather than overflowing.
class DriftFilterSegments<T> extends StatelessWidget {
  const DriftFilterSegments({
    super.key,
    required this.options,
    required this.isSelected,
    required this.onTap,
  });

  final List<DriftFilterOption<T>> options;
  final bool Function(T) isSelected;
  final void Function(T) onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < options.length; i++) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: _FilterChoice(
              label: options[i].label,
              selected: isSelected(options[i].value),
              radius: 10,
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              onTap: () => onTap(options[i].value),
            ),
          ),
        ],
      ],
    );
  }
}

class _FilterChoice extends StatelessWidget {
  const _FilterChoice({
    required this.label,
    required this.selected,
    required this.radius,
    required this.padding,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final double radius;
  final EdgeInsets padding;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected
            ? Color.alphaBlend(
                colors.primary.withValues(alpha: 0.07),
                colors.surface,
              )
            : colors.surface,
        borderRadius: BorderRadius.circular(radius),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              border: Border.all(
                color: selected ? colors.primary : _hairline(colors),
                width: selected ? 2 : 1.5,
              ),
            ),
            padding: padding,
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                height: 1.3,
                color: selected ? colors.primary : colors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
