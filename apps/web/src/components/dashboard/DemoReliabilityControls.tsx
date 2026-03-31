"use client";

import { useState } from "react";
import { api, showErrorToast, showSuccessToast } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Beaker, RotateCcw, WandSparkles } from "lucide-react";

export function DemoReliabilityControls() {
  const [loading, setLoading] = useState<"seed" | "reset" | null>(null);

  async function seed() {
    setLoading("seed");
    try {
      await api.post("dashboard/demo-seed");
      showSuccessToast("Demo data seeded", "demo_seeded");
      window.dispatchEvent(new CustomEvent("custom:alertSettingsUpdated"));
    } catch (err) {
      showErrorToast(err, "demo_seed");
    } finally {
      setLoading(null);
    }
  }

  async function reset() {
    setLoading("reset");
    try {
      await api.post("dashboard/demo-reset");
      showSuccessToast("Demo data reset", "demo_reset");
      window.dispatchEvent(new CustomEvent("custom:alertSettingsUpdated"));
    } catch (err) {
      showErrorToast(err, "demo_reset");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button variant="outline" onClick={seed} disabled={loading !== null}>
        <WandSparkles className="h-4 w-4" />
        {loading === "seed" ? "Seeding..." : "Seed Demo Data"}
      </Button>
      <Button variant="ghost" onClick={reset} disabled={loading !== null}>
        <RotateCcw className="h-4 w-4" />
        {loading === "reset" ? "Resetting..." : "Reset Demo Data"}
      </Button>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Beaker className="h-3.5 w-3.5" />
        Reliable demo mode
      </div>
    </div>
  );
}
