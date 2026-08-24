import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/onboarding/presentation/adjust_level_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/availability_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/basic_profile_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/club_courts_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/goals_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/location_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/onboarding_complete_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/padel_interest_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/playing_preferences_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/suggested_level_review_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/tennis_experience_screen.dart';
import 'package:drift_tennis/features/onboarding/presentation/welcome_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // Static and form screens: rendering without throwing in both
  // brightnesses is the whole contract. Splash is covered separately in
  // widget_test.dart (its session check navigates via GoRouter).
  final screens = <String, Widget Function()>{
    'WelcomeScreen': () => const WelcomeScreen(),
    'BasicProfileScreen': () => const BasicProfileScreen(),
    'TennisExperienceScreen': () => const TennisExperienceScreen(),
    'SuggestedLevelReviewScreen': () =>
        SuggestedLevelReviewScreen(result: assessmentResult()),
    'AdjustLevelScreen': () => const AdjustLevelScreen(suggestedLevel: 4.0),
    'GoalsScreen': () => const GoalsScreen(),
    'PlayingPreferencesScreen': () => const PlayingPreferencesScreen(),
    'LocationScreen': () => const LocationScreen(),
    'ClubCourtsScreen': () => const ClubCourtsScreen(),
    'AvailabilityScreen': () => const AvailabilityScreen(),
    'PadelInterestScreen': () => const PadelInterestScreen(),
    'OnboardingCompleteScreen': () => const OnboardingCompleteScreen(),
  };

  for (final entry in screens.entries) {
    group(entry.key, () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}',
            (tester) async {
          await pumpScreen(
            tester,
            Scaffold(body: entry.value()),
            brightness: brightness,
          );

          expect(tester.takeException(), isNull);
        });
      }
    });
  }
}
