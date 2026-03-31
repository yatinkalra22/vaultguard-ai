import { Module } from '@nestjs/common';
import { FindingsController } from './findings.controller';
import { FindingsAnalyticsService } from './findings-analytics.service';

@Module({
  controllers: [FindingsController],
  providers: [FindingsAnalyticsService],
  exports: [FindingsAnalyticsService],
})
export class FindingsModule {}
