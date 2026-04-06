import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../common/supabase.service';

/**
 * Metrics service — calculates and emits real-time KPI updates
 * Tracks: findings, remediations, violations prevented, scan coverage
 */

export interface DashboardMetrics {
  totalFindings: number;
  criticalFindings: number;
  remediationsCompleted: number;
  remediationsPending: number;
  violationsPrevented: number;
  scanCoverage: number; // percentage
  scanLastRun?: string; // ISO timestamp
  findingsTrend: Array<{ date: string; count: number }>; // last 7 days
}

export interface MetricsUpdateEvent {
  type: 'metrics_updated';
  metrics: DashboardMetrics;
  timestamp: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger('Metrics');

  constructor(
    private eventEmitter: EventEmitter2,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Calculate current dashboard metrics from persisted data.
   */
  async getDashboardMetrics(orgId: string): Promise<DashboardMetrics> {
    if (!orgId) {
      return {
        totalFindings: 0,
        criticalFindings: 0,
        remediationsCompleted: 0,
        remediationsPending: 0,
        violationsPrevented: 0,
        scanCoverage: 0,
        findingsTrend: [],
      };
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      findingsRes,
      trendFindingsRes,
      remediationsRes,
      integrationsRes,
      latestScanRes,
    ] = await Promise.all([
      this.supabase.client
        .from('findings')
        .select('severity,status')
        .eq('org_id', orgId),

      this.supabase.client
        .from('findings')
        .select('created_at')
        .eq('org_id', orgId)
        .gte('created_at', sevenDaysAgo.toISOString()),

      this.supabase.client
        .from('remediations')
        .select('status')
        .eq('org_id', orgId),

      this.supabase.client
        .from('integrations')
        .select('status,last_scan_at')
        .eq('org_id', orgId),

      this.supabase.client
        .from('scans')
        .select('completed_at,started_at')
        .eq('org_id', orgId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const findings = findingsRes.data ?? [];
    const trendFindings = trendFindingsRes.data ?? [];
    const remediations = remediationsRes.data ?? [];
    const integrations = integrationsRes.data ?? [];

    const totalFindings = findings.filter((f) => f.status === 'open').length;
    const criticalFindings = findings.filter(
      (f) => f.status === 'open' && f.severity === 'critical',
    ).length;
    const remediationsCompleted = remediations.filter(
      (r) => r.status === 'executed',
    ).length;
    const remediationsPending = remediations.filter(
      (r) => r.status === 'pending',
    ).length;

    // WHY: A completed remediation directly represents a prevented violation.
    const violationsPrevented = remediationsCompleted;

    const activeIntegrations = integrations.filter(
      (integration) => integration.status === 'active',
    );
    const scannedIntegrations = activeIntegrations.filter(
      (integration) => integration.last_scan_at !== null,
    );
    const scanCoverage =
      activeIntegrations.length > 0
        ? Math.round((scannedIntegrations.length / activeIntegrations.length) * 100)
        : 0;

    const dayBuckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + index);
      return {
        key: date.toISOString().slice(0, 10),
        count: 0,
      };
    });

    for (const finding of trendFindings) {
      const createdAt = String(finding.created_at ?? '').slice(0, 10);
      const bucket = dayBuckets.find((day) => day.key === createdAt);
      if (bucket) bucket.count += 1;
    }

    const findingsTrend = dayBuckets.map((day) => ({
      date: day.key,
      count: day.count,
    }));

    const latestScan = latestScanRes.data;

    return {
      totalFindings,
      criticalFindings,
      remediationsCompleted,
      remediationsPending,
      violationsPrevented,
      scanCoverage,
      scanLastRun:
        latestScan?.completed_at ?? latestScan?.started_at ?? undefined,
      findingsTrend,
    };
  }

  /**
   * Emit metrics update event when scan completes
   * Triggers real-time push to all connected dashboard clients
   */
  async onScanCompleted(findingsCount: number, orgId = 'default') {
    const metrics = await this.getDashboardMetrics(orgId);

    const event: MetricsUpdateEvent = {
      type: 'metrics_updated',
      metrics,
      timestamp: Date.now(),
    };

    this.logger.debug(`Scan completed: ${findingsCount} new findings`);
    this.eventEmitter.emit('metrics.updated', event);
  }

  /**
   * Emit metrics update event when remediation succeeds
   * Increments remediationsCompleted, decrements remediationsPending
   */
  async onRemediationCompleted(remediationId: string, orgId = 'default') {
    const metrics = await this.getDashboardMetrics(orgId);

    const event: MetricsUpdateEvent = {
      type: 'metrics_updated',
      metrics,
      timestamp: Date.now(),
    };

    this.logger.debug(`Remediation completed: ${remediationId}`);
    this.eventEmitter.emit('metrics.updated', event);
  }

  /**
   * Get trend data for sparkline charts
   */
  async getMetricsTrend(
    orgId: string,
    days = 7,
  ): Promise<DashboardMetrics['findingsTrend']> {
    const metrics = await this.getDashboardMetrics(orgId);
    return metrics.findingsTrend.slice(-days);
  }
}
