export type Provider = 'slack' | 'github';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FindingType =
  | 'stale_user'
  | 'over_permissioned'
  | 'shadow_app'
  | 'orphaned_token'
  | 'deactivated_admin'
  | 'outside_collaborator'
  | 'broad_app'
  | 'org_owner_review';

export type FindingStatus = 'open' | 'pending_approval' | 'remediated' | 'ignored';

export type ScanStatus = 'running' | 'completed' | 'failed';

export type RemediationAction =
  | 'revoke_access'
  | 'downgrade_role'
  | 'disable_app'
  | 'revoke_slack_user'
  | 'remove_github_member'
  | 'flag_app';

export type IntegrationStatus = 'active' | 'inactive' | 'error';

export type AlertReason =
  | 'risk_threshold_exceeded'
  | 'critical_findings_threshold_exceeded';

export interface FindingItem {
  id: string;
  provider: Provider;
  severity: FindingSeverity;
  type: FindingType;
  title: string;
  description: string | null;
  ai_recommendation: string | null;
  affected_entity: Record<string, unknown> | null;
  status: FindingStatus;
  created_at: string;
}

export interface IntegrationItem {
  id: string;
  provider: Provider;
  status: IntegrationStatus;
  connected_at: string | null;
  last_scan_at: string | null;
}

export interface ScanItem {
  id: string;
  provider: Provider;
  status: ScanStatus;
  findingsCount: number;
  startedAt: string;
  completedAt: string | null;
}
