-- VaultGuard AI — Database Schema
-- Run this in your Supabase SQL Editor (or any PostgreSQL instance)
-- This script is idempotent — safe to run multiple times.

-- Organizations using VaultGuard
CREATE TABLE IF NOT EXISTS organizations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  auth0_org_id TEXT UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations connected per org
CREATE TABLE IF NOT EXISTS integrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL CHECK (provider IN ('slack', 'github')),
  connected_at TIMESTAMPTZ,
  last_scan_at TIMESTAMPTZ,
  status       TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected'))
);

-- Individual scan runs
CREATE TABLE IF NOT EXISTS scans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL,
  started_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  findings_count INT DEFAULT 0,
  status         TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- Security findings from scans
CREATE TABLE IF NOT EXISTS findings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id           UUID REFERENCES scans(id) ON DELETE CASCADE,
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL CHECK (provider IN ('slack', 'github')),
  severity          TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  affected_entity   JSONB,
  ai_recommendation TEXT,
  status            TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending_approval', 'remediated', 'ignored')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- CIBA-based remediation requests
CREATE TABLE IF NOT EXISTS remediations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id       UUID REFERENCES findings(id) ON DELETE CASCADE,
  org_id           UUID REFERENCES organizations(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,
  target_entity    JSONB,
  ciba_auth_req_id TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
  requested_by     TEXT,
  approved_by      TEXT,
  requested_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);

-- Full audit trail (append-only by convention)
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     JSONB,
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert threshold configuration (one row per org)
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

-- Alert incident history (dedup + acknowledge lifecycle)
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

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_findings_org_status ON findings(org_id, status);
CREATE INDEX IF NOT EXISTS idx_findings_scan ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_scans_org ON scans(org_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_remediations_finding ON remediations(finding_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_alert_incidents_org ON alert_incidents(org_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_incidents_open_reason ON alert_incidents(org_id, reason, status);

-- Row Level Security
-- WHY: RLS ensures that even if the anon key is leaked, data is scoped per org.
-- The backend uses service_role key which bypasses RLS, but this protects
-- against direct Supabase REST API access.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_incidents ENABLE ROW LEVEL SECURITY;
