export type RemediationAction =
  | 'revoke_access'
  | 'downgrade_role'
  | 'disable_app'
  | 'revoke_slack_user'
  | 'remove_github_member'
  | 'flag_app';

export type RemediationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed';

export interface Remediation {
  id: string;
  finding_id: string;
  org_id: string;
  action: RemediationAction;
  target_entity: Record<string, unknown>;
  ciba_auth_req_id: string | null;
  status: RemediationStatus;
  requested_by: string | null;
  approved_by: string | null;
  requested_at: string;
  resolved_at: string | null;
}
