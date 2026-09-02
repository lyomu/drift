import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/core/storage/secure_storage.dart';
import 'package:drift_tennis/features/assessment/data/assessment_repository.dart';
import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/auth/data/social_auth_service.dart';
import 'package:drift_tennis/features/clubs/data/clubs_repository.dart';
import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/messaging/data/messaging_repository.dart';
import 'package:drift_tennis/features/safety/data/safety_repository.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

/// Stands in for the two provider SDKs, which need platform channels a widget
/// test doesn't have. Everything above [SocialAuthService] deals only in
/// [SocialCredential], so mocking here covers the whole flow.
class MockSocialAuthService extends Mock implements SocialAuthService {}

class MockUsersRepository extends Mock implements UsersRepository {}

class MockSafetyRepository extends Mock implements SafetyRepository {}

class MockClubsRepository extends Mock implements ClubsRepository {}

class MockMessagingRepository extends Mock implements MessagingRepository {}

class MockAssessmentRepository extends Mock implements AssessmentRepository {}

class MockMatchesRepository extends Mock implements MatchesRepository {}

/// `flutter_secure_storage` needs a platform channel that widget tests
/// don't have. Always reports "no session", which is what an
/// unauthenticated screen expects.
class FakeSecureStorage extends SecureStorage {
  const FakeSecureStorage();

  @override
  Future<String?> readAccessToken() async => null;

  @override
  Future<String?> readRefreshToken() async => null;

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {}

  @override
  Future<void> clear() async {}
}
