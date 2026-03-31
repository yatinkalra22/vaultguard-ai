"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { api, showErrorToast, showSuccessToast } from "@/lib/api";
import { triggerMetricsRefresh } from "@/hooks/useMetrics";

/**
 * WHY: Manual scan trigger is the first demo action — "click Run Scan Now,
 * watch findings appear live." It's the hook that makes the demo compelling.
 * Ref: 06-design-demo.md — Demo Moment 2 "Click Run Scan Now button"
 */
export function TriggerScanButton() {
  const [loading, setLoading] = useState(false);

  async function handleTrigger() {
    setLoading(true);

    try {
      await api.post("scans/trigger");
      showSuccessToast("Scan started", "Scanning your connected SaaS tools...");
      triggerMetricsRefresh();
    } catch (err: unknown) {
      showErrorToast(err, "trigger_scan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleTrigger} disabled={loading} size="sm">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {loading ? "Scanning..." : "Run Scan Now"}
      </Button>
    </div>
  );
}
