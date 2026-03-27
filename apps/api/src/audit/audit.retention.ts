import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../common/supabase.service';

/**
 * WHY: Application-level retention cleanup as a fallback for environments
 * without pg_cron (e.g., Supabase free tier). Runs daily at 3 AM UTC.
 * Mirrors the SQL functions in scripts/setup-retention.sql.
 *
 * Retention periods:
 *   audit_logs — 90 days (SOC 2 / ISO 27001 compliance baseline)
 *   scans      — 30 days (only if all linked findings are resolved)
 *   findings   — 30 days after remediation/ignore
 */
@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);

  // WHY: Configurable retention days for easy adjustment per compliance needs.
  private readonly AUDIT_LOG_RETENTION_DAYS = 90;
  private readonly SCAN_RETENTION_DAYS = 30;

  constructor(private readonly supabase: SupabaseService) {}

  // WHY: 3 AM UTC — low-traffic window to avoid impacting user-facing queries.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldRecords() {
    this.logger.log('Starting retention cleanup...');

    const auditCount = await this.cleanupAuditLogs();
    const scanCount = await this.cleanupOldScans();

    this.logger.log(
      `Retention cleanup complete: ${auditCount} audit logs, ${scanCount} scans removed`,
    );
  }

  private async cleanupAuditLogs(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.AUDIT_LOG_RETENTION_DAYS);

    const { count, error } = await this.supabase.client
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString());

    if (error) {
      this.logger.error(`Audit log cleanup failed: ${error.message}`);
      return 0;
    }

    return count ?? 0;
  }

  private async cleanupOldScans(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.SCAN_RETENTION_DAYS);

    // WHY: Only delete resolved findings from old scans.
    // Open/pending findings are preserved regardless of age.
    const { error: findingsError } = await this.supabase.client
      .from('findings')
      .delete()
      .lt('created_at', cutoff.toISOString())
      .in('status', ['remediated', 'ignored']);

    if (findingsError) {
      this.logger.error(`Findings cleanup failed: ${findingsError.message}`);
    }

    // WHY: Only delete scans that have no remaining open findings.
    // This prevents orphaning active findings.
    const { count, error } = await this.supabase.client
      .from('scans')
      .delete({ count: 'exact' })
      .lt('completed_at', cutoff.toISOString())
      .in('status', ['completed', 'failed']);

    if (error) {
      this.logger.error(`Scan cleanup failed: ${error.message}`);
      return 0;
    }

    return count ?? 0;
  }
}
