import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../common/supabase.service';
import { SlackService } from '../slack/slack.service';
import { SlackScanner } from '../slack/slack.scanner';
import { GithubService } from '../github/github.service';
import { GithubScanner } from '../github/github.scanner';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ScanningService {
  private readonly logger = new Logger(ScanningService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly slackService: SlackService,
    private readonly slackScanner: SlackScanner,
    private readonly githubService: GithubService,
    private readonly githubScanner: GithubScanner,
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Full scan pipeline: fetch → detect → AI analyze → persist → emit events.
   * Called by cron scheduler or manually via API.
   */
  async runScan(orgId: string, adminUserId: string, githubOrg: string) {
    // 1. Create scan record
    const { data: scan, error: scanError } = await this.supabase.client
      .from('scans')
      .insert({ org_id: orgId, provider: 'all', status: 'running' })
      .select()
      .single();

    if (scanError || !scan) {
      this.logger.error(`Failed to create scan record: ${scanError?.message}`);
      throw new Error('Failed to create scan record');
    }

    this.eventEmitter.emit('scan.started', { orgId, scanId: scan.id });

    try {
      // 2. Fetch data from both providers in parallel
      // WHY: Promise.allSettled (not Promise.all) so one provider failing
      // doesn't block the other. Partial scans are better than no scan.
      const results = await Promise.allSettled([
        this.slackService.listUsers(adminUserId),
        this.slackService.listInstalledApps(adminUserId),
        githubOrg
          ? this.githubService.listOrgMembers(adminUserId, githubOrg)
          : Promise.resolve([]),
        githubOrg
          ? this.githubService.listOutsideCollaborators(adminUserId, githubOrg)
          : Promise.resolve([]),
        githubOrg
          ? this.githubService.listOrgInstallations(adminUserId, githubOrg)
          : Promise.resolve([]),
      ]);

      const [slackUsers, slackApps, githubMembers, githubCollabs, githubApps] =
        results.map((r) => (r.status === 'fulfilled' ? r.value : []));

      if (!githubOrg) {
        this.logger.warn(
          `Scan ${scan.id}: DEFAULT_GITHUB_ORG not configured, skipping GitHub scans`,
        );
      }

      // Log any partial failures
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const labels = ['slackUsers', 'slackApps', 'githubMembers', 'githubCollabs', 'githubApps'];
          this.logger.warn(`Scan ${scan.id}: ${labels[i]} fetch failed: ${r.reason}`);
        }
      });

      // 3. Run local anomaly detection
      const rawFindings = [
        ...this.slackScanner
          .analyze(slackUsers as any[], slackApps as any[])
          .map((f) => ({ ...f, provider: 'slack' as const })),
        ...this.githubScanner
          .analyze(
            githubMembers as any[],
            githubCollabs as any[],
            githubApps as any[],
            githubOrg,
          )
          .map((f) => ({ ...f, provider: 'github' as const })),
      ];

      // 4. AI analysis + risk scoring
      const aiAnalysis = await this.aiService.analyzeFindings(rawFindings);

      // 5. Persist findings with AI recommendations
      const findingsToInsert = rawFindings.map((f, i) => ({
        scan_id: scan.id,
        org_id: orgId,
        provider: f.provider,
        severity: f.severity,
        type: f.type,
        title: f.title,
        description: f.description,
        affected_entity: f.affectedEntity,
        ai_recommendation:
          aiAnalysis.recommendations.find((r) => r.findingId === String(i))
            ?.action ?? null,
        status: 'open',
      }));

      if (findingsToInsert.length > 0) {
        const { error: insertError } = await this.supabase.client
          .from('findings')
          .insert(findingsToInsert);
        if (insertError) {
          this.logger.error(`Failed to insert findings: ${insertError.message}`);
        }
      }

      // 6. Update scan as completed
      await this.supabase.client
        .from('scans')
        .update({
          status: 'completed',
          findings_count: rawFindings.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', scan.id);

      // 7. Emit completion event for SSE
      this.eventEmitter.emit('scan.completed', {
        orgId,
        scanId: scan.id,
        findingsCount: rawFindings.length,
        riskScore: aiAnalysis.riskScore,
        summary: aiAnalysis.summary,
      });

      return {
        scanId: scan.id,
        findingsCount: rawFindings.length,
        riskScore: aiAnalysis.riskScore,
        summary: aiAnalysis.summary,
      };
    } catch (err: any) {
      this.logger.error(`Scan ${scan.id} failed:`, err);

      await this.supabase.client
        .from('scans')
        .update({ status: 'failed' })
        .eq('id', scan.id);

      // WHY: Don't send internal error details via SSE — clients see a generic
      // message. Full error is already logged above.
      this.eventEmitter.emit('scan.failed', {
        orgId,
        scanId: scan.id,
        error: 'Scan failed. Check server logs for details.',
      });

      throw err;
    }
  }
}
