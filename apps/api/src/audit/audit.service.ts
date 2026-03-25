import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';

/**
 * WHY: Centralized audit logging service. Every state-changing action
 * (scan, remediation, approval, ignore) must be logged with actor,
 * action, target, and timestamp. The audit_logs table is append-only
 * by convention — no UPDATE or DELETE operations are ever performed.
 * This makes VaultGuard compliance-ready (SOC 2, ISO 27001).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async log(params: {
    orgId: string;
    actor: string;
    action: string;
    target?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const { error } = await this.supabase.client.from('audit_logs').insert({
      org_id: params.orgId,
      actor: params.actor,
      action: params.action,
      target: params.target ?? null,
      metadata: params.metadata ?? null,
    });

    if (error) {
      // WHY: Log but don't throw — audit failures should never block
      // the primary operation. The action already happened; failing to
      // log it shouldn't roll it back.
      this.logger.error(`Audit log insert failed: ${error.message}`, {
        action: params.action,
        actor: params.actor,
      });
    }
  }
}
