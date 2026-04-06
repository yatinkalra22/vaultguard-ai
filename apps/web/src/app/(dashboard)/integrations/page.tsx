"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { IntegrationItem } from "@/types/domain";

/**
 * WHY: Token Vault architecture means OAuth tokens are stored by Auth0,
 * not in our database. This page manages the *connection* state only —
 * the actual credentials live in Auth0 Token Vault.
 * Ref: 01-architecture.md — "Slack refresh token stored in Auth0 Token Vault (never touches our DB)"
 */

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const timeoutId = window.setTimeout(() => {
      setLoadError("Loading integrations took too long. Please retry.");
      setLoading(false);
    }, 12000);

    try {
      const data = await api.get<IntegrationItem[]>("integrations");
      window.clearTimeout(timeoutId);
      setIntegrations(data);
    } catch {
      window.clearTimeout(timeoutId);
      setIntegrations([]);
      setLoadError("Could not load integration status. You can still retry below.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const slackIntegration =
    integrations.find((i) => i.provider === "slack") ?? null;
  const githubIntegration =
    integrations.find((i) => i.provider === "github") ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect your tools. VaultGuard uses Auth0 Token Vault to securely
          store OAuth tokens — your credentials never touch our servers.
        </p>
      </div>

      {/* Integration cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : (
        <>
          {loadError && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <span className="text-amber-200">{loadError}</span>
              <Button size="sm" variant="outline" onClick={fetchIntegrations}>
                Retry
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IntegrationCard
              provider="slack"
              integration={slackIntegration}
              onUpdate={fetchIntegrations}
            />
            <IntegrationCard
              provider="github"
              integration={githubIntegration}
              onUpdate={fetchIntegrations}
            />
          </div>
        </>
      )}
    </div>
  );
}
