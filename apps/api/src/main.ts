import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // WHY: ValidationPipe with whitelist strips unknown properties from incoming DTOs,
  // preventing mass-assignment vulnerabilities. transform: true auto-converts types.
  // See: https://docs.nestjs.com/techniques/validation#stripping-properties
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true }),
  );

  // WHY: CORS restricted to FRONTEND_URL only — prevents unauthorized origins
  // from calling our API. Credentials: true needed for cookie-based auth flows.
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // WHY: Global prefix 'api' keeps all routes under /api/* which simplifies
  // reverse proxy config and avoids route collisions with frontend.
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`VaultGuard API running on port ${port}`);
}
bootstrap();
