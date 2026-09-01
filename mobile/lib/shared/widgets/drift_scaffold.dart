import 'package:flutter/material.dart';

import 'drift_back_header.dart';

/// A [Scaffold] with the redesign's in-app header instead of a Material
/// `AppBar`: a `DriftBackHeader` (36×36 chevron + title + optional trailing)
/// above the body, inside a `SafeArea`. The body is given the remaining
/// space via `Expanded`, so pass a scrollable (`ListView` /
/// `SingleChildScrollView`) or a `Column`.
class DriftScaffold extends StatelessWidget {
  const DriftScaffold({
    super.key,
    required this.title,
    required this.body,
    this.trailing,
    this.onBack,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.resizeToAvoidBottomInset,
  });

  final String title;
  final Widget body;
  final Widget? trailing;
  final VoidCallback? onBack;
  final Widget? floatingActionButton;
  final Widget? bottomNavigationBar;
  final bool? resizeToAvoidBottomInset;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(title: title, onBack: onBack, trailing: trailing),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}
