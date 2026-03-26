"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, GitBranch, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface FindingsSummaryProps {
  totalOpen: number;
  severityCounts: SeverityCounts;
  connectedIntegrations: number;
  scansToday: number;
  loading?: boolean;
}

/**
 * WHY: Three stat cards (Open Findings, Integrations, Scans Today) give the admin
 * an at-a-glance health view beside the risk score.
 * Ref: 06-design-demo.md — metric cards layout
 */
export function FindingsSummary({
  totalOpen,
  severityCounts,
  connectedIntegrations,
  scansToday,
  loading,
}: FindingsSummaryProps) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Open Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <p className="text-3xl font-bold">{totalOpen}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {severityCounts.critical > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--risk-critical)]/20 text-[var(--risk-critical)]">
                    {severityCounts.critical} critical
                  </span>
                )}
                {severityCounts.high > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--risk-high)]/20 text-[var(--risk-high)]">
                    {severityCounts.high} high
                  </span>
                )}
                {severityCounts.medium > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--risk-medium)]/20 text-[var(--risk-medium)]">
                    {severityCounts.medium} medium
                  </span>
                )}
                {severityCounts.low > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--risk-low)]/20 text-[var(--risk-low)]">
                    {severityCounts.low} low
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <p className="text-3xl font-bold">{connectedIntegrations}</p>
              <p className="text-xs text-muted-foreground mt-1">connected</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Scans Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <>
              <p className="text-3xl font-bold">{scansToday}</p>
              <p className="text-xs text-muted-foreground mt-1">completed</p>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
