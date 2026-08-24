import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/core/onboarding/onboarding_step.dart';
import 'package:drift_tennis/core/onboarding/onboarding_step_route.dart';

/// Onboarding resumability rests entirely on these two tables. If a step
/// maps to the wrong route — or a new step is added and one table is
/// updated without the other — a returning user lands on the wrong screen
/// or loops. Neither failure is visible to `flutter analyze`, because both
/// switches are exhaustive over the enum and still compile.
void main() {
  group('onboardingStepToRoute', () {
    const expected = {
      OnboardingStep.signUp: '/sign-up',
      OnboardingStep.verify: '/verify',
      OnboardingStep.basicProfile: '/onboarding/basic-profile',
      OnboardingStep.tennisExperience: '/onboarding/tennis-experience',
      OnboardingStep.assessment: '/onboarding/assessment',
      OnboardingStep.levelReview: '/onboarding/level-review',
      OnboardingStep.goals: '/onboarding/goals',
      OnboardingStep.playingPreferences: '/onboarding/preferences',
      OnboardingStep.location: '/onboarding/location',
      OnboardingStep.clubCourts: '/onboarding/club-courts',
      OnboardingStep.availability: '/onboarding/availability',
      OnboardingStep.padelInterest: '/onboarding/padel-interest',
      OnboardingStep.complete: '/home',
    };

    test('covers every step in the enum', () {
      expect(
        expected.keys.toSet(),
        OnboardingStep.values.toSet(),
        reason: 'a new OnboardingStep needs a route and a case here',
      );
    });

    for (final entry in expected.entries) {
      test('${entry.key.name} resumes at ${entry.value}', () {
        expect(onboardingStepToRoute(entry.key), entry.value);
      });
    }

    test('every step resolves to a distinct route', () {
      final routes = OnboardingStep.values.map(onboardingStepToRoute).toList();
      expect(routes.toSet(), hasLength(routes.length));
    });
  });

  group('OnboardingStep.fromJson', () {
    test('round-trips every wire value', () {
      for (final step in OnboardingStep.values) {
        expect(OnboardingStep.fromJson(step.wireValue), step);
      }
    });

    test('falls back to signUp on an unrecognised value', () {
      expect(OnboardingStep.fromJson('NOT_A_STEP'), OnboardingStep.signUp);
    });

    test('wire values are unique', () {
      final values = OnboardingStep.values.map((s) => s.wireValue).toList();
      expect(values.toSet(), hasLength(values.length));
    });
  });
}
