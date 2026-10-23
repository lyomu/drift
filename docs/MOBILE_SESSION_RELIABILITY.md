# Mobile session reliability fix

## Cause

The mobile app uses a 15 minute access token and a rotating refresh token. After a period of inactivity, several screen requests could receive 401 at once. Each request attempted to rotate the same refresh token independently. A losing request then treated its failed refresh as a reason to clear local credentials, even if another request had already saved a new valid pair. The splash screen also cleared credentials for every `GET /users/me` failure, including temporary network or server errors. That left screens showing generic resource errors until the app was restarted or refreshed.

## Behavior after the fix

- Authenticated requests share one in-flight refresh per app session. A request whose token has already been replaced retries with the current token without another rotation.
- Only a server-confirmed invalid refresh (401 or 403), or a missing refresh credential, clears the session. A timeout, lost connection, or 5xx response preserves credentials for retry.
- A confirmed invalidation updates auth state and immediately opens sign-in. Splash keeps the saved session during a temporary failure and shows a retry action.
- Player profile uses “Player not available” only for a real 404. Other failures show a retry option.
- The backend consumes a refresh token with a conditional database update, so concurrent uses cannot both mint a new pair.

## Verification and rollout

`flutter test test/core/network/session_manager_test.dart test/core/network/splash_session_test.dart test/features/players/presentation/player_profile_screen_test.dart` covers concurrent 401s, transient and permanent refresh errors, splash retry, and player error labels. `npm test -- --runInBand auth.service.spec.ts` covers valid rotation and a concurrently consumed token. Release the backend and mobile app together or backend first; no migration is needed for this fix. On a physical device, sign in, leave the app closed beyond the access-token lifetime, then reopen with network available and with network briefly unavailable. Confirm that the session survives the transient outage and that players and challenges recover after reconnection.
