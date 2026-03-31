import { Controller, Post, Body, Logger } from '@nestjs/common';

/**
 * Telemetry controller — receives client-side observability events
 * Logs user behavior patterns: errors, retries, successes
 * No auth required — telemetry collection happens before auth context
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

@Controller('api/telemetry')
export class TelemetryController {
  private readonly logger = new Logger('Telemetry');

  @Post()
  async recordEvents(@Body() payload: TelemetryPayload) {
    if (!payload?.events || !Array.isArray(payload.events)) {
      return { recorded: 0 };
    }

    for (const event of payload.events) {
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
      this.logger.debug(
        parts.join(' ') || event.message || 'telemetry event'
      );
    }

    return { recorded: payload.events.length };
  }
}
