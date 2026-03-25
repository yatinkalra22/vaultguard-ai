import { Injectable } from '@nestjs/common';
import { SlackUser, SlackApp } from './slack.service';

export interface SlackFinding {
  type: 'stale_user' | 'over_permissioned' | 'shadow_app' | 'deactivated_admin';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedEntity: Record<string, unknown>;
}

// WHY: Stale threshold set to 30 days — industry standard for access reviews.
// NIST SP 800-53 AC-2(3) recommends disabling inactive accounts after 30 days.
// See: https://csf.tools/reference/nist-sp-800-53/r5/ac/ac-2/
const STALE_DAYS = 30;

// WHY: These scopes grant write access to workspace data or admin operations.
// Any third-party app with these scopes is a potential security risk.
// See: https://api.slack.com/scopes (admin:* scopes)
const DANGEROUS_SCOPES = [
  'admin',
  'admin:users:write',
  'files:write',
  'channels:write',
  'chat:write',
  'users:write',
];

@Injectable()
export class SlackScanner {
  /**
   * Main scan entry point — runs all detection rules against workspace data.
   * Pure business logic — no external calls, only data analysis.
   */
  analyze(users: SlackUser[], apps: SlackApp[]): SlackFinding[] {
    return [
      ...this.detectStaleAdmins(users),
      ...this.detectDeactivatedAdmins(users),
      ...this.detectShadowApps(apps),
    ];
  }

  /**
   * Detect admin users who haven't updated their profile in 30+ days.
   * WHY: Stale admins are a top access governance risk — if an employee
   * leaves but retains admin, their account can be compromised for
   * privilege escalation.
   */
  private detectStaleAdmins(users: SlackUser[]): SlackFinding[] {
    const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return users
      .filter((u) => !u.is_bot && !u.deleted && u.is_admin)
      .filter((u) => now - u.updated * 1000 > staleMs)
      .map((u) => ({
        type: 'stale_user' as const,
        severity: 'high' as const,
        title: `Stale admin: ${u.real_name || u.name}`,
        description: `This user has admin privileges but hasn't been active in over ${STALE_DAYS} days. Consider downgrading their role.`,
        affectedEntity: {
          id: u.id,
          name: u.real_name,
          email: u.profile.email,
          is_admin: u.is_admin,
          last_updated: new Date(u.updated * 1000).toISOString(),
        },
      }));
  }

  /**
   * Detect deactivated users who still have admin flag set.
   * WHY: Slack retains the is_admin flag on deactivated accounts.
   * If re-activated (e.g. by a compromised admin), they regain admin rights.
   * This is a data inconsistency that should be cleaned up.
   */
  private detectDeactivatedAdmins(users: SlackUser[]): SlackFinding[] {
    return users
      .filter((u) => u.deleted && u.is_admin)
      .map((u) => ({
        type: 'deactivated_admin' as const,
        severity: 'critical' as const,
        title: `Deactivated admin retains admin flag: ${u.real_name || u.name}`,
        description: `User is deactivated but still has admin: true in Slack. This can allow re-activation with admin rights.`,
        affectedEntity: {
          id: u.id,
          name: u.real_name,
          email: u.profile.email,
        },
      }));
  }

  /**
   * Detect third-party apps with overly broad OAuth scopes.
   * WHY: Shadow IT apps often request broad scopes during install and are
   * never reviewed. Apps with admin or write scopes can exfiltrate data
   * or modify workspace settings.
   */
  private detectShadowApps(apps: SlackApp[]): SlackFinding[] {
    return apps
      .filter((app) =>
        app.scopes?.some((s) => DANGEROUS_SCOPES.includes(s)),
      )
      .map((app) => {
        const dangerousFound = app.scopes.filter((s) =>
          DANGEROUS_SCOPES.includes(s),
        );
        return {
          type: 'shadow_app' as const,
          severity: 'high' as const,
          title: `App with broad permissions: ${app.name}`,
          description: `This app has the following dangerous scopes: ${dangerousFound.join(', ')}. Verify this is necessary.`,
          affectedEntity: {
            id: app.id,
            name: app.name,
            scopes: app.scopes,
            dangerous_scopes: dangerousFound,
            added: new Date(app.date_added * 1000).toISOString(),
          },
        };
      });
  }
}
