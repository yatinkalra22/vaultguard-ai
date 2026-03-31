"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * WHY: Immutable audit trail is critical for compliance (SOC 2, ISO 27001).
 * Every scan, finding, approval, and remediation is logged with timestamps.
 * Ref: 06-design-demo.md — Demo Moment 5 "Navigate to Audit Log"
 * Ref: 05-features-competitors.md — "Full audit trail — every scan, finding, approval"
 */

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AuditResponse {
  data: AuditLog[];
  count: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 25;

// WHY: Action labels map internal action names to human-readable text.
// Ref: 06-design-demo.md — "admin@company.com approved deactivation of john.doe"
const actionLabels: Record<string, string> = {
  "scan.started": "Scan Started",
  "scan.completed": "Scan Completed",
  "scan.failed": "Scan Failed",
  "remediation.requested": "Remediation Requested",
  "remediation.approved": "Remediation Approved",
  "remediation.rejected": "Remediation Rejected",
  "remediation.executed": "Remediation Executed",
  "remediation.failed": "Remediation Failed",
  "finding.ignored": "Finding Ignored",
  "integration.connected": "Integration Connected",
  "integration.disconnected": "Integration Disconnected",
  "alert.triggered": "Alert Triggered",
  "alert.deduplicated": "Alert Deduplicated",
  "alert.acknowledged": "Alert Acknowledged",
};

const actionColors: Record<string, string> = {
  "scan.completed": "bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0",
  "scan.failed": "bg-[var(--risk-critical)]/20 text-[var(--risk-critical)] border-0",
  "remediation.approved": "bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0",
  "remediation.rejected": "bg-[var(--risk-high)]/20 text-[var(--risk-high)] border-0",
  "remediation.executed": "bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0",
  "remediation.failed": "bg-[var(--risk-critical)]/20 text-[var(--risk-critical)] border-0",
  "alert.triggered": "bg-[var(--risk-high)]/20 text-[var(--risk-high)] border-0",
  "alert.deduplicated": "bg-[var(--risk-medium)]/20 text-[var(--risk-medium)] border-0",
  "alert.acknowledged": "bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0",
};

const selectClass =
  "h-9 rounded-md border border-border bg-card text-sm text-foreground px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTarget(target: Record<string, unknown> | null): string {
  if (!target) return "";
  // WHY: Show the most useful fields from the target JSONB column.
  const parts: string[] = [];
  if (target.name) parts.push(String(target.name));
  if (target.email) parts.push(String(target.email));
  if (target.provider) parts.push(String(target.provider));
  if (target.findingId) parts.push(`finding:${String(target.findingId).slice(0, 8)}`);
  return parts.join(" · ");
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(offset),
      };
      if (action) params.action = action;
      const res = await api.get<AuditResponse>("audit-logs", params);
      setLogs(res.data);
      setTotal(res.count);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [offset, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to first page when filter changes
  useEffect(() => {
    setOffset(0);
  }, [action]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Immutable trail of every action. Who did what, when.
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <select
          className={selectClass}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          aria-label="Filter by action"
        >
          <option value="">All Actions</option>
          <option value="scan.started">Scan Started</option>
          <option value="scan.completed">Scan Completed</option>
          <option value="scan.failed">Scan Failed</option>
          <option value="remediation.requested">Remediation Requested</option>
          <option value="remediation.approved">Remediation Approved</option>
          <option value="remediation.rejected">Remediation Rejected</option>
          <option value="remediation.executed">Remediation Executed</option>
          <option value="finding.ignored">Finding Ignored</option>
          <option value="alert.triggered">Alert Triggered</option>
          <option value="alert.deduplicated">Alert Deduplicated</option>
          <option value="alert.acknowledged">Alert Acknowledged</option>
        </select>
      </div>

      {/* Log table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {total} event{total !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No audit events found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 pr-4 font-medium">Timestamp</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Actor</th>
                    <th className="pb-2 font-medium hidden md:table-cell">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {formatTimestamp(log.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          className={actionColors[log.action] ?? ""}
                          variant="outline"
                        >
                          {actionLabels[log.action] ?? log.action}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-foreground hidden sm:table-cell text-xs">
                        {log.actor}
                      </td>
                      <td className="py-3 text-muted-foreground hidden md:table-cell text-xs font-mono">
                        {formatTarget(log.target)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
