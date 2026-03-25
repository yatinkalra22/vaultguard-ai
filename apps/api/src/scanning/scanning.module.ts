import { Module } from '@nestjs/common';
import { SlackModule } from '../slack/slack.module';
import { GithubModule } from '../github/github.module';
import { AiModule } from '../ai/ai.module';
import { ScanningService } from './scanning.service';
import { ScanningScheduler } from './scanning.scheduler';
import { ScanningController } from './scanning.controller';

@Module({
  imports: [SlackModule, GithubModule, AiModule],
  providers: [ScanningService, ScanningScheduler],
  controllers: [ScanningController],
  exports: [ScanningService],
})
export class ScanningModule {}
