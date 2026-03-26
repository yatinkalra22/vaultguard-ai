-- VaultGuard AI — Demo Seed Data
-- Usage: Run in Supabase SQL Editor before demo recording.
-- Creates realistic findings for a compelling 3-minute demo.
--
-- WHY: Pre-seeded data ensures the demo shows a full risk score gauge,
-- mixed severity findings, and audit trail entries without depending on
-- live Slack/GitHub API calls during recording.
-- Ref: 06-design-demo.md — "Pre-seed 2-3 findings in the DB as backup"

-- Ensure we have a demo org
INSERT INTO organizations (id, name, auth0_org_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corp (Demo)', 'org_demo')
ON CONFLICT (id) DO NOTHING;

-- Integrations
INSERT INTO integrations (id, org_id, provider, status, connected_at, last_scan_at)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'slack', 'active', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'github', 'active', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Completed scan
INSERT INTO scans (id, org_id, provider, status, findings_count, started_at, completed_at)
VALUES ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'all', 'completed', 10, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '45 seconds')
ON CONFLICT (id) DO NOTHING;

-- 3 Critical findings
INSERT INTO findings (id, scan_id, org_id, provider, severity, type, title, description, affected_entity, ai_recommendation, status) VALUES
('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'slack', 'critical', 'stale_user',
 'Stale admin: John Doe',
 'This user has admin privileges but has not been active in 47 days.',
 '{"id": "U001", "name": "John Doe", "email": "john.doe@acme.com", "role": "admin", "last_active": "2026-02-07"}',
 'Immediately downgrade John Doe''s Slack role from Admin to Member. He has been inactive for 47 days, well beyond the 30-day NIST SP 800-53 threshold. Admin privileges should follow the principle of least privilege.',
 'open'),

('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'github', 'critical', 'broad_app',
 'GitHub App with org-wide write access: AutoDeploy Bot',
 'This GitHub App has organization-wide write permissions, including admin:org scope.',
 '{"id": 12345, "name": "AutoDeploy Bot", "permissions": {"administration": "write", "contents": "write", "members": "write"}}',
 'Review AutoDeploy Bot permissions immediately. It has write access to all repositories and organization settings. Restrict to only the repositories it needs, or disable if no longer in use.',
 'open'),

('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'slack', 'critical', 'deactivated_admin',
 'Deactivated user with admin flag: Sarah Chen',
 'This user account is deactivated but still has the admin flag set.',
 '{"id": "U002", "name": "Sarah Chen", "email": "sarah.chen@acme.com", "role": "admin", "is_deleted": true}',
 'Revoke Sarah Chen''s admin privileges immediately. Her account is deactivated but the admin flag is still set, creating a potential privilege escalation vector if the account is reactivated.',
 'open')
ON CONFLICT (id) DO NOTHING;

-- 4 High findings
INSERT INTO findings (id, scan_id, org_id, provider, severity, type, title, description, affected_entity, ai_recommendation, status) VALUES
('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'github', 'high', 'outside_collaborator',
 'Outside collaborator on private repo: alex.contractor@gmail.com',
 'An external user has direct access to the private repository acme/internal-api.',
 '{"login": "alexcontractor", "email": "alex.contractor@gmail.com", "repos": ["acme/internal-api"]}',
 'Review whether alex.contractor@gmail.com still needs access to acme/internal-api. Outside collaborators should be periodically audited per CIS GitHub Benchmark 1.3.7.',
 'open'),

('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'slack', 'high', 'shadow_app',
 'Shadow app with broad scopes: DataSync Pro',
 'An unrecognized third-party Slack app has access to channels:read and users:read scopes.',
 '{"id": "A001", "name": "DataSync Pro", "scopes": ["channels:read", "users:read", "files:read"]}',
 'Investigate DataSync Pro — it was not installed through official IT procurement. It can read all channels, user profiles, and files. Disable if not approved by security team.',
 'open'),

