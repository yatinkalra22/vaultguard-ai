import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { TokenVaultService } from '../common/token-vault.service';

// WHY: Using GitHub REST API v3 (not GraphQL) because:
// 1. Org member/collaborator endpoints are simpler in REST
// 2. Token Vault provides a standard OAuth token compatible with REST
// 3. REST is easier to debug and rate-limit errors are clearer
// See: https://docs.github.com/en/rest

export interface GitHubMember {
  id: number;
  login: string;
  html_url: string;
  role?: string; // 'admin' | 'member' — only from /orgs/:org/memberships/:user
  site_admin: boolean;
}

export interface GitHubInstallation {
  id: number;
  app_slug: string;
  repository_selection: 'all' | 'selected';
  permissions: Record<string, string>;
  account?: { login: string };
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly GITHUB_API = 'https://api.github.com';

  constructor(private readonly tokenVault: TokenVaultService) {}

  private async getHeaders(adminUserId: string) {
    const token = await this.tokenVault.getTokenForUser(adminUserId, 'github');
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      // WHY: Pinning API version prevents breaking changes from GitHub.
      // See: https://docs.github.com/en/rest/about-the-rest-api/api-versions
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  /**
   * List all org members with their roles.
   * See: https://docs.github.com/en/rest/orgs/members#list-organization-members
   */
  async listOrgMembers(
    adminUserId: string,
    org: string,
  ): Promise<GitHubMember[]> {
    const headers = await this.getHeaders(adminUserId);
    const members: GitHubMember[] = [];
    let page = 1;

    // WHY: GitHub paginates at 100 per page. Loop to handle large orgs.
    do {
      const { data } = await axios.get<GitHubMember[]>(
        `${this.GITHUB_API}/orgs/${encodeURIComponent(org)}/members`,
        { headers, params: { per_page: 100, page, role: 'all' } },
      );

      members.push(...data);
      if (data.length < 100) break;
      page++;
    } while (true);

    return members;
  }

  /**
   * List outside collaborators — users with repo access who aren't org members.
   * WHY: Outside collaborators are a high security risk — they have direct
   * repo access without org-level governance (no SSO, no 2FA enforcement).
   * See: https://docs.github.com/en/rest/orgs/outside-collaborators
   */
  async listOutsideCollaborators(
    adminUserId: string,
    org: string,
  ): Promise<GitHubMember[]> {
    const headers = await this.getHeaders(adminUserId);
    const { data } = await axios.get<GitHubMember[]>(
      `${this.GITHUB_API}/orgs/${encodeURIComponent(org)}/outside_collaborators`,
      { headers, params: { per_page: 100 } },
    );
    return data;
  }

  /**
   * List GitHub App installations in the org.
   * WHY: GitHub Apps with org-wide write access can modify any repo.
   * See: https://docs.github.com/en/rest/orgs/orgs#list-app-installations-for-an-organization
   */
  async listOrgInstallations(
    adminUserId: string,
    org: string,
  ): Promise<GitHubInstallation[]> {
    const headers = await this.getHeaders(adminUserId);
    const { data } = await axios.get<{
      installations: GitHubInstallation[];
    }>(
      `${this.GITHUB_API}/orgs/${encodeURIComponent(org)}/installations`,
      { headers },
    );
    return data.installations ?? [];
  }

  /**
   * Remove a user from the org — only called after CIBA approval.
   * See: https://docs.github.com/en/rest/orgs/members#remove-an-organization-member
   */
  async removeOrgMember(
    adminUserId: string,
    org: string,
    username: string,
  ): Promise<void> {
    const headers = await this.getHeaders(adminUserId);
    await axios.delete(
      `${this.GITHUB_API}/orgs/${encodeURIComponent(org)}/members/${encodeURIComponent(username)}`,
      { headers },
    );
  }
}
