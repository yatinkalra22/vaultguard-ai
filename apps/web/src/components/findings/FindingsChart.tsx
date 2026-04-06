'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { RemediationBulkActions } from './RemediationBulkActions';
import { api, showErrorToast } from '@/lib/api';
import type { FindingSeverity, FindingType } from '@/types/domain';

interface FindingsAnalytics {
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: {
    [key: string]: number;
  };
  findingsTrend: Array<{
    date: string;
    total: number;
    critical: number;
  }>;
  topRisks: Array<{
    id: string;
    title: string;
    severity: FindingSeverity;
    affectedResources: number;
    lastSeen: string;
  }>;
  remediationTimeAverage: number;
}

interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  type?: FindingType;
}

const SEVERITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export function FindingsChart() {
  const [analytics, setAnalytics] = useState<FindingsAnalytics | null>(null);
  const [openFindings, setOpenFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // WHY: Track last JSON to skip re-renders when data hasn't changed.
    // Prevents visible chart flicker on every poll cycle.
    let lastAnalyticsJson = '';
    let lastFindingsJson = '';

    const fetchAnalytics = async () => {
      try {
        const [dashboardAnalytics, findings] = await Promise.all([
          api.get<FindingsAnalytics>('findings/analytics/dashboard'),
          api.get<Finding[]>('findings', { status: 'open', severity: 'all' }),
        ]);

        const analyticsJson = JSON.stringify(dashboardAnalytics);
        const findingsJson = JSON.stringify(findings);

        if (analyticsJson !== lastAnalyticsJson) {
          lastAnalyticsJson = analyticsJson;
          setAnalytics(dashboardAnalytics);
        }
        if (findingsJson !== lastFindingsJson) {
          lastFindingsJson = findingsJson;
          setOpenFindings(findings);
        }
      } catch (error: unknown) {
        showErrorToast(error, 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // WHY: 30s poll avoids flicker; event-driven refresh handles immediate updates
    const interval = setInterval(fetchAnalytics, 30_000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Unable to load analytics</div>
      </div>
    );
  }

  // Prepare data for severity pie chart
  const severityData = [
    { name: 'Critical', value: analytics.severityBreakdown.critical },
    { name: 'High', value: analytics.severityBreakdown.high },
    { name: 'Medium', value: analytics.severityBreakdown.medium },
    { name: 'Low', value: analytics.severityBreakdown.low },
  ];

  // Prepare data for category bar chart
  const categoryData = Object.entries(analytics.categoryBreakdown).map(([name, value]) => ({
    name,
    count: value,
  }));

  const remediationCandidates = openFindings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .map((finding) => ({
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      category: finding.type ?? 'Other',
    }));

  return (
    <div className="space-y-8">
      {/* Remediation Bulk Actions Panel */}
      <RemediationBulkActions
        findings={remediationCandidates}
        onRemediateBatch={(findingIds) => {
          setOpenFindings((current) =>
            current.filter((finding) => !findingIds.includes(finding.id))
          );
        }}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Breakdown Pie Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Findings by Severity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill={SEVERITY_COLORS.critical} />
                <Cell fill={SEVERITY_COLORS.high} />
                <Cell fill={SEVERITY_COLORS.medium} />
                <Cell fill={SEVERITY_COLORS.low} />
              </Pie>
              <Tooltip
                formatter={(value) => value}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f9fafb',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Findings by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#9ca3af' }} />
              <YAxis tick={{ fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f9fafb',
                }}
              />
              <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Findings Trend Line Chart */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Findings Trend (7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.findingsTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
            <YAxis tick={{ fill: '#9ca3af' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#f9fafb',
              }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af' }} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#06b6d4"
              dot={{ fill: '#06b6d4', r: 4 }}
              activeDot={{ r: 6 }}
              name="Total Findings"
            />
            <Line
              type="monotone"
              dataKey="critical"
              stroke="#dc2626"
              dot={{ fill: '#dc2626', r: 4 }}
              activeDot={{ r: 6 }}
              name="Critical Findings"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Risks Table */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Top Risks Requiring Attention
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Risk Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Resources
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {analytics.topRisks.map((risk) => (
                <tr key={risk.id} className="hover:bg-accent/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {risk.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        risk.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : risk.severity === 'high'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {risk.affectedResources}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {risk.lastSeen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Average remediation time: <span className="font-semibold text-foreground">{analytics.remediationTimeAverage}h</span>
        </div>
      </div>
    </div>
  );
}
