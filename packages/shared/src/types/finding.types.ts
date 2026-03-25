export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type FindingType =
  | 'stale_user'
  | 'over_permissioned'
  | 'shadow_app'
  | 'orphaned_token'
  | 'deactivated_admin';

export type FindingStatus = 'open' | 'pending_approval' | 'remediated' | 'ignored';

export type Provider = 'slack' | 'github';

export interface Finding {
  id: string;
  scan_id: string;
  org_id: string;
  provider: Provider;
  severity: FindingSeverity;
  type: FindingType;
  title: string;
  description: string | null;
  affected_entity: Record<string, unknown>;
  ai_recommendation: string | null;
  status: FindingStatus;
  created_at: string;
}
