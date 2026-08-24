import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_step.dart';

/// The single `OnboardingStep` -> route mapping, so the screen sequence is
/// defined once and reused by Splash/Login/Verify (resumability) and by
/// each step screen's own "Continue" navigation.
String onboardingStepToRoute(OnboardingStep step) {
  switch (step) {
    case OnboardingStep.signUp:
      return '/sign-up';
    case OnboardingStep.verify:
      return '/verify';
    case OnboardingStep.basicProfile:
      return '/onboarding/basic-profile';
    case OnboardingStep.tennisExperience:
      return '/onboarding/tennis-experience';
    case OnboardingStep.assessment:
      return '/onboarding/assessment';
    case OnboardingStep.levelReview:
      return '/onboarding/level-review';
    case OnboardingStep.goals:
      return '/onboarding/goals';
    case OnboardingStep.playingPreferences:
      return '/onboarding/preferences';
    case OnboardingStep.location:
      return '/onboarding/location';
    case OnboardingStep.clubCourts:
      return '/onboarding/club-courts';
    case OnboardingStep.availability:
      return '/onboarding/availability';
    case OnboardingStep.padelInterest:
      return '/onboarding/padel-interest';
    case OnboardingStep.complete:
      return '/home';
  }
}

/// Routes to wherever `step` resumes onboarding. `/verify` is the one
/// destination that needs data (the account email) passed as `extra`,
/// since `VerifyScreen` doesn't have a session-derived email to fall back
/// on the way the other onboarding screens do.
void goToOnboardingStep(
  BuildContext context,
  OnboardingStep step, {
  String? email,
}) {
  final route = onboardingStepToRoute(step);
  if (step == OnboardingStep.verify) {
    context.go(route, extra: email);
  } else {
    context.go(route);
  }
}
