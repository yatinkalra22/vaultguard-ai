"use client";

import { useEffect, useState } from "react";
import { api, showErrorToast, showSuccessToast } from "@/lib/api";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { FindingsSummary } from "@/components/dashboard/FindingsSummary";
import { RecentScans } from "@/components/dashboard/RecentScans";
import { LiveScanFeed } from "@/components/dashboard/LiveScanFeed";
import { TriggerScanButton } from "@/components/dashboard/TriggerScanButton";
import { AgentPermissions } from "@/components/dashboard/AgentPermissions";
import { DashboardMetricsDisplay } from "@/components/dashboard/MetricsDisplay";
import { AlertHistoryPanel } from "@/components/dashboard/AlertHistoryPanel";
import { IncidentTimelinePanel } from "@/components/dashboard/IncidentTimelinePanel";
import { FindingsChart } from "@/components/findings/FindingsChart";
import { useMetrics } from "@/hooks/useMetrics";

/**
 * WHY: Client component because it fetches data and re-renders on scan events.
 * The dashboard layout (layout.tsx) already checks auth server-side,
 * so this page is guaranteed to be inside an authenticated session.
 */

interface DashboardSummary {
  riskScore: number;
  totalOpenFindings: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  connectedIntegrations: number;
  scansToday: number;
  recentScans: Array<{
    id: string;
    provider: string;
    status: string;
    findingsCount: number;
    startedAt: string;
    completedAt: string | null;
  }>;
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { metrics, loading: metricsLoading } = useMetrics();

  useEffect(() => {
    if (!data) return;

    const evaluateThresholds = async () => {
      try {
        const evaluation = await api.post<{
          shouldTriggerScan: boolean;
          reason: string;
          settings?: { scanCooldownMinutes: number };
          incident?: { id: string };
        }>("alerts/evaluate", {
          currentRiskScore: data.riskScore,
          criticalFindings: data.severityCounts.critical,
        });

        if (!evaluation.shouldTriggerScan) return;

        if (evaluation.incident) {
          window.dispatchEvent(new CustomEvent("custom:alertSettingsUpdated"));
        }

        const cooldownMinutes = evaluation.settings?.scanCooldownMinutes ?? 30;
        const lastTriggeredAt = Number(
          window.localStorage.getItem("vaultguard:lastAutoScanAt") ?? 0
        );
        const cooldownMs = cooldownMinutes * 60 * 1000;

        if (Date.now() - lastTriggeredAt < cooldownMs) return;

        await api.post("scans/trigger");
        window.localStorage.setItem(
          "vaultguard:lastAutoScanAt",
          String(Date.now())
        );
        showSuccessToast(
          "Auto-scan triggered from alert threshold",
          evaluation.reason
        );
      } catch (err) {
        showErrorToast(err, "evaluate_alert_thresholds");
      }
    };

    evaluateThresholds();
  }, [data]);

  useEffect(() => {
    api
      .get<DashboardSummary>("dashboard/summary")
      .then(setData)
      .catch(() => {
        // WHY: On first load (no org yet), the summary may return empty.
        // Set a fallback so the page still renders with zeroed-out metrics.
        setData({
          riskScore: 0,
          totalOpenFindings: 0,
          severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
          connectedIntegrations: 0,
          scansToday: 0,
          recentScans: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Security Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.recentScans?.[0]
              ? `Last scanned: ${new Date(data.recentScans[0].startedAt).toLocaleString()}`
              : "Connect your integrations to start scanning."}
          </p>
        </div>
        <TriggerScanButton />
      </div>

      {/* Metric cards grid — risk score spans 2 rows on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RiskScoreCard score={data?.riskScore ?? 0} loading={loading} />
        <FindingsSummary
          totalOpen={data?.totalOpenFindings ?? 0}
          severityCounts={
            data?.severityCounts ?? { critical: 0, high: 0, medium: 0, low: 0 }
          }
          connectedIntegrations={data?.connectedIntegrations ?? 0}
          scansToday={data?.scansToday ?? 0}
          loading={loading}
        />
      </div>

      {/* KPI Dashboard — Real-time metrics */}
      {metrics && !metricsLoading && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Real-Time Metrics</h2>
          <DashboardMetricsDisplay metrics={metrics} />
        </div>
      )}

      {/* Findings Analytics Dashboard */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Findings Analytics</h2>
        <FindingsChart />
      </div>

      {/* Middle row — recent scans + live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentScans scans={data?.recentScans ?? []} loading={loading} />
        <LiveScanFeed />
      </div>

      {/* Alert history */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AlertHistoryPanel />
        <IncidentTimelinePanel />
      </div>

      {/* Bottom row — agent permissions transparency panel */}
      <AgentPermissions
        slackConnected={(data?.connectedIntegrations ?? 0) > 0}
        githubConnected={(data?.connectedIntegrations ?? 0) > 1}
      />
    </div>
  );
}
