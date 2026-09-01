import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3010',
  'http://localhost:3011',
];

export function allowedCorsOrigins(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  const configured = environment.CORS_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!configured?.length) {
    if (environment.NODE_ENV === 'production') {
      throw new Error(
        'CORS_ALLOWED_ORIGINS must contain the production web origins.',
      );
    }
    return DEVELOPMENT_ORIGINS;
  }

  const origins = configured.map((origin) => {
    if (origin === '*') {
      throw new Error('CORS_ALLOWED_ORIGINS cannot contain a wildcard.');
    }

    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(`CORS origin must be an HTTP(S) origin: ${origin}`);
    }
    if (environment.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error(`Production CORS origin must use HTTPS: ${origin}`);
    }

    return url.origin;
  });

  return [...new Set(origins)];
}

export function corsOptions(
  environment: NodeJS.ProcessEnv = process.env,
): CorsOptions {
  return {
    origin: allowedCorsOrigins(environment),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: false,
    maxAge: 600,
  };
}

export function configureHttpApp(
  app: INestApplication,
  environment: NodeJS.ProcessEnv = process.env,
): void {
  app.use(helmet());
  app.enableCors(corsOptions(environment));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Reject unknown properties rather than silently stripping them.
      // Stripping hides client bugs: a request with a misspelled field used
      // to succeed while quietly ignoring it, which is far harder to debug
      // than a 400 naming the offending property.
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
