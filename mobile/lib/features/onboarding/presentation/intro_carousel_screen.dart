import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

/// Pre-auth intro carousel — three full-bleed slides shown to every
/// logged-out user before the Welcome/auth screen
/// (`foundation/03-user-journeys.md` §2, redesign 2026-08). Swipe, tap a
/// dot, or use "Next" (slides 1–2 only) to move between slides; "Get
/// Started" jumps to `/welcome` (Join the Court) from any slide.
///
/// This screen is a fixed dark composition, so its blue and the overlay
/// navy are intentionally hard-coded rather than pulled from [DriftColors]
/// (which would shift in dark mode).
class IntroCarouselScreen extends StatefulWidget {
  const IntroCarouselScreen({super.key});

  @override
  State<IntroCarouselScreen> createState() => _IntroCarouselScreenState();
}

class _IntroCarouselScreenState extends State<IntroCarouselScreen> {
  final PageController _controller = PageController();
  int _page = 0;

  static const _brandBlue = Color(0xFF1C91D0);
  static const _shellNavy = Color(0xFF080C28);

  static const List<_Slide> _slides = [
    _Slide(
      image: 'assets/images/onboarding/intro_game_never_stops.jpg',
      // objectPosition: center top
      alignment: Alignment(0, -1),
      title: 'The Game\nNever Stops',
      titleSize: 52,
      body:
          'Match schedules, player stats and tournament updates in real time.',
    ),
    _Slide(
      image: 'assets/images/onboarding/intro_advance_your_game.jpg',
      // objectPosition: center 30%
      alignment: Alignment(0, -0.4),
      title: 'Advance\nYour Game',
      titleSize: 52,
      body:
          'Analyze your progress, set new goals, and improve your skills with '
          'smart coaching tools.',
    ),
    _Slide(
      image: 'assets/images/onboarding/intro_tennis_journey.jpg',
      // objectPosition: center 20%
      alignment: Alignment(0, -0.6),
      title: 'Start Your\nTennis Journey',
      titleSize: 44,
      body: 'Join ladders, tournaments and communities. Your court awaits.',
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

  void _getStarted() => context.go('/welcome');

  void _next() {
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
                  pageIndex: i,
                  pageCount: _slides.length,
                  brandBlue: _brandBlue,
                  onGetStarted: _getStarted,
                  onDotTap: _goToPage,
                ),
              ),
              // "Next" advances the carousel; hidden on the last slide, where
              // "Get Started" is the only way forward.
              if (_page < _slides.length - 1)
                Positioned(
                  top: 0,
                  right: 0,
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 8, right: 24),
                      child: _NextButton(onTap: _next),
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
    required this.titleSize,
    required this.body,
  });

  final String image;
  final Alignment alignment;
  final String title;
  final double titleSize;
  final String body;
}

class _SlideView extends StatelessWidget {
  const _SlideView({
    required this.slide,
    required this.pageIndex,
    required this.pageCount,
    required this.brandBlue,
    required this.onGetStarted,
    required this.onDotTap,
  });

  final _Slide slide;
  final int pageIndex;
  final int pageCount;
  final Color brandBlue;
  final VoidCallback onGetStarted;
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
              padding: const EdgeInsets.fromLTRB(28, 0, 28, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    slide.title,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'DMSans',
                      fontSize: slide.titleSize,
                      height: 1.05,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    slide.body,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'DMSans',
                      fontSize: 13.5,
                      height: 1.55,
                      fontWeight: FontWeight.w400,
                      color: Color(0xA6FFFFFF),
                    ),
                  ),
                  const SizedBox(height: 24),
                  _GetStartedButton(color: brandBlue, onTap: onGetStarted),
                  // dots carry 8px of their own top padding as tap target
                  const SizedBox(height: 12),
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

class _GetStartedButton extends StatelessWidget {
  const _GetStartedButton({required this.color, required this.onTap});

  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.5),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 17),
            child: Center(
              child: Text(
                'Get Started',
                style: TextStyle(
                  fontFamily: 'DMSans',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
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
              // visual dot is 8px; padding widens the tap target to ~24px
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i == active
                      ? Colors.white
                      : Colors.white.withValues(alpha: 0.3),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _NextButton extends StatelessWidget {
  const _NextButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = Colors.white.withValues(alpha: 0.75);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Next',
              style: TextStyle(
                fontFamily: 'DMSans',
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: tint,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, size: 18, color: tint),
          ],
        ),
      ),
    );
  }
}