('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'github', 'high', 'outside_collaborator',
 'Outside collaborator on private repo: maria.freelancer@outlook.com',
 'An external user has direct access to the private repository acme/billing-service.',
 '{"login": "mariafreelance", "email": "maria.freelancer@outlook.com", "repos": ["acme/billing-service"]}',
 'maria.freelancer@outlook.com has access to the billing service repository. Verify this access is still needed — billing repos contain sensitive financial logic.',
 'open'),

('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'github', 'high', 'org_owner_review',
 'GitHub org owner review: 5 owners detected',
 'Your GitHub organization has 5 users with Owner role. Best practice is to limit to 2-3.',
 '{"owners": ["ceo@acme.com", "cto@acme.com", "devops@acme.com", "john.doe@acme.com", "intern@acme.com"]}',
 'Reduce GitHub org owners to 2-3 trusted individuals. intern@acme.com should be downgraded immediately. john.doe@acme.com (inactive) should also be reviewed.',
 'open')
ON CONFLICT (id) DO NOTHING;

-- 2 Medium findings
INSERT INTO findings (id, scan_id, org_id, provider, severity, type, title, description, affected_entity, ai_recommendation, status) VALUES
('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'slack', 'medium', 'stale_user',
 'Stale admin: Mike Wilson',
 'This user has admin privileges and has been inactive for 32 days.',
 '{"id": "U003", "name": "Mike Wilson", "email": "mike.wilson@acme.com", "role": "admin", "last_active": "2026-02-22"}',
 'Mike Wilson has been inactive for 32 days, just past the 30-day threshold. Verify whether he is on extended leave before taking action. If not, downgrade to Member.',
 'open'),

('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'slack', 'medium', 'shadow_app',
 'Unreviewed app: Meeting Scheduler',
 'A Slack app with channels:read scope has not been reviewed by IT.',
 '{"id": "A002", "name": "Meeting Scheduler", "scopes": ["channels:read"]}',
 'Meeting Scheduler has limited scopes (channels:read only). Low risk but should be formally approved. Add to your approved app inventory.',
 'open')
ON CONFLICT (id) DO NOTHING;

-- 1 Low finding
INSERT INTO findings (id, scan_id, org_id, provider, severity, type, title, description, affected_entity, ai_recommendation, status) VALUES
('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001',
 'github', 'low', 'org_owner_review',
 'GitHub org has no branch protection on default branch',
 'The main repository acme/web-app does not enforce branch protection rules.',
 '{"repo": "acme/web-app", "default_branch": "main"}',
 'Enable branch protection on acme/web-app main branch. Require pull request reviews and status checks before merging. This is a GitHub security best practice.',
 'open')
ON CONFLICT (id) DO NOTHING;

-- Audit log entries for demo trail
INSERT INTO audit_logs (org_id, actor, action, target, metadata) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@acme.com', 'scan.started', '{"provider": "all"}', '{"scanId": "00000000-0000-0000-0000-000000000020"}'),
('00000000-0000-0000-0000-000000000001', 'system', 'scan.completed', '{"provider": "all", "findingsCount": 10}', '{"scanId": "00000000-0000-0000-0000-000000000020", "riskScore": 67}'),
('00000000-0000-0000-0000-000000000001', 'admin@acme.com', 'integration.connected', '{"provider": "slack"}', NULL),
('00000000-0000-0000-0000-000000000001', 'admin@acme.com', 'integration.connected', '{"provider": "github"}', NULL),
('00000000-0000-0000-0000-000000000001', 'admin@acme.com', 'remediation.requested', '{"findingId": "00000000-0000-0000-0000-000000000100", "action": "downgrade_role"}', '{"target": "John Doe"}'),
('00000000-0000-0000-0000-000000000001', 'admin@acme.com', 'remediation.approved', '{"findingId": "00000000-0000-0000-0000-000000000100"}', '{"approvedVia": "CIBA email"}');
