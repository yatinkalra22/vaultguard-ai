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
    const fetchAnalytics = async () => {
      try {
        const [dashboardAnalytics, findings] = await Promise.all([
          api.get<FindingsAnalytics>('/findings/analytics/dashboard'),
          api.get<Finding[]>('/findings', { status: 'open', severity: 'all' }),
        ]);
        setAnalytics(dashboardAnalytics);
        setOpenFindings(findings);
      } catch (error: unknown) {
        showErrorToast(error, 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000); // Refresh every 10 seconds

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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Findings by Severity</h3>
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
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Findings by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Findings Trend Line Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Findings Trend (7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.findingsTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              dot={{ fill: '#3b82f6', r: 4 }}
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Top Risks Requiring Attention
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Risk Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Resources
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.topRisks.map((risk) => (
                <tr key={risk.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {risk.title}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                         className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        risk.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : risk.severity === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
                    </span>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {risk.affectedResources}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {risk.lastSeen}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Average remediation time: <span className="font-semibold">{analytics.remediationTimeAverage}h</span>
        </div>
      </div>
    </div>
  );
}
