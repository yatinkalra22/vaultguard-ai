export interface AuditLog {
  id: string;
  org_id: string;
  actor: string;
  action: string;
  target: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
