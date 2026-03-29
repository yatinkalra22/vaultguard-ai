import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';

async function bootstrap() {
  // WHY: bufferLogs: true captures logs during bootstrap before pino is ready.
  // Once app.useLogger() is called, buffered logs flush through pino.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  // WHY: ValidationPipe with whitelist strips unknown properties from incoming DTOs,
  // preventing mass-assignment vulnerabilities. transform: true auto-converts types.
  // See: https://docs.nestjs.com/techniques/validation#stripping-properties
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true }),
  );

  // WHY: Global exception filter prevents internal error details (DB errors,
  // Slack/GitHub API responses, stack traces) from leaking to clients.
  // HttpExceptions pass through; unhandled exceptions return a generic message.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // WHY: Request ID must be first — all subsequent middleware, guards,
  // and exception filters can access req.id for log correlation.
  app.use(requestIdMiddleware);

  // WHY: Explicit payload size limits prevent memory exhaustion from oversized
  // request bodies. 1mb is generous for API payloads (JSONB entities, remediation
  // requests) while blocking abuse. Express default is only 100kb.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // WHY: Helmet sets security headers on every response — removes X-Powered-By
  // (fingerprinting), adds X-DNS-Prefetch-Control, X-Download-Options, etc.
  // CSP and frameguard disabled because this is an API (no HTML served).
  // See: https://helmetjs.github.io/
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
    }),
  );

  // WHY: CORS restricted to FRONTEND_URL only — prevents unauthorized origins
  // from calling our API. Credentials: true needed for cookie-based auth flows.
  // In production, FRONTEND_URL is required — no localhost fallback.
  const isProduction = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL;

  if (isProduction && !frontendUrl) {
    throw new Error(
      'FRONTEND_URL environment variable is required in production for CORS',
    );
  }

  app.enableCors({
    origin: frontendUrl || 'http://localhost:3000',
    credentials: true,
  });

  // WHY: Global prefix 'api' keeps all routes under /api/* which simplifies
  // reverse proxy config and avoids route collisions with frontend.
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  new Logger('Bootstrap').log(`VaultGuard API running on port ${port}`);
}
bootstrap();
