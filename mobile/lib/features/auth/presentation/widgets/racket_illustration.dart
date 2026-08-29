import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The racket-and-ball spot illustration on the Join the Court screen —
/// a direct port of the prototype's inline SVG (`App.tsx` CoachingIllustration).
class RacketIllustration extends StatelessWidget {
  const RacketIllustration({super.key, this.width = 220});

  final double width;

  static const _svg = '''
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="200" viewBox="0 0 220 200" fill="none">
  <ellipse cx="110" cy="185" rx="80" ry="10" fill="#e0e0e0"/>
  <rect x="130" y="130" width="12" height="52" rx="6" fill="#8B5E3C"/>
  <rect x="133" y="148" width="6" height="20" rx="3" fill="#6B4423"/>
  <line x1="130" y1="155" x2="142" y2="155" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
  <line x1="130" y1="162" x2="142" y2="162" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
  <line x1="130" y1="169" x2="142" y2="169" stroke="#fff" stroke-width="1.5" opacity="0.5"/>
  <ellipse cx="110" cy="100" rx="48" ry="58" fill="none" stroke="#1a1a1a" stroke-width="7"/>
  <ellipse cx="110" cy="100" rx="41" ry="51" fill="none" stroke="#2a2a2a" stroke-width="3"/>
  <line x1="82" y1="52" x2="82" y2="148" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="92" y1="52" x2="92" y2="148" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="102" y1="52" x2="102" y2="148" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="112" y1="52" x2="112" y2="148" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="122" y1="52" x2="122" y2="148" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="132" y1="52" x2="132" y2="148" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="142" y1="52" x2="142" y2="148" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="40" x2="155" y2="40" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="52" x2="155" y2="52" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="64" x2="155" y2="64" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="76" x2="155" y2="76" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="88" x2="155" y2="88" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="100" x2="155" y2="100" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="112" x2="155" y2="112" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <line x1="65" y1="124" x2="155" y2="124" stroke="#aac8e8" stroke-width="1" opacity="0.8"/>
  <path d="M96 148 Q110 158 124 148 L130 130 Q110 138 90 130 Z" fill="#1a1a1a"/>
  <circle cx="58" cy="68" r="22" fill="#c8e63a"/>
  <path d="M40 58 Q58 44 76 58" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M40 78 Q58 92 76 78" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>''';

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(_svg, width: width);
  }
}
