import { Injectable } from '@nestjs/common';

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
  /**
   * Get comprehensive analytics for findings dashboard
   */
  getDashboardAnalytics(): FindingsAnalytics {
    return {
      severityBreakdown: {
        critical: 12,
        high: 34,
        medium: 89,
        low: 156,
      },
      categoryBreakdown: {
        'IAM & Access': 45,
        'Data Exposure': 32,
        'Encryption': 28,
        'Configuration': 67,
        'Secrets Management': 21,
        'Other': 78,
      },
      findingsTrend: [
        { date: '7d ago', total: 278, critical: 15 },
        { date: '6d ago', total: 275, critical: 14 },
        { date: '5d ago', total: 268, critical: 13 },
        { date: '4d ago', total: 265, critical: 12 },
        { date: '3d ago', total: 258, critical: 12 },
        { date: '2d ago', total: 252, critical: 12 },
        { date: 'Today', total: 291, critical: 12 },
      ],
      topRisks: [
        {
          id: 'risk-001',
          title: 'Exposed AWS credentials in GitHub',
          severity: 'critical',
          affectedResources: 3,
          lastSeen: '2 hours ago',
        },
        {
          id: 'risk-002',
          title: 'S3 bucket with public read access',
          severity: 'critical',
          affectedResources: 2,
          lastSeen: '4 hours ago',
        },
        {
          id: 'risk-003',
          title: 'RDS database without encryption',
          severity: 'high',
          affectedResources: 1,
          lastSeen: '1 day ago',
        },
        {
          id: 'risk-004',
          title: 'API key hardcoded in config',
          severity: 'high',
          affectedResources: 5,
          lastSeen: '2 days ago',
        },
        {
          id: 'risk-005',
          title: 'Unencrypted database connection strings',
          severity: 'high',
          affectedResources: 4,
          lastSeen: '3 days ago',
        },
      ],
      remediationTimeAverage: 14.5, // hours
    };
  }

  /**
   * Get severity breakdown for pie chart
   */
  getSeverityBreakdown(): SeverityBreakdown {
    const analytics = this.getDashboardAnalytics();
    return analytics.severityBreakdown;
  }

  /**
   * Get category breakdown for bar chart
   */
  getCategoryBreakdown(): CategoryBreakdown {
    const analytics = this.getDashboardAnalytics();
    return analytics.categoryBreakdown;
  }

  /**
   * Get findings trend data for line chart
   */
  getFindingsTrend(): FindingsTrend[] {
    const analytics = this.getDashboardAnalytics();
    return analytics.findingsTrend;
  }

  /**
   * Get top risks ranked by severity and impact
   */
  getTopRisks(limit: number = 5) {
    const analytics = this.getDashboardAnalytics();
    return analytics.topRisks.slice(0, limit);
  }
}
