import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// WHY: Auth0 Token Vault stores OAuth refresh tokens for connected providers
// (Slack, GitHub) in Auth0's infrastructure — never in our database.
// When we need to call a provider API, we exchange our M2M credentials for a
// fresh access token via token exchange grant. If our DB is breached, no
// provider credentials are exposed.
// See: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authenticate-with-token-vault

@Injectable()
export class TokenVaultService {
  private readonly logger = new Logger(TokenVaultService.name);
  private readonly domain: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: ConfigService) {
    this.domain = config.getOrThrow<string>('AUTH0_DOMAIN');
    this.clientId = config.getOrThrow<string>('AUTH0_CLIENT_ID');
    this.clientSecret = config.getOrThrow<string>('AUTH0_CLIENT_SECRET');
  }

  /**
   * Get a fresh access token for a provider using Auth0 Token Vault.
   *
   * WHY: Uses the token exchange grant (RFC 8693) — Auth0 takes our M2M token
   * and the user's identity, looks up the stored refresh token in Token Vault,
   * and returns a fresh provider access token. We never see or store the
   * refresh token.
   * See: https://auth0.com/docs/get-started/authentication-and-authorization-flow/token-exchange
   */
  async getTokenForUser(
    userId: string,
    provider: 'slack' | 'github',
  ): Promise<string> {
    const response = await fetch(
      `https://${this.domain}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          subject_token_type:
            'urn:auth0:params:oauth:token-type:access_token',
          requested_token_type:
            'urn:auth0:params:oauth:token-type:connection_access_token',
          // WHY: 'connection' must match the Connected Account name configured
          // in Auth0 Dashboard → AI Agents → Connected Accounts
          connection: provider,
          subject: userId,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({
        error: 'unknown',
        error_description: response.statusText,
      }));
      this.logger.error(
        `Token Vault exchange failed for ${provider} (user: ${userId}): ${err.error_description}`,
      );
      throw new Error(
        `Failed to get ${provider} token: ${err.error_description}`,
      );
    }

    const { access_token } = await response.json();
    return access_token as string;
  }
}
