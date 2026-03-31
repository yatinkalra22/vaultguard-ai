import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Telemetry controller — receives client-side observability events
 * Logs user behavior patterns: errors, retries, successes
 * Telemetry is authenticated to prevent anonymous event flooding.
 */

export interface TelemetryEvent {
  type: string;
  code?: string;
  status?: number;
  message?: string;
  requestId?: string;
  route?: string;
  action?: string;
  attempt?: number;
  maxAttempts?: number;
  timestamp: number;
  userAgent?: string;
}

export interface TelemetryPayload {
  events: TelemetryEvent[];
}

@Controller('telemetry')
@UseGuards(JwtAuthGuard)
export class TelemetryController {
  private readonly logger = new Logger('Telemetry');

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async recordEvents(@Body() payload: TelemetryPayload) {
    if (!payload?.events || !Array.isArray(payload.events)) {
      return { recorded: 0 };
    }

    const events = payload.events.slice(0, 50);

    for (const event of events) {
      if (!event.type || typeof event.type !== 'string') {
        continue;
      }

      // Log structure: [TYPE] action action=X code=X status=X requestId=X
      const parts: string[] = [];

      if (event.type) parts.push(`[${event.type.toUpperCase()}]`);
      if (event.action) parts.push(`action=${event.action}`);
      if (event.code) parts.push(`code=${event.code}`);
      if (event.status) parts.push(`status=${event.status}`);
      if (event.requestId) parts.push(`requestId=${event.requestId}`);
      if (event.attempt) parts.push(`attempt=${event.attempt}/${event.maxAttempts}`);

      // In production, push to observability backend (Datadog, NewRelic, etc.)
      // For now, just log for local debugging
      this.logger.debug(parts.join(' ') || event.message || 'telemetry event');
    }

    return { recorded: events.length };
  }
}
