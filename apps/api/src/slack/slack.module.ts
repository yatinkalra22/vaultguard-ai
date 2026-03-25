import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackScanner } from './slack.scanner';

@Module({
  providers: [SlackService, SlackScanner],
  exports: [SlackService, SlackScanner],
})
export class SlackModule {}
