import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScanningService } from './scanning.service';
import { SupabaseService } from '../common/supabase.service';

@Injectable()
export class ScanningScheduler {
  private readonly logger = new Logger(ScanningScheduler.name);

  constructor(
    private readonly scanningService: ScanningService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * WHY: Daily midnight scan for all orgs with active integrations.
   * Continuous scanning catches access drift (new admins, stale users)
   * without requiring manual intervention.
   * See: https://docs.nestjs.com/techniques/task-scheduling#declarative-cron-jobs
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledScan() {
    this.logger.log('Running scheduled scan for all orgs...');

    const { data: orgs } = await this.supabase.client
      .from('organizations')
      .select('id, auth0_org_id')
      .not('auth0_org_id', 'is', null);

    if (!orgs || orgs.length === 0) {
      this.logger.log('No orgs configured — skipping scheduled scan');
      return;
    }

    for (const org of orgs) {
      try {
        // WHY: Sequential per-org to avoid rate limiting on Slack/GitHub APIs.
        // Parallel scanning across orgs would hit API limits quickly.
        await this.scanningService.runScan(
          org.id,
          org.auth0_org_id,
          '', // GitHub org name — will be stored on org record in a future phase
        );
        this.logger.log(`Scheduled scan completed for org ${org.id}`);
      } catch (err) {
        this.logger.error(`Scheduled scan failed for org ${org.id}:`, err);
      }
    }
  }
}
