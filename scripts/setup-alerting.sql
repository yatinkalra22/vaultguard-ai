-- VaultGuard AI — Alerting Schema Migration
-- Run after setup-database.sql when upgrading an existing environment.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS alert_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  enabled                     BOOLEAN DEFAULT TRUE,
  risk_threshold              INT NOT NULL DEFAULT 60 CHECK (risk_threshold BETWEEN 0 AND 100),
  critical_findings_threshold INT NOT NULL DEFAULT 10 CHECK (critical_findings_threshold >= 0),
  scan_cooldown_minutes       INT NOT NULL DEFAULT 30 CHECK (scan_cooldown_minutes BETWEEN 1 AND 1440),
  slack_alerts_enabled        BOOLEAN DEFAULT FALSE,
  alert_channel               TEXT DEFAULT '#general',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_incidents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID REFERENCES organizations(id) ON DELETE CASCADE,
  reason             TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged')),
  current_risk_score INT NOT NULL DEFAULT 0,
  critical_findings  INT NOT NULL DEFAULT 0,
  duplicate_count    INT NOT NULL DEFAULT 1,
  acknowledged_at    TIMESTAMPTZ,
  acknowledged_by    TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_incidents_org ON alert_incidents(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_incidents_open_reason ON alert_incidents(org_id, reason, status);

ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_incidents ENABLE ROW LEVEL SECURITY;
