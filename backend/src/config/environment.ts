const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;
const UNSAFE_SECRET_MARKERS = [
  'change-me',
  'replace-with',
  'example',
  'secret',
];

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const intasendKey = environment.INTASEND_SECRET_KEY;
  const intasendIsLive =
    typeof intasendKey === 'string' && intasendKey.includes('_live_');

  // A live payments key under the test runner would let a suite move real
  // money. Refuse rather than warn: this is cheap to get wrong by copying one
  // env file over another, and expensive to discover afterwards.
  if (intasendIsLive && environment.NODE_ENV === 'test') {
    throw new Error(
      'INTASEND_SECRET_KEY is a live key and NODE_ENV=test. Use a sandbox key (ISSecretKey_test_…) for tests.',
    );
  }

  // Paddle keys don't self-identify sandbox vs production the way IntaSend's
  // key prefix does — that's an explicit switch instead, so the same "live
  // key under the test runner" mistake is checked against it directly.
  if (
    environment.PADDLE_ENVIRONMENT === 'production' &&
    environment.NODE_ENV === 'test'
  ) {
    throw new Error(
      'PADDLE_ENVIRONMENT=production and NODE_ENV=test. Leave PADDLE_ENVIRONMENT unset (defaults to sandbox) for tests.',
    );
  }

  if (environment.NODE_ENV !== 'production') {
    return environment;
  }

  // Without the challenge the webhook cannot be authenticated, so payments
  // would be taken and never confirmed — the club is charged and stays on the
  // free plan. Fail at boot instead, where it is visible.
  if (
    typeof intasendKey === 'string' &&
    intasendKey.length > 0 &&
    typeof environment.INTASEND_WEBHOOK_CHALLENGE !== 'string'
  ) {
    throw new Error(
      'INTASEND_SECRET_KEY is set but INTASEND_WEBHOOK_CHALLENGE is missing; payment confirmations could not be verified.',
    );
  }

  // Same reasoning, same failure mode, for Paddle's signed webhook.
  const paddleKey = environment.PADDLE_API_KEY;
  if (
    typeof paddleKey === 'string' &&
    paddleKey.length > 0 &&
    typeof environment.PADDLE_WEBHOOK_SECRET !== 'string'
  ) {
    throw new Error(
      'PADDLE_API_KEY is set but PADDLE_WEBHOOK_SECRET is missing; payment confirmations could not be verified.',
    );
  }

  const jwtSecret = environment.JWT_SECRET;
  if (
    typeof jwtSecret !== 'string' ||
    jwtSecret.length < MINIMUM_PRODUCTION_SECRET_LENGTH ||
    UNSAFE_SECRET_MARKERS.some((marker) =>
      jwtSecret.toLowerCase().includes(marker),
    )
  ) {
    throw new Error(
      'JWT_SECRET must be a non-placeholder value of at least 32 characters in production.',
    );
  }

  return environment;
}
