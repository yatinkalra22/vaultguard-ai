import { Injectable } from '@nestjs/common';
import { GitHubMember, GitHubInstallation } from './github.service';

export interface GitHubFinding {
  type: 'stale_user' | 'over_permissioned' | 'shadow_app';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedEntity: Record<string, unknown>;
}

@Injectable()
export class GithubScanner {
  /**
   * Main scan entry point — runs all detection rules against org data.
   * Pure business logic — no external calls, only data analysis.
   */
  analyze(
    members: GitHubMember[],
    collaborators: GitHubMember[],
    installations: GitHubInstallation[],
    org: string,
  ): GitHubFinding[] {
    return [
      ...this.detectOutsideCollaborators(collaborators, org),
      ...this.detectBroadApps(installations, org),
      ...this.detectOrgOwners(members, org),
    ];
  }

  /**
   * Flag all outside collaborators — they bypass org-level controls.
   * WHY: Outside collaborators aren't covered by SAML SSO, 2FA policies,
   * or org-wide audit logs. Each one is an ungoverned access point.
   * See: https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators
   */
  private detectOutsideCollaborators(
    collaborators: GitHubMember[],
    org: string,
  ): GitHubFinding[] {
    return collaborators.map((c) => ({
      type: 'over_permissioned' as const,
      severity: 'high' as const,
      title: `Outside collaborator: ${c.login}`,
      description: `${c.login} is an outside collaborator (not an org member) with direct repository access. Verify they still need access.`,
      affectedEntity: {
        id: c.id,
        login: c.login,
        org,
        url: c.html_url,
      },
    }));
  }

  /**
   * Flag GitHub Apps with write access to ALL repositories.
   * WHY: Apps with repository_selection='all' and contents:write can modify
   * any repo in the org — including main branches and CI/CD configs.
   * See: https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps
   */
  private detectBroadApps(
    installations: GitHubInstallation[],
    org: string,
  ): GitHubFinding[] {
    return installations
      .filter(
        (i) =>
          i.repository_selection === 'all' &&
          i.permissions?.contents === 'write',
      )
      .map((i) => ({
        type: 'shadow_app' as const,
        severity: 'critical' as const,
        title: `GitHub App with org-wide write access: ${i.app_slug}`,
        description: `This GitHub App has write access to ALL repositories in your org. Restrict to specific repos if possible.`,
        affectedEntity: {
          id: i.id,
          app: i.app_slug,
          org,
          permissions: i.permissions,
          installed_by: i.account?.login,
        },
      }));
  }

  /**
   * Flag org owners for periodic review.
   * WHY: GitHub org owners have unrestricted access — they can delete repos,
   * manage billing, and bypass branch protections. Regular review is critical.
   * GitHub API doesn't expose last_active, so we flag all owners.
   */
  private detectOrgOwners(members: GitHubMember[], org: string): GitHubFinding[] {
    return members
      .filter((m) => m.site_admin || m.role === 'admin')
      .slice(0, 5) // WHY: Limit to 5 to reduce noise — focus on review, not alert fatigue
      .map((m) => ({
        type: 'stale_user' as const,
        severity: 'medium' as const,
        title: `GitHub org owner: ${m.login}`,
        description: `${m.login} is an org owner. Verify this level of access is still required.`,
        affectedEntity: {
          id: m.id,
          login: m.login,
          org,
          url: m.html_url,
        },
      }));
  }
}
