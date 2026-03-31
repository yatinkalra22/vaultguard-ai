-- VaultGuard AI — Seed Data for Local Development
-- Run after setup-database.sql to populate dummy data for testing.

-- Insert a test organization
INSERT INTO organizations (id, name, auth0_org_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'org_test123')
ON CONFLICT (auth0_org_id) DO NOTHING;

-- Insert connected integrations
INSERT INTO integrations (org_id, provider, connected_at, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'slack', NOW() - INTERVAL '7 days', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'github', NOW() - INTERVAL '5 days', 'active')
ON CONFLICT DO NOTHING;

-- Insert a completed scan
INSERT INTO scans (id, org_id, provider, started_at, completed_at, findings_count, status)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'all',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours' + INTERVAL '45 seconds',
  5,
  'completed'
)
ON CONFLICT DO NOTHING;

-- Insert sample findings
INSERT INTO findings (scan_id, org_id, provider, severity, type, title, description, affected_entity, ai_recommendation, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'slack', 'critical', 'deactivated_admin',
    'Deactivated admin retains admin flag: john.doe',
    'User is deactivated but still has admin: true in Slack. This can allow re-activation with admin rights.',
    '{"id": "U001", "name": "John Doe", "email": "john@acme.com"}',
    'Immediately remove admin flag from this deactivated user to prevent privilege escalation on re-activation.',
    'open'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'slack', 'high', 'stale_user',
    'Stale admin: Jane Smith',
    'This user has admin privileges but hasn''t been active in over 30 days. Consider downgrading their role.',
    '{"id": "U002", "name": "Jane Smith", "email": "jane@acme.com", "last_updated": "2026-02-01T00:00:00Z"}',
    'Downgrade Jane''s Slack role to Member to follow least-privilege principle.',
    'open'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'slack', 'high', 'shadow_app',
    'App with broad permissions: DataSync Bot',
    'This app has the following dangerous scopes: admin, files:write. Verify this is necessary.',
    '{"id": "A001", "name": "DataSync Bot", "scopes": ["admin", "files:write", "channels:read"]}',
    'Review DataSync Bot''s permissions and restrict to minimum required scopes.',
    'open'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'github', 'critical', 'shadow_app',
    'GitHub App with org-wide write access: deploy-bot',
    'This GitHub App has write access to ALL repositories in your org. Restrict to specific repos if possible.',
    '{"id": 12345, "app": "deploy-bot", "permissions": {"contents": "write", "metadata": "read"}}',
    'Restrict deploy-bot to only the repositories it needs write access to.',
    'open'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'github', 'high', 'over_permissioned',
    'Outside collaborator: contractor-mike',
    'contractor-mike is an outside collaborator (not an org member) with direct repository access. Verify they still need access.',
    '{"id": 67890, "login": "contractor-mike", "url": "https://github.com/contractor-mike"}',
    'Verify contractor-mike still requires access. If engagement ended, remove from the organization.',
    'open'
  )
ON CONFLICT DO NOTHING;

-- Insert audit log entries
INSERT INTO audit_logs (org_id, actor, action, target, metadata)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@acme.com',
    'integration.connected',
    '{"provider": "slack"}',
    '{"method": "oauth"}'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'admin@acme.com',
    'integration.connected',
    '{"provider": "github"}',
    '{"method": "oauth"}'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'system',
    'scan.completed',
    '{"scan_id": "00000000-0000-0000-0000-000000000010"}',
    '{"findings_count": 5, "risk_score": 72}'
  )
ON CONFLICT DO NOTHING;

-- Insert sample alert settings
INSERT INTO alert_settings (
  org_id,
  enabled,
  risk_threshold,
  critical_findings_threshold,
  scan_cooldown_minutes,
  slack_alerts_enabled,
  alert_channel
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  TRUE,
  60,
  3,
  30,
  FALSE,
  '#general'
)
ON CONFLICT (org_id) DO UPDATE
SET
  enabled = EXCLUDED.enabled,
  risk_threshold = EXCLUDED.risk_threshold,
  critical_findings_threshold = EXCLUDED.critical_findings_threshold,
  scan_cooldown_minutes = EXCLUDED.scan_cooldown_minutes,
  slack_alerts_enabled = EXCLUDED.slack_alerts_enabled,
  alert_channel = EXCLUDED.alert_channel;

-- Insert sample alert incidents
INSERT INTO alert_incidents (
  org_id,
  reason,
  status,
  current_risk_score,
  critical_findings,
  duplicate_count,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'risk_threshold_exceeded',
    'open',
    78,
    2,
    2,
    NOW() - INTERVAL '45 minutes',
    NOW() - INTERVAL '12 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'critical_findings_threshold_exceeded',
    'acknowledged',
    69,
    4,
    1,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '20 hours'
  )
ON CONFLICT DO NOTHING;
