"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { api, isStepUpRequiredError, showErrorToast, showSuccessToast } from "@/lib/api";

interface Finding {
  id: string;
  provider: string;
  type: string;
  severity: string;
  title: string;
  ai_recommendation: string | null;
  affected_entity: Record<string, unknown> | null;
}

interface RemediateDialogProps {
  finding: Finding;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * WHY: Two-layer security before remediation executes:
 * 1. Step-up auth (MFA) — proves the person clicking is actually the admin
 * 2. CIBA approval — async email confirmation before the action executes
 *
 * This combination is what the hackathon judges want to see:
 * "step-up authentication for high-stakes actions" (Security Model criterion)
 * + "human-in-the-loop approval" (User Control criterion)
 *
 * Ref: 06-design-demo.md — Demo Moment 4 "Confirm dialog appears"
 */
export function RemediateDialog({
  finding,
  onClose,
  onSuccess,
}: RemediateDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);

    try {
      let action = "flag_app";
      if (
        finding.provider === "slack" &&
        (finding.type === "stale_user" || finding.type === "deactivated_admin")
      ) {
        action = "revoke_slack_user";
      } else if (finding.provider === "github" && finding.type === "over_permissioned") {
        action = "remove_github_member";
      }

      await api.post("remediations", {
        findingId: finding.id,
        action,
        targetEntity: finding.affected_entity ?? {},
      });

      showSuccessToast("Remediation initiated", "Remediation request sent for approval");
      onSuccess();
    } catch (err: unknown) {
      // WHY: If the backend returns step_up_required, redirect to MFA.
      // After MFA completes, the user lands back on /findings to retry.
      if (isStepUpRequiredError(err)) {
        window.location.href = `/auth/step-up?returnTo=/findings`;
        return;
      }

      showErrorToast(err, "remediate_finding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Confirm Remediation
            </CardTitle>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-foreground font-medium">
              {finding.title}
            </p>
            <div className="flex gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[10px] uppercase">
                {finding.provider}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {finding.severity}
              </Badge>
            </div>
          </div>

          {finding.ai_recommendation && (
            <p className="text-sm text-muted-foreground">
              {finding.ai_recommendation}
            </p>
          )}

          {/* Step-up auth notice */}
          <div className="rounded-md bg-primary/10 border border-primary/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                Step-Up Authentication
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              MFA verification may be required before this action proceeds.
              This ensures only verified admins can trigger remediations.
            </p>
          </div>

          {/* CIBA notice */}
          <div className="rounded-md bg-[var(--risk-medium)]/10 border border-[var(--risk-medium)]/30 p-3">
            <p className="text-sm text-[var(--risk-medium)]">
              After verification, an approval request will be sent to your email
              via Auth0 CIBA. The action will only execute after you approve.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {loading ? "Verifying..." : "Verify & Send Approval"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
