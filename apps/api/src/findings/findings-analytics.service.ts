import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';

export interface SeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CategoryBreakdown {
  [key: string]: number;
}

export interface FindingsTrend {
  date: string;
  total: number;
  critical: number;
}

export interface FindingsAnalytics {
  severityBreakdown: SeverityBreakdown;
  categoryBreakdown: CategoryBreakdown;
  findingsTrend: FindingsTrend[];
  topRisks: Array<{
    id: string;
    title: string;
    severity: string;
    affectedResources: number;
    lastSeen: string;
  }>;
  remediationTimeAverage: number;
}

@Injectable()
export class FindingsAnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  private emptyAnalytics(): FindingsAnalytics {
    return {
      severityBreakdown: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      categoryBreakdown: {},
      findingsTrend: [],
      topRisks: [],
      remediationTimeAverage: 0,
    };
  }

  private mapTypeToCategory(type: string): string {
    switch (type) {
      case 'stale_user':
      case 'deactivated_admin':
      case 'over_permissioned':
        return 'IAM & Access';
      case 'shadow_app':
        return 'Application Security';
      default:
        return 'Other';
    }
  }

  /**
   * Get comprehensive analytics for findings dashboard
   */
  async getDashboardAnalytics(orgId: string): Promise<FindingsAnalytics> {
    if (!orgId) return this.emptyAnalytics();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [openFindingsRes, trendFindingsRes, executedRemediationsRes] =
      await Promise.all([
        this.supabase.client
          .from('findings')
          .select('id,title,severity,type,created_at,affected_entity')
          .eq('org_id', orgId)
          .eq('status', 'open'),

        this.supabase.client
          .from('findings')
          .select('severity,created_at')
          .eq('org_id', orgId)
          .gte('created_at', sevenDaysAgo.toISOString()),

        this.supabase.client
          .from('remediations')
          .select('requested_at,resolved_at')
          .eq('org_id', orgId)
          .eq('status', 'executed')
          .not('resolved_at', 'is', null)
          .order('resolved_at', { ascending: false })
          .limit(100),
      ]);

    const openFindings = openFindingsRes.data ?? [];
    const trendFindings = trendFindingsRes.data ?? [];
    const executedRemediations = executedRemediationsRes.data ?? [];

    const severityBreakdown: SeverityBreakdown = {
      critical: openFindings.filter((f) => f.severity === 'critical').length,
      high: openFindings.filter((f) => f.severity === 'high').length,
      medium: openFindings.filter((f) => f.severity === 'medium').length,
      low: openFindings.filter((f) => f.severity === 'low').length,
    };

    const categoryBreakdown: CategoryBreakdown = {};
    for (const finding of openFindings) {
      const category = this.mapTypeToCategory(String(finding.type ?? ''));
      categoryBreakdown[category] = (categoryBreakdown[category] ?? 0) + 1;
    }

    const dayBuckets = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      return {
        key: date.toISOString().slice(0, 10),
        label:
          i === 6
            ? 'Today'
            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: 0,
        critical: 0,
      };
    });

    for (const finding of trendFindings) {
      const createdAt = String(finding.created_at ?? '').slice(0, 10);
      const bucket = dayBuckets.find((d) => d.key === createdAt);
      if (!bucket) continue;
      bucket.total += 1;
      if (finding.severity === 'critical') bucket.critical += 1;
    }

    const severityScore = (severity: string): number => {
      if (severity === 'critical') return 4;
      if (severity === 'high') return 3;
      if (severity === 'medium') return 2;
      return 1;
    };

    const topRisks = [...openFindings]
      .sort((a, b) => {
        const severityDelta =
          severityScore(String(b.severity ?? '')) -
          severityScore(String(a.severity ?? ''));
        if (severityDelta !== 0) return severityDelta;

        const createdA = new Date(String(a.created_at ?? 0)).getTime();
        const createdB = new Date(String(b.created_at ?? 0)).getTime();
        return createdB - createdA;
      })
      .slice(0, 5)
      .map((finding) => {
        const affectedEntity =
          finding.affected_entity && typeof finding.affected_entity === 'object'
            ? (finding.affected_entity as Record<string, unknown>)
            : null;

        const resources =
          affectedEntity && Array.isArray(affectedEntity.resources)
            ? affectedEntity.resources.length
            : 1;

        return {
          id: String(finding.id),
          title: String(finding.title ?? 'Untitled finding'),
          severity: String(finding.severity ?? 'low'),
          affectedResources: resources,
          lastSeen: String(finding.created_at ?? ''),
        };
      });

    const durations = executedRemediations
      .map((r) => {
        const requested = new Date(String(r.requested_at ?? '')).getTime();
        const resolved = new Date(String(r.resolved_at ?? '')).getTime();
        if (!Number.isFinite(requested) || !Number.isFinite(resolved)) return null;
        if (resolved <= requested) return null;
        return (resolved - requested) / (1000 * 60 * 60);
      })
      .filter((v): v is number => v !== null);

    const remediationTimeAverage =
      durations.length > 0
        ? Number(
            (durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1),
          )
        : 0;

    return {
      severityBreakdown,
      categoryBreakdown,
      findingsTrend: dayBuckets.map((d) => ({
        date: d.label,
        total: d.total,
        critical: d.critical,
      })),
      topRisks,
      remediationTimeAverage,
    };
  }

  /**
   * Get severity breakdown for pie chart
   */
  async getSeverityBreakdown(orgId: string): Promise<SeverityBreakdown> {
    const analytics = await this.getDashboardAnalytics(orgId);
    return analytics.severityBreakdown;
  }

  /**
   * Get category breakdown for bar chart
   */
  async getCategoryBreakdown(orgId: string): Promise<CategoryBreakdown> {
    const analytics = await this.getDashboardAnalytics(orgId);
    return analytics.categoryBreakdown;
  }

  /**
   * Get findings trend data for line chart
   */
  async getFindingsTrend(orgId: string): Promise<FindingsTrend[]> {
    const analytics = await this.getDashboardAnalytics(orgId);
    return analytics.findingsTrend;
  }

  /**
   * Get top risks ranked by severity and impact
   */
  async getTopRisks(orgId: string, limit: number = 5) {
    const analytics = await this.getDashboardAnalytics(orgId);
    return analytics.topRisks.slice(0, limit);
  }
}
