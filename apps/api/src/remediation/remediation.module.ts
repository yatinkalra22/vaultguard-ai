import { Module } from '@nestjs/common';
import { SlackModule } from '../slack/slack.module';
import { GithubModule } from '../github/github.module';
import { AuthModule } from '../auth/auth.module';
import { CibaService } from './ciba.service';
import { RemediationService } from './remediation.service';
import { RemediationController } from './remediation.controller';

@Module({
  imports: [SlackModule, GithubModule, AuthModule],
  providers: [CibaService, RemediationService],
  controllers: [RemediationController],
  exports: [RemediationService],
})
export class RemediationModule {}
