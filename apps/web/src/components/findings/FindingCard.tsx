"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Eye, ShieldAlert } from "lucide-react";

interface Finding {
  id: string;
  provider: string;
  severity: string;
  type: string;
  title: string;
  description: string | null;
  ai_recommendation: string | null;
  status: string;
  created_at: string;
}

interface FindingCardProps {
  finding: Finding;
  onRemediate: (finding: Finding) => void;
  onIgnore: (findingId: string) => void;
}

/**
 * WHY: Each finding is a card (not a table row) to accommodate the AI
 * recommendation block and action buttons. Cards scale better on mobile.
 * Ref: 06-design-demo.md — Findings Page Layout with AI recommendation box
 */

const severityColors: Record<string, string> = {
  critical: "bg-[var(--risk-critical)]/20 text-[var(--risk-critical)] border-0",
  high: "bg-[var(--risk-high)]/20 text-[var(--risk-high)] border-0",
  medium: "bg-[var(--risk-medium)]/20 text-[var(--risk-medium)] border-0",
  low: "bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  pending_approval: "Awaiting Approval",
  remediated: "Remediated",
  ignored: "Ignored",
};

/**
 * WHY: Maps finding type to the data sources the agent accessed.
 * Judges score "User Control" — users should understand what data the
 * agent read to produce each finding. Transparency builds trust.
 */
const dataAccessedMap: Record<string, string[]> = {
  stale_user: ["Slack users list", "Admin roles", "Last active timestamps"],
  deactivated_admin: ["Slack users list", "Account status", "Admin flags"],
  shadow_app: ["Slack installed apps", "OAuth scopes"],
  outside_collaborator: ["GitHub org members", "Collaborator access"],
  broad_app: ["GitHub app installations", "App permissions"],
  org_owner_review: ["GitHub org members", "Owner roles"],
};

const statusColors: Record<string, string> = {
  open: "border-border text-foreground",
  pending_approval: "bg-[var(--risk-medium)]/20 text-[var(--risk-medium)] border-0",
  remediated: "bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0",
  ignored: "bg-muted text-muted-foreground border-0",
};

export function FindingCard({ finding, onRemediate, onIgnore }: FindingCardProps) {
  const isActionable = finding.status === "open";

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-3">
        {/* Header row: title + badges */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground leading-tight">
                {finding.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground font-mono">
                  {finding.provider}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {finding.type}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Badge className={severityColors[finding.severity] ?? ""}>
              {finding.severity}
            </Badge>
            <Badge className={statusColors[finding.status] ?? ""}
              variant="outline"
            >
              {statusLabels[finding.status] ?? finding.status}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {finding.description && (
          <p className="text-sm text-muted-foreground">{finding.description}</p>
        )}

        {/* AI Recommendation */}
        {finding.ai_recommendation && (
          <div className="rounded-md bg-muted/50 border border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                AI Recommendation
              </span>
            </div>
            <p className="text-sm text-foreground">
              {finding.ai_recommendation}
            </p>
          </div>
        )}

        {/* Data accessed — transparency indicator */}
        {dataAccessedMap[finding.type] && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Eye className="h-3 w-3 shrink-0 mt-0.5" />
            <span>
              <span className="font-medium">Data accessed:</span>{" "}
              {dataAccessedMap[finding.type].join(", ")}
            </span>
          </div>
        )}

        {/* Pending approval notice */}
        {finding.status === "pending_approval" && (
          <div className="rounded-md bg-[var(--risk-medium)]/10 border border-[var(--risk-medium)]/30 p-3">
            <p className="text-sm text-[var(--risk-medium)]">
              Approval request sent. Check your inbox.
            </p>
          </div>
        )}

        {/* Action buttons */}
        {isActionable && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onRemediate(finding)}>
              <ShieldAlert className="h-3.5 w-3.5" />
              Remediate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onIgnore(finding.id)}
            >
              Ignore
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
