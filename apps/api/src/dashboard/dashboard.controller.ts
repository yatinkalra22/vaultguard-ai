import { Controller, Get, Post, Req, Sse, UseGuards } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { OnEvent } from '@nestjs/event-emitter';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { SupabaseService } from '../common/supabase.service';

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

interface AuthenticatedRequest extends Request {
  user?: {
    orgId?: string;
    org_id?: string;
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  // WHY: RxJS Subject acts as a bridge between NestJS EventEmitter events
  // and the SSE Observable stream. Each connected client subscribes to this subject.
  private readonly eventSubject = new Subject<ScanEvent>();

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * GET /api/dashboard/summary
   * Returns aggregated dashboard data in a single request.
   */
  @Get('summary')
  async getSummary(@Req() req: AuthenticatedRequest) {
    // WHY: orgId comes from the JWT — users only see their own org's data.
    // Fallback to 'default' for local dev where org_id may not be in the token.
    const orgId = req.user?.orgId ?? req.user?.org_id ?? 'default';
    return this.dashboardService.getSummary(orgId);
  }

  /**
   * GET /api/dashboard/timeline
   * Unified incident timeline for demo storytelling.
   */
  @Get('timeline')
  async getTimeline(@Req() req: AuthenticatedRequest) {
    const orgId = req.user?.orgId ?? req.user?.org_id ?? 'default';

    const [scansRes, alertsRes, auditRes] = await Promise.all([
      this.supabase.client
        .from('scans')
        .select('id,status,findings_count,started_at,completed_at')
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(10),
      this.supabase.client
        .from('alert_incidents')
        .select('id,reason,status,duplicate_count,updated_at')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(10),
      this.supabase.client
        .from('audit_logs')
        .select('id,action,actor,target,created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    const events = [
      ...(scansRes.data ?? []).map((scan) => ({
        id: `scan-${scan.id}`,
        type: 'scan',
        title: `Scan ${scan.status}`,
        description: `Findings: ${scan.findings_count ?? 0}`,
        timestamp: scan.completed_at ?? scan.started_at,
      })),
      ...(alertsRes.data ?? []).map((alert) => ({
        id: `alert-${alert.id}`,
        type: 'alert',
        title: `Alert ${alert.status}`,
        description: `${alert.reason} (x${alert.duplicate_count ?? 1})`,
        timestamp: alert.updated_at,
      })),
      ...(auditRes.data ?? []).map((log) => ({
        id: `audit-${log.id}`,
        type: 'audit',
        title: log.action,
        description: `Actor: ${log.actor}`,
        timestamp: log.created_at,
      })),
    ]
      .filter((event) => Boolean(event.timestamp))
      .sort(
        (a, b) =>
          new Date(b.timestamp as string).getTime() -
          new Date(a.timestamp as string).getTime(),
      )
      .slice(0, 25);

    return events;
  }

  /**
   * POST /api/dashboard/demo-seed
   * Seed deterministic demo data for reliable presentations.
   */
  @Post('demo-seed')
  async seedDemo(@Req() req: AuthenticatedRequest) {
    const orgId = req.user?.orgId ?? req.user?.org_id ?? 'default';
    const actor = 'demo-seed';

    await this.supabase.client
      .from('scans')
      .insert([
        {
          org_id: orgId,
          provider: 'all',
          status: 'completed',
          findings_count: 8,
          started_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          completed_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        },
        {
          org_id: orgId,
          provider: 'all',
          status: 'completed',
          findings_count: 5,
          started_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
          completed_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        },
      ]);

    await this.supabase.client.from('findings').insert([
      {
        org_id: orgId,
        provider: 'github',
        severity: 'critical',
        type: 'shadow_app',
        title: 'Unapproved OAuth app has broad repo scope',
        description: 'App can read private repositories and organization metadata.',
        status: 'open',
      },
      {
        org_id: orgId,
        provider: 'slack',
        severity: 'high',
        type: 'stale_user',
        title: 'Inactive admin retains workspace owner role',
        description: 'Owner has been inactive for 74 days.',
        status: 'open',
      },
    ]);

    await this.supabase.client.from('alert_incidents').insert([
      {
        org_id: orgId,
        reason: 'risk_threshold_exceeded',
        status: 'open',
        current_risk_score: 73,
        critical_findings: 4,
        duplicate_count: 2,
      },
    ]);

    await this.supabase.client.from('audit_logs').insert([
      {
        org_id: orgId,
        actor,
        action: 'demo.seeded',
        target: { mode: 'reliable-demo' },
      },
    ]);

    return { ok: true, message: 'Demo data seeded' };
  }

  /**
   * POST /api/dashboard/demo-reset
   * Clear demo-generated data for clean reruns.
   */
  @Post('demo-reset')
  async resetDemo(@Req() req: AuthenticatedRequest) {
    const orgId = req.user?.orgId ?? req.user?.org_id ?? 'default';

    await Promise.all([
      this.supabase.client
        .from('findings')
        .delete()
        .eq('org_id', orgId)
        .in('type', ['shadow_app', 'stale_user']),
      this.supabase.client
        .from('alert_incidents')
        .delete()
        .eq('org_id', orgId)
        .in('reason', ['risk_threshold_exceeded']),
      this.supabase.client
        .from('audit_logs')
        .delete()
        .eq('org_id', orgId)
        .in('action', ['demo.seeded']),
    ]);

    return { ok: true, message: 'Demo data reset' };
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
  events(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    const orgId = req.user?.orgId ?? req.user?.org_id ?? 'default';

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
