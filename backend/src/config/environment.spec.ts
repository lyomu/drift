import { validateEnvironment } from './environment';

describe('environment validation', () => {
  it('allows local and test environments to use developer configuration', () => {
    expect(validateEnvironment({ NODE_ENV: 'test' })).toEqual({
      NODE_ENV: 'test',
    });
  });

  it.each([
    undefined,
    'too-short',
    'replace-with-a-long-random-secret',
    'this-is-an-example-value-that-is-not-safe',
  ])('rejects an unsafe production JWT secret: %s', (jwtSecret) => {
    expect(() =>
      validateEnvironment({ NODE_ENV: 'production', JWT_SECRET: jwtSecret }),
    ).toThrow('JWT_SECRET');
  });

  it('accepts a sufficiently long external production JWT secret', () => {
    const environment = {
      NODE_ENV: 'production',
      JWT_SECRET: 'C8VhD9mSLp7uQ2xK4fN6wR1tY5zB3jGa',
    };

    expect(validateEnvironment(environment)).toBe(environment);
  });
});
