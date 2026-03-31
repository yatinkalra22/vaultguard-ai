import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';

/**
 * Telemetry module — collects client observability events
 * Provides insight into error patterns, retry behavior, and user actions
 */
@Module({
  controllers: [TelemetryController],
})
export class TelemetryModule {}
