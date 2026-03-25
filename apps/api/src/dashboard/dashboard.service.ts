import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Aggregate dashboard summary: risk score, finding counts, recent scans, integrations.
   * WHY: Single endpoint to avoid N+1 waterfall requests from the frontend dashboard.
   * The frontend needs all of this data on initial load — one call is faster than four.
   * Ref: 01-architecture.md — GET /dashboard/summary
   */
  async getSummary(orgId: string) {
    // WHY: Promise.all because all queries are independent reads — if one fails,
    // the entire summary is incomplete and the dashboard can't render properly.
    const [findingsResult, scansResult, integrationsResult] = await Promise.all(
      [
        this.supabase.client
          .from('findings')
          .select('severity, status')
          .eq('org_id', orgId),

        this.supabase.client
          .from('scans')
          .select('*')
          .eq('org_id', orgId)
          .order('started_at', { ascending: false })
          .limit(5),

        this.supabase.client
          .from('integrations')
          .select('provider, status, last_scan_at')
          .eq('org_id', orgId),
      ],
    );

    const findings = findingsResult.data ?? [];
    const recentScans = scansResult.data ?? [];
    const integrations = integrationsResult.data ?? [];

    // Count open findings by severity
    const openFindings = findings.filter((f) => f.status === 'open');
    const severityCounts = {
      critical: openFindings.filter((f) => f.severity === 'critical').length,
      high: openFindings.filter((f) => f.severity === 'high').length,
      medium: openFindings.filter((f) => f.severity === 'medium').length,
      low: openFindings.filter((f) => f.severity === 'low').length,
    };

    // WHY: Risk score = weighted sum of open findings, capped at 100.
    // Critical findings weigh heavily because they represent immediate threats.
    // Ref: 05-features-competitors.md — "Risk Score — 0–100 score"
    const riskScore = Math.min(
      100,
      severityCounts.critical * 25 +
        severityCounts.high * 10 +
        severityCounts.medium * 5 +
        severityCounts.low * 2,
    );

    const connectedIntegrations = integrations.filter(
      (i) => i.status === 'active',
    ).length;

    // Count scans from today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const scansToday = recentScans.filter(
      (s) => new Date(s.started_at) >= todayStart,
    ).length;

    return {
      riskScore,
      totalOpenFindings: openFindings.length,
      severityCounts,
      connectedIntegrations,
      scansToday,
      recentScans: recentScans.map((s) => ({
        id: s.id,
        provider: s.provider,
        status: s.status,
        findingsCount: s.findings_count,
        startedAt: s.started_at,
        completedAt: s.completed_at,
      })),
    };
  }
}
