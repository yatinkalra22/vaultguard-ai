import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { SlackModule } from './slack/slack.module';
import { GithubModule } from './github/github.module';
import { AiModule } from './ai/ai.module';
import { ScanningModule } from './scanning/scanning.module';
import { FindingsModule } from './findings/findings.module';
import { RemediationModule } from './remediation/remediation.module';
import { AuditModule } from './audit/audit.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    // WHY: Structured JSON logging via pino. In production, logs are JSON
    // (machine-parseable for Datadog, CloudWatch, etc.). In development,
    // pino-pretty renders human-readable colored output.
    // Automatically attaches request context (method, url, status, duration).
    // See: https://github.com/iamolegga/nestjs-pino
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        // WHY: Attach request ID from our middleware for log correlation.
        customProps: (req: any) => ({ requestId: req.id }),
        autoLogging: true,
        // WHY: Redact authorization header to prevent token leakage in logs.
        redact: ['req.headers.authorization'],
      },
    }),

    // WHY: Global rate limiting prevents brute-force and DoS attacks.
    // 100 requests per 60s per IP is generous for normal usage but blocks abuse.
    // High-value endpoints (remediations, scan triggers) have stricter per-route
    // limits via @Throttle() decorator.
    // See: https://docs.nestjs.com/security/rate-limiting
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),

    CommonModule,
    AuditModule,
    AuthModule,
    SlackModule,
    GithubModule,
    AiModule,
    ScanningModule,
    FindingsModule,
    RemediationModule,
    DashboardModule,
  ],
  controllers: [HealthController, AuthController],
  providers: [
    // WHY: APP_GUARD applies ThrottlerGuard to all routes globally.
    // Individual routes can override with @Throttle() or skip with @SkipThrottle().
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
