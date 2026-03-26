"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, X } from "lucide-react";
import { api } from "@/lib/api";

interface Finding {
  id: string;
  provider: string;
  severity: string;
  title: string;
  ai_recommendation: string | null;
}

interface RemediateDialogProps {
  finding: Finding;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * WHY: Confirmation dialog before CIBA — this is the human-in-the-loop moment.
 * The admin sees exactly what will happen before triggering the approval email.
 * Ref: 06-design-demo.md — Demo Moment 4 "Confirm dialog appears"
 */
export function RemediateDialog({
  finding,
  onClose,
  onSuccess,
}: RemediateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      // WHY: Maps finding type to remediation action.
      // The backend CIBA service will send the approval email.
      const actionMap: Record<string, string> = {
        stale_user: "revoke_access",
        deactivated_admin: "revoke_access",
        shadow_app: "disable_app",
        outside_collaborator: "revoke_access",
        broad_app: "disable_app",
        org_owner_review: "downgrade_role",
      };

      await api.post("remediations", {
        findingId: finding.id,
        action: actionMap[finding.provider] ?? "revoke_access",
      });

      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to initiate remediation";
      setError(message);
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

          <div className="rounded-md bg-[var(--risk-medium)]/10 border border-[var(--risk-medium)]/30 p-3">
            <p className="text-sm text-[var(--risk-medium)]">
              An approval request will be sent to your email via Auth0 CIBA.
              The action will only execute after you approve.
            </p>
          </div>

          {error && (
            <p className="text-sm text-[var(--risk-critical)]">{error}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              {loading ? "Sending..." : "Send Approval Request"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
