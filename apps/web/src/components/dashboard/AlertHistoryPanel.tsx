"use client";

import { useCallback, useEffect, useState } from "react";
import { api, showErrorToast, showSuccessToast } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2 } from "lucide-react";

type AlertIncident = {
  id: string;
  reason: string;
  status: "open" | "acknowledged";
  currentRiskScore: number;
  criticalFindings: number;
  duplicateCount: number;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
};

function formatReason(reason: string): string {
  if (reason === "risk_threshold_exceeded") return "Risk Threshold Exceeded";
  if (reason === "critical_findings_threshold_exceeded") {
    return "Critical Findings Threshold Exceeded";
  }
  return reason;
}

export function AlertHistoryPanel() {
  const [incidents, setIncidents] = useState<AlertIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await api.get<AlertIncident[]>("alerts/history");
      setIncidents(data);
    } catch (err: unknown) {
      showErrorToast(err, "load_alert_history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();

    const onRefresh = () => {
      fetchHistory();
    };

    window.addEventListener("custom:alertSettingsUpdated", onRefresh);
    const interval = setInterval(fetchHistory, 10000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("custom:alertSettingsUpdated", onRefresh);
    };
  }, [fetchHistory]);

  async function acknowledge(id: string) {
    try {
      await api.patch(`alerts/history/${id}/acknowledge`);
      showSuccessToast("Alert acknowledged", "alert_acknowledged");
      await fetchHistory();
    } catch (err: unknown) {
      showErrorToast(err, "acknowledge_alert");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alert History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading alert history...</p>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alert incidents yet.</p>
        ) : (
          <div className="space-y-3">
            {incidents.slice(0, 6).map((incident) => (
              <div
                key={incident.id}
                className="flex flex-col gap-2 rounded-md border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{formatReason(incident.reason)}</p>
                  <Badge
                    variant={incident.status === "open" ? "destructive" : "secondary"}
                  >
                    {incident.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Risk {incident.currentRiskScore}</span>
                  <span>Critical {incident.criticalFindings}</span>
                  <span>Occurrences {incident.duplicateCount}</span>
                  <span>{new Date(incident.updatedAt).toLocaleString()}</span>
                </div>

                {incident.status === "open" ? (
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledge(incident.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Acknowledge
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Acknowledged by {incident.acknowledgedBy ?? "unknown"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
