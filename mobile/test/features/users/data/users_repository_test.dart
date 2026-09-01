import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/core/onboarding/onboarding_step.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

void main() {
  group('UserProfile.fromJson', () {
    Map<String, dynamic> json({
      String onboardingStep = 'COMPLETE',
      Object? firstName = 'Ana',
      Object? email = 'ana@test.com',
    }) => {
      'id': 'u1',
      'email': email,
      'firstName': firstName,
      'lastName': 'Diaz',
      'photoUrl': null,
      'bio': null,
      'onboardingStep': onboardingStep,
    };

    test('maps every field', () {
      final u = UserProfile.fromJson(json());

      expect(u.id, 'u1');
      expect(u.email, 'ana@test.com');
      expect(u.firstName, 'Ana');
      expect(u.onboardingStep, OnboardingStep.complete);
    });

    // Everything but id and onboardingStep is unset immediately after
    // signup, before Basic Profile is filled in.
    test('tolerates a freshly signed-up account with nothing filled in', () {
      final u = UserProfile.fromJson(
        json(onboardingStep: 'BASIC_PROFILE', firstName: null),
      );

      expect(u.firstName, isNull);
      expect(u.bio, isNull);
      expect(u.onboardingStep, OnboardingStep.basicProfile);
    });

    // Phone-only accounts are modelled backend-side (User.email is
    // nullable), so the client must not assume an address exists.
    test('tolerates an account with no email', () {
      expect(UserProfile.fromJson(json(email: null)).email, isNull);
    });

    // Resumability routes off this value — an unknown step must land
    // somewhere safe rather than throwing.
    test('falls back to signUp on an unrecognised onboarding step', () {
      final u = UserProfile.fromJson(json(onboardingStep: 'NOT_A_STEP'));
      expect(u.onboardingStep, OnboardingStep.signUp);
    });
  });

  group('FieldVisibility', () {
    test('round-trips both values through the wire value', () {
      for (final v in FieldVisibility.values) {
        expect(FieldVisibility.fromJson(v.wireValue), v);
      }
    });

    // Connections-only is the safe default: an unrecognised value must
    // never widen who can see a player's skill breakdown or availability.
    test('defaults to connections-only, never to everyone', () {
      expect(FieldVisibility.fromJson('???'), FieldVisibility.connectionsOnly);
    });
  });

  group('PrivacySettings.fromJson', () {
    test('maps both gates independently', () {
      final p = PrivacySettings.fromJson({
        'skillBreakdownVisibility': 'EVERYONE',
        'availabilityVisibility': 'CONNECTIONS_ONLY',
      });

      expect(p.skillBreakdownVisibility, FieldVisibility.everyone);
      expect(p.availabilityVisibility, FieldVisibility.connectionsOnly);
    });
  });
}
