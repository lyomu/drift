/// Mirrors the backend's `OnboardingStep` enum
/// (`backend/prisma/schema.prisma`) — one value per onboarding screen, in
/// journey order.
enum OnboardingStep {
  signUp,
  verify,
  basicProfile,
  tennisExperience,
  assessment,
  levelReview,
  goals,
  playingPreferences,
  location,
  clubCourts,
  availability,
  padelInterest,
  complete;

  static OnboardingStep fromJson(String value) {
    return OnboardingStep.values.firstWhere(
      (step) => step.wireValue == value,
      orElse: () => OnboardingStep.signUp,
    );
  }

  String get wireValue {
    switch (this) {
      case OnboardingStep.signUp:
        return 'SIGN_UP';
      case OnboardingStep.verify:
        return 'VERIFY';
      case OnboardingStep.basicProfile:
        return 'BASIC_PROFILE';
      case OnboardingStep.tennisExperience:
        return 'TENNIS_EXPERIENCE';
      case OnboardingStep.assessment:
        return 'ASSESSMENT';
      case OnboardingStep.levelReview:
        return 'LEVEL_REVIEW';
      case OnboardingStep.goals:
        return 'GOALS';
      case OnboardingStep.playingPreferences:
        return 'PLAYING_PREFERENCES';
      case OnboardingStep.location:
        return 'LOCATION';
      case OnboardingStep.clubCourts:
        return 'CLUB_COURTS';
      case OnboardingStep.availability:
        return 'AVAILABILITY';
      case OnboardingStep.padelInterest:
        return 'PADEL_INTEREST';
      case OnboardingStep.complete:
        return 'COMPLETE';
    }
  }
}
