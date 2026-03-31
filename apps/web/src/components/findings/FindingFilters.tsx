"use client";

import type { FindingSeverity, FindingStatus, Provider } from "@/types/domain";

/**
 * WHY: Filter bar lets admins triage by severity/status/provider.
 * Uses native <select> styled to match our dark theme — no external
 * select library needed, keeps the bundle small.
 * Ref: 06-design-demo.md — "[All Severity ▼] [All Providers ▼] [Open ▼]"
 */

interface FindingFiltersProps {
  severity: "" | FindingSeverity;
  provider: "" | Provider;
  status: "" | FindingStatus;
  onSeverityChange: (v: "" | FindingSeverity) => void;
  onProviderChange: (v: "" | Provider) => void;
  onStatusChange: (v: "" | FindingStatus) => void;
}

const isSeverity = (value: string): value is FindingSeverity =>
  value === "critical" || value === "high" || value === "medium" || value === "low";

const isProvider = (value: string): value is Provider =>
  value === "slack" || value === "github";

const isStatus = (value: string): value is FindingStatus =>
  value === "open" ||
  value === "pending_approval" ||
  value === "remediated" ||
  value === "ignored";

const selectClass =
  "h-9 rounded-md border border-border bg-card text-sm text-foreground px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary";

export function FindingFilters({
  severity,
  provider,
  status,
  onSeverityChange,
  onProviderChange,
  onStatusChange,
}: FindingFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        className={selectClass}
        value={severity}
        onChange={(e) => {
          const value = e.target.value;
          onSeverityChange(value === "" || isSeverity(value) ? value : "");
        }}
        aria-label="Filter by severity"
      >
        <option value="">All Severity</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>

      <select
        className={selectClass}
        value={provider}
        onChange={(e) => {
          const value = e.target.value;
          onProviderChange(value === "" || isProvider(value) ? value : "");
        }}
        aria-label="Filter by provider"
      >
        <option value="">All Providers</option>
        <option value="slack">Slack</option>
        <option value="github">GitHub</option>
      </select>

      <select
        className={selectClass}
        value={status}
        onChange={(e) => {
          const value = e.target.value;
          onStatusChange(value === "" || isStatus(value) ? value : "");
        }}
        aria-label="Filter by status"
      >
        <option value="">All Status</option>
        <option value="open">Open</option>
        <option value="pending_approval">Pending Approval</option>
        <option value="remediated">Remediated</option>
        <option value="ignored">Ignored</option>
      </select>
    </div>
  );
}
