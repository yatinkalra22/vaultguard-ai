import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { SlackModule } from './slack/slack.module';
import { GithubModule } from './github/github.module';
import { AiModule } from './ai/ai.module';
import { ScanningModule } from './scanning/scanning.module';
import { FindingsModule } from './findings/findings.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // WHY: isGlobal: true makes ConfigService available in every module without
    // re-importing ConfigModule. Reduces boilerplate across all feature modules.
    // See: https://docs.nestjs.com/techniques/configuration#use-module-globally
    ConfigModule.forRoot({ isGlobal: true }),

    // WHY: Enables @Cron() decorators for periodic scans (daily midnight).
    // See: https://docs.nestjs.com/techniques/task-scheduling
    ScheduleModule.forRoot(),

    // WHY: Enables @OnEvent() and EventEmitter2 for SSE real-time updates.
    // Scan events (started/completed/failed) are emitted here and streamed
    // to the dashboard via SSE.
    // See: https://docs.nestjs.com/techniques/events
    EventEmitterModule.forRoot(),

    CommonModule,
    AuthModule,
    SlackModule,
    GithubModule,
    AiModule,
    ScanningModule,
    FindingsModule,
  ],
  controllers: [HealthController, AuthController],
})
export class AppModule {}
