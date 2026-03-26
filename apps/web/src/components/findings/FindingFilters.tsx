"use client";

/**
 * WHY: Filter bar lets admins triage by severity/status/provider.
 * Uses native <select> styled to match our dark theme — no external
 * select library needed, keeps the bundle small.
 * Ref: 06-design-demo.md — "[All Severity ▼] [All Providers ▼] [Open ▼]"
 */

interface FindingFiltersProps {
  severity: string;
  provider: string;
  status: string;
  onSeverityChange: (v: string) => void;
  onProviderChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}

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
        onChange={(e) => onSeverityChange(e.target.value)}
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
        onChange={(e) => onProviderChange(e.target.value)}
        aria-label="Filter by provider"
      >
        <option value="">All Providers</option>
        <option value="slack">Slack</option>
        <option value="github">GitHub</option>
      </select>

      <select
        className={selectClass}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
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
