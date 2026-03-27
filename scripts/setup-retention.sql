-- VaultGuard AI — Data Retention Policy
-- Run this in your Supabase SQL Editor after setup-database.sql.
-- This script is idempotent — safe to run multiple times.
--
-- WHY: Without retention, audit_logs and scan data grow unbounded.
-- Retention periods balance compliance needs with storage costs:
--   audit_logs:   90 days (SOC 2 / ISO 27001 typically require 90+ days)
--   scans:        30 days (historical scan results are low-value after 30 days)
--   findings:     Retained while open; cleaned up 30 days after remediation/ignore
--
-- For long-term archival, export to cold storage before cleanup.

-- Function: Delete audit logs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Delete completed/failed scans older than 30 days
-- WHY: CASCADE deletes findings tied to old scans, but only if the
-- findings are already resolved (remediated or ignored).
CREATE OR REPLACE FUNCTION cleanup_old_scans()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- First, clean up resolved findings from old scans
  DELETE FROM findings
  WHERE scan_id IN (
    SELECT id FROM scans
    WHERE completed_at < NOW() - INTERVAL '30 days'
      AND status IN ('completed', 'failed')
  )
  AND status IN ('remediated', 'ignored');

  -- Then clean up scans that have no remaining open findings
  DELETE FROM scans
  WHERE completed_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed')
    AND NOT EXISTS (
      SELECT 1 FROM findings
      WHERE findings.scan_id = scans.id
        AND findings.status IN ('open', 'pending_approval')
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule with pg_cron (available in Supabase Pro plan)
-- Uncomment these lines if pg_cron is enabled:
--
-- SELECT cron.schedule(
--   'cleanup-audit-logs',
--   '0 3 * * *',  -- Daily at 3:00 AM UTC
--   $$ SELECT cleanup_old_audit_logs(); $$
-- );
--
-- SELECT cron.schedule(
--   'cleanup-old-scans',
--   '0 4 * * *',  -- Daily at 4:00 AM UTC
--   $$ SELECT cleanup_old_scans(); $$
-- );
