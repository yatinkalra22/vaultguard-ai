import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { TokenVaultService } from '../common/token-vault.service';

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: { email: string; display_name: string };
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
  deleted: boolean;
  updated: number; // Unix timestamp of last profile update
}

export interface SlackApp {
  id: string;
  name: string;
  scopes: string[];
  date_added: number;
  is_internal_integration: boolean;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly SLACK_API = 'https://slack.com/api';

  constructor(private readonly tokenVault: TokenVaultService) {}

  /**
   * Fetch all workspace members including deactivated users.
   * WHY: Uses users.list (not admin.users.list) because admin.* endpoints
   * require Enterprise Grid. users.list works on any paid Slack plan and
   * returns enough data for stale-user + deactivated-admin detection.
   * See: https://api.slack.com/methods/users.list
   */
  async listUsers(adminUserId: string): Promise<SlackUser[]> {
    const token = await this.tokenVault.getTokenForUser(adminUserId, 'slack');
    const users: SlackUser[] = [];
    let cursor: string | undefined;

    // WHY: Slack paginates at 200 users per page — loop to get all members.
    // Without pagination, large workspaces would return incomplete results.
    do {
      const { data } = await axios.get<{
        ok: boolean;
        error?: string;
        members: SlackUser[];
        response_metadata?: { next_cursor: string };
      }>(`${this.SLACK_API}/users.list`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 200, cursor },
      });

      if (!data.ok) {
        this.logger.error(`Slack users.list API error: ${data.error}`);
        throw new Error('Failed to fetch Slack users');
      }

      users.push(...data.members);
      cursor = data.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return users;
  }

  /**
   * Fetch third-party apps installed in the workspace.
   * WHY: Requires admin.apps:read scope. Falls back gracefully if scope
   * isn't available (some workspaces don't grant admin scopes).
   * See: https://api.slack.com/methods/admin.apps.approved.list
   */
  async listInstalledApps(adminUserId: string): Promise<SlackApp[]> {
    const token = await this.tokenVault.getTokenForUser(adminUserId, 'slack');

    try {
      const { data } = await axios.get<{
        ok: boolean;
        error?: string;
        approved_apps?: SlackApp[];
      }>(`${this.SLACK_API}/admin.apps.approved.list`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 },
      });

      if (!data.ok) {
        this.logger.warn(`Slack apps API error: ${data.error} — skipping app scan`);
        return [];
      }

      return data.approved_apps ?? [];
    } catch (err) {
      // WHY: admin.apps.approved.list requires Enterprise Grid on some plans.
      // Graceful fallback so the scan doesn't fail entirely.
      if (err instanceof AxiosError && err.response?.status === 403) {
        this.logger.warn('Slack admin.apps scope not available — skipping app scan');
        return [];
      }
      throw err;
    }
  }

  /**
   * Deactivate a Slack user — only called after CIBA approval.
   * WHY: Uses admin.users.remove which requires admin scope.
   * See: https://api.slack.com/methods/admin.users.remove
   */
  async deactivateUser(
    adminUserId: string,
    targetUserId: string,
    teamId: string,
  ): Promise<void> {
    const token = await this.tokenVault.getTokenForUser(adminUserId, 'slack');
    const { data } = await axios.post<{ ok: boolean; error?: string }>(
      `${this.SLACK_API}/admin.users.remove`,
      { user_id: targetUserId, team_id: teamId },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!data.ok) {
      // WHY: Log Slack API error detail server-side, throw generic message.
      // Prevents leaking Slack-specific error codes to clients.
      this.logger.error(`Failed to deactivate Slack user: ${data.error}`);
      throw new Error('Failed to deactivate Slack user');
    }
  }
}
