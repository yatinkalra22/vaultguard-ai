"use client";

import { useEffect, useState } from "react";
import { api, showErrorToast, showSuccessToast } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Clock, Shield, ExternalLink, Bell, Save } from "lucide-react";

type AlertSettings = {
  enabled: boolean;
  riskThreshold: number;
  criticalFindingsThreshold: number;
  scanCooldownMinutes: number;
  slackAlertsEnabled: boolean;
};

/**
 * WHY: Settings page shows org profile and scan configuration.
 * Most settings are managed in Auth0 Dashboard (Token Vault, FGA, CIBA),
 * so this page is informational + links to Auth0 rather than duplicating config.
 * Ref: 01-architecture.md — Auth0 is the control plane for auth settings
 */

export default function SettingsPage() {
  const [alerts, setAlerts] = useState<AlertSettings>({
    enabled: true,
    riskThreshold: 60,
    criticalFindingsThreshold: 10,
    scanCooldownMinutes: 30,
    slackAlertsEnabled: false,
  });
  const [saving, setSaving] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    api
      .get<AlertSettings>("alerts/settings")
      .then((data) => {
        if (data) setAlerts(data);
      })
      .catch((err) => showErrorToast(err, "load_alert_settings"))
      .finally(() => setLoadingAlerts(false));
  }, []);

  async function saveAlerts() {
    setSaving(true);
    try {
      const data = await api.patch<AlertSettings>("alerts/settings", alerts);
      setAlerts(data);
      showSuccessToast("Alert settings saved", "thresholds_updated");
      window.dispatchEvent(new CustomEvent("custom:alertSettingsUpdated"));
    } catch (err) {
      showErrorToast(err, "save_alert_settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Organization profile and scan configuration.
        </p>
      </div>

      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </CardTitle>
          <CardDescription>
            Your organization details from Auth0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">
                Organization Name
              </label>
              <p className="text-sm text-foreground mt-0.5 font-medium">
                Configured in Auth0
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Plan</label>
              <div className="mt-0.5">
                <Badge variant="secondary">Free Tier</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts & Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts & Thresholds
          </CardTitle>
          <CardDescription>
            Configure automatic alerting and risk-based scan triggers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loadingAlerts ? (
            <p className="text-sm text-muted-foreground">Loading alert settings...</p>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Enable Automated Alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Trigger alerts and optional auto-scan when thresholds are exceeded.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={alerts.enabled}
                  onChange={(e) =>
                    setAlerts((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Risk Score Threshold ({alerts.riskThreshold})
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={alerts.riskThreshold}
                    onChange={(e) =>
                      setAlerts((prev) => ({
                        ...prev,
                        riskThreshold: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-trigger scan when risk score is at or above this value.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Critical Findings Threshold ({alerts.criticalFindingsThreshold})
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={alerts.criticalFindingsThreshold}
                    onChange={(e) =>
                      setAlerts((prev) => ({
                        ...prev,
                        criticalFindingsThreshold: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when critical findings count reaches this threshold.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Auto-Scan Cooldown (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={alerts.scanCooldownMinutes}
                    onChange={(e) =>
                      setAlerts((prev) => ({
                        ...prev,
                        scanCooldownMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3 self-end">
                  <div>
                    <p className="text-sm font-medium">Slack Alert Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Send threshold alerts to your connected Slack workspace.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={alerts.slackAlertsEnabled}
                    onChange={(e) =>
                      setAlerts((prev) => ({
                        ...prev,
                        slackAlertsEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Risk {alerts.riskThreshold}+</Badge>
                  <Badge variant="outline">Critical {alerts.criticalFindingsThreshold}+</Badge>
                  <Badge variant="outline">Cooldown {alerts.scanCooldownMinutes}m</Badge>
                </div>
                <button
                  onClick={saveAlerts}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Alert Settings"}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Scan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scan Schedule
          </CardTitle>
          <CardDescription>
            Automated scanning runs daily. Manual scans can be triggered from
            the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">
                Auto-Scan Frequency
              </label>
              <p className="text-sm text-foreground mt-0.5 font-medium">
                Daily at midnight UTC
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Scan Providers
              </label>
              <div className="flex gap-1.5 mt-0.5">
                <Badge variant="outline">Slack</Badge>
                <Badge variant="outline">GitHub</Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-xs text-muted-foreground">
              Stale User Threshold
            </label>
            <p className="text-sm text-foreground mt-0.5 font-medium">
              30 days of inactivity
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Users with admin privileges inactive beyond this threshold are
              flagged. Based on NIST SP 800-53 AC-2(3).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security & Auth0 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>
            Authentication, authorization, and token management are handled by
            Auth0.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingRow
            label="Authentication"
            value="Auth0 Universal Login"
            description="SSO-capable login with MFA support"
          />
          <Separator />
          <SettingRow
            label="Token Storage"
            value="Auth0 Token Vault"
            description="OAuth refresh tokens never touch our database"
          />
          <Separator />
          <SettingRow
            label="Remediation Approval"
            value="Auth0 CIBA"
            description="Email-based human-in-the-loop approval before any action"
          />
          <Separator />
          <SettingRow
            label="Authorization Model"
            value="Auth0 FGA"
            description="Only org admins can approve critical remediations"
          />
          <Separator />
          <div className="pt-1">
            <a
              href="https://manage.auth0.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Manage in Auth0 Dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
      <div>
        <p className="text-sm text-foreground font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 self-start">
        {value}
      </Badge>
    </div>
  );
}
