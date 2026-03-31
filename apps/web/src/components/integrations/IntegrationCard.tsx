"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { api, showErrorToast } from "@/lib/api";
import type { IntegrationItem, Provider } from "@/types/domain";

interface IntegrationCardProps {
  provider: Provider;
  integration: IntegrationItem | null;
  onUpdate: () => void;
}

/**
 * WHY: Each provider gets its own card showing connection status, scopes,
 * and connect/disconnect actions. The OAuth flow goes through Auth0
 * Connected Accounts, not our backend — Token Vault stores the tokens.
 * Ref: 06-design-demo.md — Integrations Page Layout
 * Ref: 01-architecture.md — "Admin clicks Connect Slack → Auth0 Connected Accounts OAuth flow"
 */

const providerConfig = {
  slack: {
    name: "Slack",
    icon: "S",
    iconBg: "bg-[#4A154B]",
    description: "Scans workspace members, apps, and permissions",
    scopes: [
      "admin.users:read",
      "admin.apps:read",
      "channels:read",
      "team:read",
      "users:read",
      "users:read.email",
    ],
  },
  github: {
    name: "GitHub",
    icon: "G",
    iconBg: "bg-[#24292e]",
    description: "Scans org members, collaborators, and app installations",
    scopes: [
      "read:org",
      "read:user",
      "repo",
      "read:audit_log",
      "admin:org",
    ],
  },
};

export function IntegrationCard({
  provider,
  integration,
  onUpdate,
}: IntegrationCardProps) {
  const [loading, setLoading] = useState(false);
  const config = providerConfig[provider];
  const isConnected = integration?.status === "active";

  async function handleConnect() {
    setLoading(true);
    try {
      // WHY: The backend returns a redirect URL to Auth0 Connected Accounts.
      // The actual OAuth consent happens on Auth0's domain — tokens go
      // straight to Token Vault, never through our frontend.
      const { url } = await api.post<{ url: string }>(
        `integrations/${provider}/connect`,
      );
      window.location.href = url;
    } catch (err: unknown) {
      showErrorToast(err, `${provider}_connect`);
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!integration) return;
    setLoading(true);
    try {
      await api.del(`integrations/${integration.id}`);
      onUpdate();
    } catch (err: unknown) {
      showErrorToast(err, `${provider}_disconnect`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-lg ${config.iconBg} flex items-center justify-center text-white font-bold text-lg`}
            >
              {config.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{config.name}</h3>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          <Badge
            className={
              isConnected
                ? "bg-[var(--risk-low)]/20 text-[var(--risk-low)] border-0"
                : "bg-muted text-muted-foreground border-0"
            }
          >
            {isConnected ? "Connected" : "Not connected"}
          </Badge>
        </div>

        {/* Last scan */}
        {isConnected && integration?.last_scan_at && (
          <p className="text-xs text-muted-foreground">
            Last scanned:{" "}
            {new Date(integration.last_scan_at).toLocaleString()}
          </p>
        )}

        {/* Scopes */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Required scopes:
          </p>
          <div className="flex flex-wrap gap-1">
            {config.scopes.map((scope) => (
              <span
                key={scope}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {isConnected ? (
            <>
              <Button size="sm" variant="outline" onClick={handleConnect} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                Reconnect
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisconnect}
                disabled={loading}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={loading}>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Connect {config.name}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
