import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { SlackModule } from './slack/slack.module';
import { GithubModule } from './github/github.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // WHY: isGlobal: true makes ConfigService available in every module without
    // re-importing ConfigModule. Reduces boilerplate across all feature modules.
    // See: https://docs.nestjs.com/techniques/configuration#use-module-globally
    ConfigModule.forRoot({ isGlobal: true }),

    CommonModule,
    AuthModule,
    SlackModule,
    GithubModule,
  ],
  controllers: [HealthController, AuthController],
})
export class AppModule {}
