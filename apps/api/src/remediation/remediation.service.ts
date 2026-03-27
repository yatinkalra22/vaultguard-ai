import { Injectable, Logger } from '@nestjs/common';
import { CibaService } from './ciba.service';
import { SupabaseService } from '../common/supabase.service';
import { SlackService } from '../slack/slack.service';
import { GithubService } from '../github/github.service';

const ACTION_DESCRIPTIONS: Record<string, string> = {
  revoke_slack_user: 'Deactivate Slack user',
  remove_github_member: 'Remove GitHub org member',
  flag_app: 'Flag app for review',
};

@Injectable()
export class RemediationService {
  private readonly logger = new Logger(RemediationService.name);

  constructor(
    private readonly ciba: CibaService,
    private readonly supabase: SupabaseService,
    private readonly slackService: SlackService,
    private readonly githubService: GithubService,
  ) {}

  /**
   * Create a remediation request — triggers CIBA approval flow.
   * The finding moves to 'pending_approval' until the admin responds.
   */
  async requestRemediation(params: {
    findingId: string;
    orgId: string;
    userSub: string;
    action: string;
    targetEntity: Record<string, unknown>;
  }) {
    const actionDesc =
      ACTION_DESCRIPTIONS[params.action] ?? params.action;
    const targetName =
      (params.targetEntity.name as string) ??
      (params.targetEntity.login as string) ??
      'unknown';

    // 1. Initiate CIBA — sends approval request to admin
    const authReqId = await this.ciba.initiateApprovalRequest({
      userSub: params.userSub,
      action: actionDesc,
      targetEntity: targetName,
      findingId: params.findingId,
    });

    // 2. Store the pending remediation
    const { data: remediation, error } = await this.supabase.client
      .from('remediations')
      .insert({
        finding_id: params.findingId,
        org_id: params.orgId,
        action: params.action,
        target_entity: params.targetEntity,
        ciba_auth_req_id: authReqId,
        status: 'pending',
        requested_by: params.userSub,
      })
      .select()
      .single();

    if (error) {
      // WHY: Log the actual DB error server-side, throw a generic message.
      // The global exception filter catches this, but the message should be
      // safe regardless in case it's caught by intermediate error handlers.
      this.logger.error(`Failed to create remediation: ${error.message}`);
      throw new Error('Failed to create remediation');
    }

    // 3. Update finding status
    await this.supabase.client
      .from('findings')
      .update({ status: 'pending_approval' })
      .eq('id', params.findingId);

    // 4. Audit log
    await this.supabase.client.from('audit_logs').insert({
      org_id: params.orgId,
      actor: params.userSub,
      action: 'remediation.requested',
      target: {
        finding_id: params.findingId,
        remediation_action: params.action,
        target_entity: targetName,
      },
    });

    return remediation;
  }

  /**
   * Check CIBA approval status and execute if approved.
   * Called by the polling endpoint or a background job.
   */
  async checkAndExecute(remediationId: string) {
    const { data: rem } = await this.supabase.client
      .from('remediations')
      .select('*')
      .eq('id', remediationId)
      .single();

    if (!rem || rem.status !== 'pending') return rem;

    const status = await this.ciba.pollForApproval(rem.ciba_auth_req_id);

    if (status === 'approved') {
      await this.executeRemediation(rem);
    } else if (status === 'rejected') {
      await this.supabase.client
        .from('remediations')
        .update({ status: 'rejected', resolved_at: new Date().toISOString() })
        .eq('id', remediationId);

      await this.supabase.client
        .from('findings')
        .update({ status: 'open' })
        .eq('id', rem.finding_id);

      await this.supabase.client.from('audit_logs').insert({
        org_id: rem.org_id,
        actor: rem.requested_by,
        action: 'remediation.rejected',
        target: { remediation_id: rem.id, finding_id: rem.finding_id },
      });
    }

    return { ...rem, status };
  }

  private async executeRemediation(rem: Record<string, any>) {
    try {
      // Execute the actual action against Slack or GitHub API
      if (rem.action === 'revoke_slack_user') {
        await this.slackService.deactivateUser(
          rem.requested_by,
          rem.target_entity.id,
          rem.target_entity.team_id ?? '',
        );
      } else if (rem.action === 'remove_github_member') {
        await this.githubService.removeOrgMember(
          rem.requested_by,
          rem.target_entity.org ?? '',
          rem.target_entity.login,
        );
      }

      // Update records
      await this.supabase.client
        .from('remediations')
        .update({
          status: 'executed',
          approved_by: rem.requested_by,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', rem.id);

      await this.supabase.client
        .from('findings')
        .update({ status: 'remediated' })
        .eq('id', rem.finding_id);

      // Audit trail
      await this.supabase.client.from('audit_logs').insert({
        org_id: rem.org_id,
        actor: rem.requested_by,
        action: 'remediation.executed',
        target: rem.target_entity,
        metadata: { remediation_id: rem.id, action: rem.action },
      });
    } catch (err: any) {
      this.logger.error(`Remediation execution failed: ${err.message}`);

      await this.supabase.client
        .from('remediations')
        .update({ status: 'failed', resolved_at: new Date().toISOString() })
        .eq('id', rem.id);

      await this.supabase.client
        .from('findings')
        .update({ status: 'open' })
        .eq('id', rem.finding_id);

      throw err;
    }
  }
}
