import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../notifications/data/push_service.dart';
import '../data/auth_repository.dart';
import '../data/social_auth_service.dart';

enum AuthSessionStatus { unauthenticated, authenticated }

/// Owns session status (derived from whether an access token is stored) and
/// exposes the sign-up/login/verify/resend actions. Per-form loading/error
/// state lives in the screens themselves — this only tracks "are we logged
/// in", not "is this particular button spinning".
class AuthController extends AsyncNotifier<AuthSessionStatus> {
  @override
  FutureOr<AuthSessionStatus> build() async {
    final token = await ref.watch(secureStorageProvider).readAccessToken();
    return token != null
        ? AuthSessionStatus.authenticated
        : AuthSessionStatus.unauthenticated;
  }

  Future<({String userId, String? devVerificationCode})> signUp({
    required String email,
    required String password,
    required bool acceptedAgePolicy,
  }) {
    return ref
        .read(authRepositoryProvider)
        .signUp(
          email: email,
          password: password,
          acceptedAgePolicy: acceptedAgePolicy,
        );
  }

  Future<void> verify({required String email, required String code}) async {
    final tokens = await ref
        .read(authRepositoryProvider)
        .verify(email: email, code: code);
    await _persistAndSetAuthenticated(tokens);
  }

  Future<String?> resendCode({required String email}) {
    return ref.read(authRepositoryProvider).resendCode(email: email);
  }

  /// Neither of the reset methods touches session state — the server issues
  /// no tokens for this flow, so the user stays unauthenticated and is sent
  /// back to Login to sign in with the password they just set.
  Future<String?> forgotPassword({required String email}) {
    return ref.read(authRepositoryProvider).forgotPassword(email: email);
  }

  Future<void> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) {
    return ref
        .read(authRepositoryProvider)
        .resetPassword(email: email, code: code, newPassword: newPassword);
  }

  Future<void> login({required String email, required String password}) async {
    final tokens = await ref
        .read(authRepositoryProvider)
        .login(email: email, password: password);
    await _persistAndSetAuthenticated(tokens);
  }

  /// Opens the provider's own sheet. Kept separate from [socialSignIn] on
  /// purpose: the exchange below can fail with `EMAIL_LINK_REQUIRED`, and the
  /// caller must still hold this credential to finish the link — re-opening
  /// the sheet mid-flow would be both jarring and a second authorization.
  ///
  /// Throws [SocialSignInCancelled] when the person backs out.
  Future<SocialCredential> acquireSocialCredential(SocialProvider provider) {
    final service = ref.read(socialAuthServiceProvider);
    return switch (provider) {
      SocialProvider.google => service.google(),
      SocialProvider.apple => service.apple(),
    };
  }

  /// Exchanges a verified provider credential for our own tokens.
  ///
  /// Rethrows [EmailLinkRequiredException] — the caller prompts for the
  /// existing password and finishes with [linkWithPassword].
  Future<void> socialSignIn(
    SocialCredential credential, {
    bool acceptedAgePolicy = false,
  }) async {
    final repo = ref.read(authRepositoryProvider);
    final tokens = switch (credential.provider) {
      SocialProvider.google => await repo.oauthGoogle(
        idToken: credential.idToken,
        nonce: credential.nonce,
        acceptedAgePolicy: acceptedAgePolicy,
      ),
      SocialProvider.apple => await repo.oauthApple(
        identityToken: credential.idToken,
        nonce: credential.nonce,
        firstName: credential.firstName,
        lastName: credential.lastName,
        acceptedAgePolicy: acceptedAgePolicy,
      ),
    };
    await _persistAndSetAuthenticated(tokens);
  }

  /// Finishes the 409 path once the person has proved the existing account's
  /// password. Succeeding here revokes their other sessions server-side.
  Future<void> linkWithPassword({
    required SocialCredential credential,
    required String email,
    required String password,
  }) async {
    final tokens = await ref
        .read(authRepositoryProvider)
        .oauthLink(
          provider: credential.provider.wire,
          idToken: credential.idToken,
          email: email,
          password: password,
          nonce: credential.nonce,
          firstName: credential.firstName,
          lastName: credential.lastName,
        );
    await _persistAndSetAuthenticated(tokens);
  }

  Future<void> _persistAndSetAuthenticated(AuthTokens tokens) async {
    await ref
        .read(secureStorageProvider)
        .saveTokens(
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        );
    state = AsyncData(AuthSessionStatus.authenticated);

    // Every route into the app funnels through here — password login, verify,
    // and both social providers — so this is the one place device
    // registration needs to happen. A token registered before this point has
    // no user to attach to.
    //
    // Not awaited: it asks for notification permission and talks to Firebase,
    // and neither should stand between someone and the screen they were
    // heading for. PushService swallows its own failures.
    unawaited(ref.read(pushServiceProvider).registerForUser());
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSessionStatus>(
      AuthController.new,
    );
