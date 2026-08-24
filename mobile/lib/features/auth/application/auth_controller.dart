import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../data/auth_repository.dart';

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
  }) {
    return ref
        .read(authRepositoryProvider)
        .signUp(email: email, password: password);
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

  Future<void> _persistAndSetAuthenticated(AuthTokens tokens) async {
    await ref
        .read(secureStorageProvider)
        .saveTokens(
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        );
    state = AsyncData(AuthSessionStatus.authenticated);
  }
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSessionStatus>(
      AuthController.new,
    );
