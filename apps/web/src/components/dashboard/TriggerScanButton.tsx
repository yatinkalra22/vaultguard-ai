"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";

/**
 * WHY: Manual scan trigger is the first demo action — "click Run Scan Now,
 * watch findings appear live." It's the hook that makes the demo compelling.
 * Ref: 06-design-demo.md — Demo Moment 2 "Click Run Scan Now button"
 */
export function TriggerScanButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTrigger() {
    setLoading(true);
    setError(null);

    try {
      await api.post("scans/trigger");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to run scan right now. Please try again."));
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
      {error && (
        <span className="text-xs text-[var(--risk-critical)]">{error}</span>
      )}
    </div>
  );
}
