"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * WHY: Token Vault architecture means OAuth tokens are stored by Auth0,
 * not in our database. This page manages the *connection* state only —
 * the actual credentials live in Auth0 Token Vault.
 * Ref: 01-architecture.md — "Slack refresh token stored in Auth0 Token Vault (never touches our DB)"
 */

interface Integration {
  id: string;
  provider: string;
  status: string;
  connected_at: string | null;
  last_scan_at: string | null;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = useCallback(async () => {
    try {
      const data = await api.get<Integration[]>("integrations");
      setIntegrations(data);
    } catch {
      setIntegrations([]);
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
      )}
    </div>
  );
}
