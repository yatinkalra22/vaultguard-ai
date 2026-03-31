import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';

/**
 * WHY: Auth0 FGA (Fine-Grained Authorization) enforces policy-as-code for
 * who can approve remediations. Instead of fragile if/else checks in application
 * code, authorization decisions are externalized to a dedicated policy engine.
 * Only org admins can approve critical remediations (GitHub org-level changes);
 * team leads can approve lower-severity ones (Slack role downgrades).
 * See: https://docs.fga.dev/
 *
 * WHY @openfga/sdk over @auth0/fga: @auth0/fga is deprecated in favor of
 * @openfga/sdk which is the actively maintained OpenFGA client.
 * See: https://www.npmjs.com/package/@auth0/fga
 */
@Injectable()
export class FgaService {
  private readonly logger = new Logger(FgaService.name);
  private client: OpenFgaClient | null = null;

  constructor(private readonly config: ConfigService) {
    const storeId = this.config.get<string>('FGA_STORE_ID');
    const clientId = this.config.get<string>('FGA_CLIENT_ID');
    const clientSecret = this.config.get<string>('FGA_CLIENT_SECRET');

    // WHY: FGA is optional — if credentials aren't configured, skip
    // initialization. This allows local development without FGA setup.
    if (!storeId || !clientId || !clientSecret) {
      this.logger.warn(
        'FGA credentials not configured — authorization checks will be skipped',
      );
      return;
    }

    this.client = new OpenFgaClient({
      apiUrl: 'https://api.us1.fga.dev',
      storeId,
      credentials: {
        method: CredentialsMethod.ClientCredentials,
        config: {
          clientId,
          clientSecret,
          apiTokenIssuer: 'fga.us.auth0.com',
          apiAudience: 'https://api.us1.fga.dev/',
        },
      },
    });
  }

  /**
   * Check if a user can approve a remediation for an org.
   * WHY fail-closed in production: If FGA is not configured in production,
   * deny all remediation requests. A permissive fallback would let any
   * authenticated user approve remediations — defeating the purpose of FGA.
   * In development, allow without FGA so devs can test without full setup.
   */
  async canApproveRemediation(
    userId: string,
    orgId: string,
  ): Promise<boolean> {
    if (!this.client) {
      const isDevelopment = this.config.get('NODE_ENV') === 'development';
      const allowInsecureDevAuth =
        this.config.get('ALLOW_INSECURE_DEV_AUTH') === 'true';

      if (isDevelopment && allowInsecureDevAuth) {
        this.logger.warn(
          'FGA not configured and ALLOW_INSECURE_DEV_AUTH=true — allowing remediation approval in development',
        );
        return true;
      }

      this.logger.error(
        'FGA not configured — denying remediation approval. Set ALLOW_INSECURE_DEV_AUTH=true only for local development.',
      );
      return false;
    }

    try {
      const { allowed } = await this.client.check({
        user: `user:${userId}`,
        relation: 'can_approve',
        object: `remediation:${orgId}`,
      });
      return allowed ?? false;
    } catch (err) {
      this.logger.error('FGA check failed:', err);
      // WHY: Fail-closed — deny if FGA is unreachable. Security over availability.
      return false;
    }
  }

  /**
   * Write an org admin tuple — called when a user is assigned admin role.
   */
  async setOrgAdmin(userId: string, orgId: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.write({
        writes: [
          {
            user: `user:${userId}`,
            relation: 'admin',
            object: `organization:${orgId}`,
          },
        ],
      });
    } catch (err) {
      this.logger.error('FGA write failed:', err);
    }
  }

  /**
   * Remove an org admin tuple.
   */
  async removeOrgAdmin(userId: string, orgId: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.write({
        deletes: [
          {
            user: `user:${userId}`,
            relation: 'admin',
            object: `organization:${orgId}`,
          },
        ],
      });
    } catch (err) {
      this.logger.error('FGA delete failed:', err);
    }
  }
}
