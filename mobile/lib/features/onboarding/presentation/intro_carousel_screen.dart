import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';


/// Pre-auth intro carousel — three full-bleed slides shown to every
/// logged-out user before the Welcome/auth screen
/// (`foundation/03-user-journeys.md` §2, redesign 2026-10).
///
/// Swipe, tap a dot, or use "Continue" to move between slides; the last
/// slide's "Get Started" goes to `/welcome` (Join the Court), as does "Skip".
///
/// This screen is a fixed dark composition, so its blue and the overlay navy
/// are intentionally hard-coded rather than pulled from [DriftColors] (which
/// would shift in dark mode). The blue is the app's own brand value, not the
/// prototype's #1A7AFF.
class IntroCarouselScreen extends StatefulWidget {
  const IntroCarouselScreen({super.key});

  @override
  State<IntroCarouselScreen> createState() => _IntroCarouselScreenState();
}

class _IntroCarouselScreenState extends State<IntroCarouselScreen> {
  final PageController _controller = PageController();
  int _page = 0;

  static const _brandBlue = Color(0xFF3399CC);
  static const _shellNavy = Color(0xFF080C28);

  static const List<_Slide> _slides = [
    _Slide(
      image: 'assets/images/onboarding/intro_game_never_stops.jpg',
      // objectPosition: center top
      alignment: Alignment(0, -1),
      title: 'The Game\nNever Stops',
      body:
          'Stay connected to every match, result, and tournament update as '
          'your tennis community keeps moving.',
    ),
    _Slide(
      image: 'assets/images/onboarding/intro_advance_your_game.jpg',
      // objectPosition: center 30%
      alignment: Alignment(0, -0.4),
      title: 'Advance\nYour Game',
      body:
          'Track your progress, sharpen your skills, and build better habits '
          'with insights made for your tennis journey.',
    ),
    _Slide(
      image: 'assets/images/onboarding/intro_tennis_journey.jpg',
      // objectPosition: center 20%
      alignment: Alignment(0, -0.6),
      title: 'Start Your\nTennis Journey',
      body:
          'Discover players, clubs, and competitions near you, then step onto '
          'the court with confidence.',
    ),
  ];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    for (final slide in _slides) {
      precacheImage(AssetImage(slide.image), context);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toWelcome() => context.go('/welcome');

  void _advance() {
    if (_page == _slides.length - 1) {
      _toWelcome();
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  void _goToPage(int index) {
    _controller.animateToPage(
      index,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLast = _page == _slides.length - 1;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: PopScope(
        canPop: _page == 0,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) _goToPage(_page - 1);
        },
        child: Scaffold(
          backgroundColor: _shellNavy,
          body: Stack(
            children: [
              PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, i) => _SlideView(
                  slide: _slides[i],
                  isActive: i == _page,
                  isLast: i == _slides.length - 1,
                  pageIndex: i,
                  pageCount: _slides.length,
                  brandBlue: _brandBlue,
                  onContinue: _advance,
                  onDotTap: _goToPage,
                ),
              ),
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                    // The prototype labels this "Next", which duplicates the
                    // Continue button exactly. The carousel shows on every
                    // logged-out launch (there is no "seen" flag), so the
                    // control that earns its place up here is the one that
                    // gets a returning user past it.
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: isLast
                          ? const SizedBox.shrink()
                          : _GlassPill(label: 'Skip', onTap: _toWelcome),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Slide {
  const _Slide({
    required this.image,
    required this.alignment,
    required this.title,
    required this.body,
  });

  final String image;
  final Alignment alignment;
  final String title;
  final String body;
}

class _SlideView extends StatelessWidget {
  const _SlideView({
    required this.slide,
    required this.isActive,
    required this.isLast,
    required this.pageIndex,
    required this.pageCount,
    required this.brandBlue,
    required this.onContinue,
    required this.onDotTap,
  });

  final _Slide slide;
  final bool isActive;
  final bool isLast;
  final int pageIndex;
  final int pageCount;
  final Color brandBlue;
  final VoidCallback onContinue;
  final ValueChanged<int> onDotTap;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(slide.image, fit: BoxFit.cover, alignment: slide.alignment),
        const _GradientScrim(),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(28, 0, 28, 36),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Standout title, animated in with a fade + rise + subtle
                  // scale whenever this slide becomes the active page.
                  AnimatedOpacity(
                    opacity: isActive ? 1 : 0,
                    duration: const Duration(milliseconds: 600),
                    curve: Curves.easeOutCubic,
                    child: AnimatedSlide(
                      offset: isActive
                          ? Offset.zero
                          : const Offset(0, 0.12),
                      duration: const Duration(milliseconds: 700),
                      curve: Curves.easeOutCubic,
                      child: AnimatedScale(
                        scale: isActive ? 1 : 0.94,
                        duration: const Duration(milliseconds: 700),
                        curve: Curves.easeOutCubic,
                        alignment: Alignment.bottomLeft,
                        child: Text(
                          slide.title,
                          style: const TextStyle(
                            fontFamily: 'Outfit',
                            fontSize: 44,
                            height: 1.08,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            shadows: [
                              Shadow(
                                color: Color(0x66000000),
                                blurRadius: 20,
                                offset: Offset(0, 2),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    slide.body,
                    style: const TextStyle(
                      fontFamily: 'Outfit',
                      fontSize: 15,
                      height: 1.6,
                      fontWeight: FontWeight.w400,
                      color: Color(0xCCFFFFFF),
                    ),
                  ),
                  const SizedBox(height: 32),
                  _CtaButton(
                    label: isLast ? 'Get Started' : 'Continue',
                    color: brandBlue,
                    onTap: onContinue,
                  ),
                  const SizedBox(height: 20),
                  _Dots(count: pageCount, active: pageIndex, onTap: onDotTap),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// `linear-gradient(to bottom, rgba(10,20,50,0.25) 0%, rgba(10,20,60,0) 35%,
/// rgba(10,15,45,0.85) 65%, rgba(8,12,40,0.97) 100%)`
class _GradientScrim extends StatelessWidget {
  const _GradientScrim();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: [0, 0.35, 0.65, 1],
          colors: [
            Color(0x400A1432),
            Color(0x000A143C),
            Color(0xD90A0F2D),
            Color(0xF7080C28),
          ],
        ),
      ),
    );
  }
}

/// Glass surface shared by every highlight treatment and the Skip pill. No
/// backdrop blur: `BackdropFilter` over a full-bleed photo costs a saved layer
/// per element, which is a real cost on this screen for an effect the scrim
/// already mostly provides.
BoxDecoration _glass({required double radius}) => BoxDecoration(
  color: Colors.white.withValues(alpha: 0.15),
  borderRadius: BorderRadius.circular(radius),
  border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
);

class _GlassPill extends StatelessWidget {
  const _GlassPill({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: _glass(radius: 999),
          padding: const EdgeInsets.fromLTRB(16, 7, 12, 7),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 2),
              const Icon(
                Icons.chevron_right_rounded,
                size: 18,
                color: Colors.white,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CtaButton extends StatelessWidget {
  const _CtaButton({
    required this.label,
    required this.color,
    required this.onTap,
  });

  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.44),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 17),
            child: Center(
              child: Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
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

/// The active dot stretches into a 24px bar; the rest stay 6px.
class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.active, required this.onTap});

  final int count;
  final int active;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => onTap(i),
            child: Padding(
              // The visual dot is 6px; the padding widens the tap target.
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeOut,
                width: i == active ? 24 : 6,
                height: 6,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  color: i == active
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.35),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
