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
  if (environment.NODE_ENV !== 'production') {
    return environment;
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
