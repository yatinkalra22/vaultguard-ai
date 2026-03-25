export interface Organization {
  id: string;
  name: string;
  auth0_org_id: string | null;
  created_at: string;
}

export type IntegrationStatus = 'active' | 'error' | 'disconnected';

export interface Integration {
  id: string;
  org_id: string;
  provider: 'slack' | 'github';
  connected_at: string | null;
  last_scan_at: string | null;
  status: IntegrationStatus;
}
