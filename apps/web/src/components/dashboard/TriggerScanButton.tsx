"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { api, showErrorToast, showSuccessToast } from "@/lib/api";
import { triggerMetricsRefresh } from "@/hooks/useMetrics";

interface TriggerScanButtonProps {
  // WHY: Button must be aware of integration state so it doesn't fire a scan
  // against nothing. When no integrations are connected the scan pipeline
  // fetches zero data and produces zero findings — misleading to the user.
  hasIntegrations: boolean;
  // isLoading = initial dashboard data is still being fetched, so we don't
  // know the integration count yet. Keep the button disabled during this time.
  isLoading?: boolean;
}

export function TriggerScanButton({
  hasIntegrations,
  isLoading = false,
}: TriggerScanButtonProps) {
  const [scanning, setScanning] = useState(false);

  async function handleTrigger() {
    setScanning(true);
    try {
      await api.post("scans/trigger");
      showSuccessToast("Scan started", "Scanning your connected SaaS tools...");
      triggerMetricsRefresh();
    } catch (err: unknown) {
      showErrorToast(err, "trigger_scan");
    } finally {
      setScanning(false);
    }
  }

  const isDisabled = scanning || isLoading || !hasIntegrations;

  const button = (
    <Button
      onClick={handleTrigger}
      disabled={isDisabled}
      size="sm"
    >
      {scanning ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      {scanning ? "Scanning..." : "Run Scan Now"}
    </Button>
  );

  // WHY: Disabled buttons don't fire mouse events so a CSS tooltip won't show.
  // Wrapping in a <span> with a native title restores the hover hint without
  // needing a third-party tooltip component.
  if (!isLoading && !hasIntegrations) {
    return (
      <span
        className="cursor-not-allowed"
        title="Connect Slack or GitHub first to run a scan"
      >
        {button}
      </span>
    );
  }

  return button;
}
