import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

/// OAuth client IDs, supplied at build time so no client secret or project
/// identifier is committed. See `docs/SOCIAL_SIGNIN_SETUP.md`.
///
///   flutter build apk --release \
///     --dart-define=DRIFT_GOOGLE_SERVER_CLIENT_ID=`the web client id` \
///     --dart-define=DRIFT_GOOGLE_IOS_CLIENT_ID=`the ios client id`
///
/// The *web* client ID is the one Android needs: `google_sign_in` only
/// returns an `idToken` — the single thing our backend can verify — when a
/// server client ID is configured. Without it the flow appears to succeed and
/// then hands back nothing usable.
const _googleServerClientId = String.fromEnvironment(
  'DRIFT_GOOGLE_SERVER_CLIENT_ID',
);
const _googleIosClientId = String.fromEnvironment('DRIFT_GOOGLE_IOS_CLIENT_ID');

/// Apple sign-in is native on Apple platforms and needs no configuration
/// beyond the entitlement. Everywhere else — Android here — it runs as a web
/// flow that requires the Services ID and a redirect URI that returns to the
/// app. Absent those, the button reports "not configured" instead of throwing.
const _appleServicesId = String.fromEnvironment('DRIFT_APPLE_SERVICES_ID');
const _appleRedirectUri = String.fromEnvironment('DRIFT_APPLE_REDIRECT_URI');

/// Matches the backend's `AuthProvider` enum; [wire] is the value sent on the
/// link call.
enum SocialProvider {
  google('GOOGLE', 'Google'),
  apple('APPLE', 'Apple');

  const SocialProvider(this.wire, this.label);

  final String wire;
  final String label;
}

/// Raised when the person backs out of the provider sheet. Not an error, and
/// the UI must stay silent — showing "sign-in failed" after a deliberate
/// cancel is the most common way this flow feels broken.
class SocialSignInCancelled implements Exception {
  const SocialSignInCancelled();
}

class SocialSignInUnavailable implements Exception {
  const SocialSignInUnavailable(this.message);

  final String message;

  @override
  String toString() => message;
}

/// What the provider gave us, ready to post to the backend. The token is
/// never inspected here — only the server verifies it.
class SocialCredential {
  const SocialCredential({
    required this.provider,
    required this.idToken,
    this.nonce,
    this.email,
    this.firstName,
    this.lastName,
  });

  final SocialProvider provider;
  final String idToken;

  /// Best-effort only — Apple withholds it after the first authorization. The
  /// 409 response carries the authoritative address, so this is a fallback.
  final String? email;

  /// The *raw* nonce. Apple is handed `sha256(nonce)` and the backend hashes
  /// this value to compare; Google embeds it verbatim and compares directly.
  final String? nonce;

  /// Apple returns a name only on the very first authorization, so it travels
  /// with the credential and must be persisted server-side on that first call
  /// or it is gone for good. Google carries the name inside the token.
  final String? firstName;
  final String? lastName;
}

/// Thin wrapper over the two provider SDKs. Everything above this layer deals
/// in [SocialCredential] and never imports a provider package, which keeps the
/// controller and screens testable without a device.
class SocialAuthService {
  bool _googleInitialised = false;

  /// `google_sign_in` 7.x takes the nonce at `initialize()`, which its own
  /// docs say must be called exactly once per process — so unlike Apple this
  /// nonce cannot rotate per attempt. One is generated per app launch, which
  /// binds a token to this launch rather than to a single tap. That is weaker
  /// than Apple's guarantee, and it is the API's ceiling, not a shortcut.
  late final String _googleNonce = _rawNonce();

  bool get googleConfigured =>
      _googleServerClientId.isNotEmpty || _googleIosClientId.isNotEmpty;

  /// True on iOS/macOS, where the flow is native. On Android it depends on
  /// the two web-flow defines above.
  bool get appleConfigured {
    if (!kIsWeb && (Platform.isIOS || Platform.isMacOS)) return true;
    return _appleServicesId.isNotEmpty && _appleRedirectUri.isNotEmpty;
  }

  Future<SocialCredential> google() async {
    if (!googleConfigured) {
      throw const SocialSignInUnavailable(
        'Google sign-in isn\'t configured in this build yet.',
      );
    }

    if (!_googleInitialised) {
      await GoogleSignIn.instance.initialize(
        clientId: _googleIosClientId.isEmpty ? null : _googleIosClientId,
        serverClientId: _googleServerClientId.isEmpty
            ? null
            : _googleServerClientId,
        nonce: _googleNonce,
      );
      _googleInitialised = true;
    }

    final GoogleSignInAccount account;
    try {
      account = await GoogleSignIn.instance.authenticate();
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) {
        throw const SocialSignInCancelled();
      }
      throw SocialSignInUnavailable(
        e.description ?? 'Google sign-in could not be completed.',
      );
    }

    final idToken = account.authentication.idToken;
    if (idToken == null) {
      // Almost always a missing server client ID rather than a runtime fault,
      // so say that instead of a generic failure.
      throw const SocialSignInUnavailable(
        'Google returned no identity token. The app is missing its server '
        'client ID.',
      );
    }

    return SocialCredential(
      provider: SocialProvider.google,
      idToken: idToken,
      nonce: _googleNonce,
      email: account.email,
    );
  }

  Future<SocialCredential> apple() async {
    if (!appleConfigured) {
      throw const SocialSignInUnavailable(
        'Apple sign-in isn\'t available on this device yet.',
      );
    }

    final raw = _rawNonce();

    final AuthorizationCredentialAppleID credential;
    try {
      credential = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        // Required off Apple platforms, ignored on them.
        webAuthenticationOptions: _appleServicesId.isEmpty
            ? null
            : WebAuthenticationOptions(
                clientId: _appleServicesId,
                redirectUri: Uri.parse(_appleRedirectUri),
              ),
        nonce: sha256.convert(utf8.encode(raw)).toString(),
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        throw const SocialSignInCancelled();
      }
      throw SocialSignInUnavailable(
        'Apple sign-in could not be completed. ${e.message}',
      );
    }

    final identityToken = credential.identityToken;
    if (identityToken == null) {
      throw const SocialSignInUnavailable(
        'Apple returned no identity token. Please try again.',
      );
    }

    return SocialCredential(
      provider: SocialProvider.apple,
      idToken: identityToken,
      nonce: raw,
      email: credential.email,
      firstName: credential.givenName,
      lastName: credential.familyName,
    );
  }

  /// 32 bytes of `Random.secure()`, hex encoded.
  String _rawNonce() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }
}

final socialAuthServiceProvider = Provider<SocialAuthService>(
  (ref) => SocialAuthService(),
);
