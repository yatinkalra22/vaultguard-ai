"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { FindingCard } from "@/components/findings/FindingCard";
import { FindingFilters } from "@/components/findings/FindingFilters";
import { RemediateDialog } from "@/components/findings/RemediateDialog";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [remediating, setRemediating] = useState<Finding | null>(null);

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (severity) params.severity = severity;
      if (provider) params.provider = provider;
      if (status) params.status = status;
      const data = await api.get<Finding[]>("findings", params);
      setFindings(data);
    } catch {
      setFindings([]);
    } finally {
      setLoading(false);
    }
  }, [severity, provider, status]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  async function handleIgnore(findingId: string) {
    try {
      await api.patch(`findings/${findingId}/ignore`);
      // WHY: Optimistic update — remove from list immediately for snappy UX.
      setFindings((prev) => prev.filter((f) => f.id !== findingId));
    } catch {
      // Refetch on failure to restore correct state
      fetchFindings();
    }
  }

  function handleRemediateSuccess() {
    setRemediating(null);
    fetchFindings();
  }

  const openCount = findings.filter((f) => f.status === "open").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Security Findings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {openCount} open issue{openCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <FindingFilters
        severity={severity}
        provider={provider}
        status={status}
        onSeverityChange={setSeverity}
        onProviderChange={setProvider}
        onStatusChange={setStatus}
      />

      {/* Finding cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : findings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No findings match your filters. Run a scan to detect access anomalies.
        </p>
      ) : (
        <div className="space-y-4">
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onRemediate={setRemediating}
              onIgnore={handleIgnore}
            />
          ))}
        </div>
      )}

      {/* Remediation confirmation dialog */}
      {remediating && (
        <RemediateDialog
          finding={remediating}
          onClose={() => setRemediating(null)}
          onSuccess={handleRemediateSuccess}
        />
      )}
    </div>
  );
}
