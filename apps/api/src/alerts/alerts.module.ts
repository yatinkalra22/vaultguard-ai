import { Module } from '@nestjs/common';
import { SlackModule } from '../slack/slack.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [SlackModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
