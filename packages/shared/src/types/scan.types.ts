export type ScanStatus = 'running' | 'completed' | 'failed';

export interface Scan {
  id: string;
  org_id: string;
  provider: string;
  started_at: string;
  completed_at: string | null;
  findings_count: number;
  status: ScanStatus;
}
