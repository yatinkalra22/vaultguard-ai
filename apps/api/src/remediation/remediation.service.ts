import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CibaService } from './ciba.service';
import { SupabaseService } from '../common/supabase.service';
import { SlackService } from '../slack/slack.service';
import { GithubService } from '../github/github.service';

const ACTION_DESCRIPTIONS: Record<string, string> = {
  revoke_slack_user: 'Deactivate Slack user',
  remove_github_member: 'Remove GitHub org member',
  flag_app: 'Flag app for review',
};

interface RemediationRow {
  id: string;
  org_id: string;
  finding_id: string;
  action: string;
  requested_by: string;
  ciba_auth_req_id: string;
  target_entity: Record<string, unknown>;
  status: string;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function resolveExpectedAction(
  provider: string,
  type: string,
): string | null {
  if (provider === 'slack' && (type === 'stale_user' || type === 'deactivated_admin')) {
    return 'revoke_slack_user';
  }

  if (provider === 'github' && type === 'over_permissioned') {
    return 'remove_github_member';
  }

  if (type === 'shadow_app') {
    return 'flag_app';
  }

  return null;
}

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
    // WHY: Never trust client payload for finding ownership or target details.
    // Resolve finding inside the org and derive canonical action/target server-side.
    const { data: finding, error: findingError } = await this.supabase.client
      .from('findings')
      .select('id, org_id, provider, type, status, affected_entity')
      .eq('id', params.findingId)
      .eq('org_id', params.orgId)
      .single();

    if (findingError || !finding) {
      throw new NotFoundException('Finding not found for this organization');
    }

    if (finding.status !== 'open') {
      throw new BadRequestException('Only open findings can be remediated');
    }

    const expectedAction = resolveExpectedAction(finding.provider, finding.type);
    if (!expectedAction) {
      throw new BadRequestException('This finding type is not auto-remediable');
    }

    if (params.action && params.action !== expectedAction) {
      throw new BadRequestException('Invalid action for this finding type');
    }

    const action = expectedAction;
    const targetEntity =
      (finding.affected_entity as Record<string, unknown> | null) ??
      params.targetEntity ??
      {};
    const actionDesc = ACTION_DESCRIPTIONS[action] ?? action;
    const targetName =
      (targetEntity.name as string) ??
      (targetEntity.login as string) ??
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
        action,
        target_entity: targetEntity,
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
      .eq('id', params.findingId)
      .eq('org_id', params.orgId);

    // 4. Audit log
    await this.supabase.client.from('audit_logs').insert({
      org_id: params.orgId,
      actor: params.userSub,
      action: 'remediation.requested',
      target: {
        finding_id: params.findingId,
        remediation_action: action,
        target_entity: targetName,
      },
    });

    return remediation;
  }

  /**
   * Check CIBA approval status and execute if approved.
   * Called by the polling endpoint or a background job.
   */
  async checkAndExecute(remediationId: string, orgId: string) {
    const { data: rem } = await this.supabase.client
      .from('remediations')
      .select('*')
      .eq('id', remediationId)
      .eq('org_id', orgId)
      .single();

    if (!rem || rem.status !== 'pending') return rem;

    const pollResult = await this.ciba.pollForApproval(rem.ciba_auth_req_id);
    const status = pollResult.status;

    if (status === 'approved') {
      await this.executeRemediation(rem, pollResult.approverSub);
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

  private async executeRemediation(rem: RemediationRow, approverSub?: string) {
    const actor = approverSub ?? rem.requested_by;

    try {
      // Execute the actual action against Slack or GitHub API
      if (rem.action === 'revoke_slack_user') {
        const targetUserId = toStringOrEmpty(rem.target_entity.id);
        const teamId = toStringOrEmpty(rem.target_entity.team_id);

        await this.slackService.deactivateUser(
          rem.requested_by,
          targetUserId,
          teamId,
        );
      } else if (rem.action === 'remove_github_member') {
        const org =
          toStringOrEmpty(rem.target_entity.org) ||
          process.env.DEFAULT_GITHUB_ORG ||
          '';
        const username = toStringOrEmpty(rem.target_entity.login);

        await this.githubService.removeOrgMember(
          rem.requested_by,
          org,
          username,
        );
      }

      // Update records
      await this.supabase.client
        .from('remediations')
        .update({
          status: 'executed',
          approved_by: actor,
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
        actor,
        action: 'remediation.executed',
        target: rem.target_entity,
        metadata: { remediation_id: rem.id, action: rem.action },
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown remediation failure';
      this.logger.error(`Remediation execution failed: ${errorMessage}`);

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
