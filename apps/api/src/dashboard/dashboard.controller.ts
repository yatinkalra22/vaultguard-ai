import { Controller, Get, Req, Sse, UseGuards } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { OnEvent } from '@nestjs/event-emitter';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

/**
 * WHY: SSE (Server-Sent Events) for real-time dashboard updates instead of WebSockets.
 * SSE is unidirectional (server → client), which is all we need for scan progress.
 * It works over HTTP/1.1 (no upgrade needed), auto-reconnects, and is natively
 * supported by EventSource in all browsers.
 * Ref: 06-design-demo.md — "Live feed card updates" for demo moment 2
 */

// WHY: Typed event payload to keep SSE messages consistent across emitters and consumers.
interface ScanEvent {
  type: 'scan.started' | 'scan.completed' | 'scan.failed';
  orgId: string;
  scanId: string;
  findingsCount?: number;
  riskScore?: number;
  summary?: string;
  error?: string;
  timestamp: string;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  // WHY: RxJS Subject acts as a bridge between NestJS EventEmitter events
  // and the SSE Observable stream. Each connected client subscribes to this subject.
  private readonly eventSubject = new Subject<ScanEvent>();

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/summary
   * Returns aggregated dashboard data in a single request.
   */
  @Get('summary')
  async getSummary(@Req() req: any) {
    // WHY: orgId comes from the JWT — users only see their own org's data.
    // Fallback to 'default' for local dev where org_id may not be in the token.
    const orgId = req.user?.org_id ?? 'default';
    return this.dashboardService.getSummary(orgId);
  }

  /**
   * SSE /api/dashboard/events
   * Real-time event stream for scan progress and new findings.
   * WHY: NestJS @Sse decorator returns an Observable<MessageEvent> that keeps
   * the HTTP connection open. The client uses EventSource to subscribe.
   * Ref: 01-architecture.md — "SSE /api/dashboard/events"
   */
  // WHY: SSE is a long-lived connection — throttling it would kill the stream.
  @SkipThrottle()
  @Sse('events')
  events(@Req() req: any): Observable<MessageEvent> {
    const orgId = req.user?.org_id ?? 'default';

    return this.eventSubject.pipe(
      // WHY: Filter events by orgId so clients only receive their own org's events.
      // Multi-tenant isolation at the SSE layer.
      filter((event) => event.orgId === orgId),
      map(
        (event) =>
          ({
            data: JSON.stringify(event),
            type: event.type,
          }) as MessageEvent,
      ),
    );
  }

  // WHY: @OnEvent listeners bridge NestJS EventEmitter (used by ScanningService)
  // to the RxJS Subject (consumed by SSE clients). This decouples scanning from
  // the dashboard — ScanningService doesn't need to know about SSE.

  @OnEvent('scan.started')
  handleScanStarted(payload: { orgId: string; scanId: string }) {
    this.eventSubject.next({
      type: 'scan.started',
      orgId: payload.orgId,
      scanId: payload.scanId,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('scan.completed')
  handleScanCompleted(payload: {
    orgId: string;
    scanId: string;
    findingsCount: number;
    riskScore: number;
    summary: string;
  }) {
    this.eventSubject.next({
      type: 'scan.completed',
      orgId: payload.orgId,
      scanId: payload.scanId,
      findingsCount: payload.findingsCount,
      riskScore: payload.riskScore,
      summary: payload.summary,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('scan.failed')
  handleScanFailed(payload: {
    orgId: string;
    scanId: string;
    error: string;
  }) {
    this.eventSubject.next({
      type: 'scan.failed',
      orgId: payload.orgId,
      scanId: payload.scanId,
      error: payload.error,
      timestamp: new Date().toISOString(),
    });
  }
}
