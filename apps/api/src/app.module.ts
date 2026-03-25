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
import { RemediationModule } from './remediation/remediation.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    CommonModule,
    AuthModule,
    SlackModule,
    GithubModule,
    AiModule,
    ScanningModule,
    FindingsModule,
    RemediationModule,
  ],
  controllers: [HealthController, AuthController],
})
export class AppModule {}
