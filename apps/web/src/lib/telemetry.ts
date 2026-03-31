// Telemetry service for structured error logging
// Logs error codes, statuses, request IDs, routes, and actions for observability

export interface ErrorEvent {
  type: 'api_error' | 'validation_error' | 'auth_error' | 'network_error';
  code?: string; // ERROR_CODE from API
  status?: number;
  message: string;
  requestId?: string;
  route?: string; // API endpoint
  action?: string; // User action that triggered error
  timestamp?: number;
  userAgent?: string;
}

export interface SuccessEvent {
  type: 'api_success' | 'action_completed';
  action: string;
  requestId?: string;
  duration?: number; // ms
  timestamp?: number;
}

export interface RetryEvent {
  type: 'retry_attempt' | 'retry_success' | 'retry_exhausted';
  code?: string;
  status?: number;
  attempt: number;
  maxAttempts: number;
  requestId?: string;
  timestamp?: number;
}

export type TelemetryEvent = ErrorEvent | SuccessEvent | RetryEvent;

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private batchSize = 10;
  private batchTimeoutMs = 5000;
  private endpoint = '/api/telemetry';
  private batchTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Only setup in browser
    if (typeof window !== 'undefined') {
      // Flush on page unload
      window.addEventListener('beforeunload', () => this.flush());
      // Periodic flush
      setInterval(() => this.flushIfReady(), this.batchTimeoutMs);
    }
  }

  logError(event: ErrorEvent) {
    event.timestamp = Date.now();
    event.userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
    this.queue.push(event);

    console.debug('[Telemetry]', `${event.type}:`, {
      code: event.code,
      status: event.status,
      message: event.message,
      requestId: event.requestId,
      route: event.route,
      action: event.action,
    });

    this.flushIfReady();
  }

  logSuccess(event: SuccessEvent) {
    event.timestamp = Date.now();
    this.queue.push(event);

    console.debug('[Telemetry]', `${event.type}:`, {
      action: event.action,
      requestId: event.requestId,
      duration: event.duration,
    });

    this.flushIfReady();
  }

  logRetry(event: RetryEvent) {
    event.timestamp = Date.now();
    this.queue.push(event);

    console.debug('[Telemetry]', `${event.type}:`, {
      code: event.code,
      status: event.status,
      attempt: event.attempt,
      maxAttempts: event.maxAttempts,
      requestId: event.requestId,
    });

    this.flushIfReady();
  }

  private flushIfReady() {
    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
    } catch (error) {
      // Silently fail — don't break user experience over telemetry
      console.debug('[Telemetry] Flush failed:', error);
      // Re-queue if failed (with limit to prevent memory leak)
      if (this.queue.length < 100) {
        this.queue.unshift(...batch);
      }
    }
  }
}

export const telemetry = new TelemetryService();
