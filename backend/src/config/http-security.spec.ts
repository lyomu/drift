import { allowedCorsOrigins, corsOptions } from './http-security';

describe('HTTP security configuration', () => {
  it('uses only the documented local web origins during development', () => {
    expect(allowedCorsOrigins({ NODE_ENV: 'development' })).toEqual([
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3010',
      'http://localhost:3011',
    ]);
  });

  it('normalises and deduplicates configured origins', () => {
    expect(
      allowedCorsOrigins({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS:
          'https://clubs.drift.test, https://ops.drift.test,https://clubs.drift.test',
      }),
    ).toEqual(['https://clubs.drift.test', 'https://ops.drift.test']);
  });

  it('fails closed when production origins are missing', () => {
    expect(() => allowedCorsOrigins({ NODE_ENV: 'production' })).toThrow(
      'CORS_ALLOWED_ORIGINS',
    );
  });

  it.each([
    '*',
    'not-a-url',
    'https://clubs.drift.test/path',
    'http://clubs.drift.test',
  ])('rejects an unsafe production origin: %s', (origin) => {
    expect(() =>
      allowedCorsOrigins({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: origin,
      }),
    ).toThrow();
  });

  it('does not enable credentialed cross-origin requests', () => {
    expect(
      corsOptions({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://clubs.drift.test',
      }).credentials,
    ).toBe(false);
  });
});
