"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Clock, Shield, ExternalLink } from "lucide-react";

/**
 * WHY: Settings page shows org profile and scan configuration.
 * Most settings are managed in Auth0 Dashboard (Token Vault, FGA, CIBA),
 * so this page is informational + links to Auth0 rather than duplicating config.
 * Ref: 01-architecture.md — Auth0 is the control plane for auth settings
 */

export default function SettingsPage() {
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
