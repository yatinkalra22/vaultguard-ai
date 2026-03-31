'use client';

import { TrendingUp, AlertCircle, CheckCircle2, Clock, Shield, Activity } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number; // percentage change
  icon: React.ReactNode;
  color: 'emerald' | 'red' | 'amber' | 'blue';
}

export function MetricCard({ label, value, trend, icon, color }: MetricCardProps) {
  const colorMap = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  };

  const bgColorMap = {
    emerald: 'bg-emerald-950/30 border-emerald-700/50',
    red: 'bg-red-950/30 border-red-700/50',
    amber: 'bg-amber-950/30 border-amber-700/50',
    blue: 'bg-blue-950/30 border-blue-700/50',
  };

  return (
    <div className={`${bgColorMap[color]} border rounded-lg p-4 backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${colorMap[color]} p-2 rounded bg-black/20`}>{icon}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 text-xs text-foreground/60">
            <TrendingUp className="w-3 h-3" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>

      <p className="text-xs text-foreground/60 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface DashboardMetrics {
  totalFindings: number;
  criticalFindings: number;
  remediationsCompleted: number;
  remediationsPending: number;
  violationsPrevented: number;
  scanCoverage: number;
  scanLastRun?: string;
}

interface DashboardMetricsProps {
  metrics: DashboardMetrics;
}

/**
 * Dashboard Metrics display — shows KPI cards for findings, remediations, coverage
 * Updates in real-time via WebSocket when scans complete or remediations succeed
 */
export function DashboardMetricsDisplay({ metrics }: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Findings */}
      <MetricCard
        label="Total Findings"
        value={metrics.totalFindings}
        trend={2}
        icon={<AlertCircle className="w-5 h-5" />}
        color="red"
      />

      {/* Critical Findings */}
      <MetricCard
        label="Critical Findings"
        value={metrics.criticalFindings}
        trend={-15}
        icon={<Shield className="w-5 h-5" />}
        color="red"
      />

      {/* Remediations Completed */}
      <MetricCard
        label="Remediations Completed"
        value={metrics.remediationsCompleted}
        trend={8}
        icon={<CheckCircle2 className="w-5 h-5" />}
        color="emerald"
      />

      {/* Remediations Pending */}
      <MetricCard
        label="Remediations Pending"
        value={metrics.remediationsPending}
        trend={-3}
        icon={<Clock className="w-5 h-5" />}
        color="amber"
      />

      {/* Violations Prevented */}
      <MetricCard
        label="Violations Prevented"
        value={metrics.violationsPrevented}
        trend={12}
        icon={<Activity className="w-5 h-5" />}
        color="emerald"
      />

      {/* Scan Coverage */}
      <MetricCard
        label="Scan Coverage"
        value={`${metrics.scanCoverage}%`}
        icon={<AlertCircle className="w-5 h-5" />}
        color="blue"
      />
    </div>
  );
}
