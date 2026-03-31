import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CibaPollResult {
  status: 'approved' | 'rejected' | 'pending';
  approverSub?: string;
}

/**
 * WHY: CIBA (Client Initiated Backchannel Authentication) is the "human-in-the-loop"
 * pattern for AI agents. Instead of acting autonomously or just alerting, CIBA
 * sends an approval request to the admin asynchronously (email/push). The agent
 * pauses until the admin approves or rejects. This is the exact pattern Auth0
 * designed for AI agent governance.
 * See: https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow
 */
@Injectable()
export class CibaService {
  private readonly logger = new Logger(CibaService.name);
  private readonly domain: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: ConfigService) {
    this.domain = config.getOrThrow<string>('AUTH0_DOMAIN');
    this.clientId = config.getOrThrow<string>('AUTH0_CLIENT_ID');
    this.clientSecret = config.getOrThrow<string>('AUTH0_CLIENT_SECRET');
  }

  /**
   * Initiate a CIBA authorization request.
   * Returns auth_req_id — poll this until the admin approves/rejects.
   *
   * WHY: The binding_message is shown to the admin in the approval notification.
   * It must be specific enough for them to make an informed decision without
   * needing to open the dashboard.
   * See: https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow#initiate-ciba-request
   */
  async initiateApprovalRequest(params: {
    userSub: string;
    action: string;
    targetEntity: string;
    findingId: string;
  }): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      login_hint: JSON.stringify({
        format: 'iss_sub',
        iss: `https://${this.domain}/`,
        sub: params.userSub,
      }),
      scope: 'openid',
      binding_message: `VaultGuard: ${params.action} for ${params.targetEntity}`,
    });

    const response = await fetch(`https://${this.domain}/bc-authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({
        error: 'unknown',
        error_description: response.statusText,
      }));
      this.logger.error(`CIBA initiation failed: ${err.error_description}`);
      throw new Error(`CIBA request failed: ${err.error_description}`);
    }

    const data = await response.json();
    this.logger.log(`CIBA request initiated: ${data.auth_req_id}`);
    return data.auth_req_id as string;
  }

  /**
   * Poll Auth0 to check if the admin approved the CIBA request.
   *
   * WHY: CIBA is inherently asynchronous — the admin may approve minutes or
   * hours later. We poll rather than use webhooks because:
   * 1. Simpler setup (no public endpoint needed for callbacks)
   * 2. Auth0 CIBA polling is the recommended approach for hackathon scope
   * See: https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow#poll-for-approval
   */
  async pollForApproval(
    authReqId: string,
  ): Promise<CibaPollResult> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'urn:openid:params:grant-type:ciba',
      auth_req_id: authReqId,
    });

    try {
      const response = await fetch(`https://${this.domain}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.access_token) {
          return { status: 'pending' };
        }

        return {
          status: 'approved',
          approverSub: this.extractSubFromJwt(data.access_token as string),
        };
      }

      const err = await response.json().catch(() => ({ error: 'unknown' }));

      if (err.error === 'authorization_pending') return { status: 'pending' };
      if (err.error === 'access_denied') return { status: 'rejected' };
      if (err.error === 'expired_token') return { status: 'rejected' };

      this.logger.warn(`CIBA poll unexpected error: ${err.error}`);
      return { status: 'pending' };
    } catch (err) {
      this.logger.error('CIBA poll failed:', err);
      return { status: 'pending' };
    }
  }

  private extractSubFromJwt(token: string): string | undefined {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return undefined;

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as { sub?: string };

      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
