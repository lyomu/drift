import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttpApp } from './config/http-security';

async function bootstrap() {
  // Paddle signs webhooks over the raw request bytes — any reformatting
  // (parse, then re-serialize) invalidates the signature. `rawBody: true`
  // stashes the untouched buffer on `req.rawBody` alongside Nest's normal
  // parsed `req.body`, so nothing else changes.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  configureHttpApp(app);
  await app.listen(process.env.PORT ?? 3009);
}
void bootstrap();
