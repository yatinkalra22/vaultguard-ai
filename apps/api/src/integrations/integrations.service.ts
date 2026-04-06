import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../common/supabase.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async listIntegrations(orgId: string) {
    const { data } = await this.supabase.client
      .from('integrations')
      .select('*')
      .eq('org_id', orgId)
      .order('provider', { ascending: true });

    return data ?? [];
  }

  async connectIntegration(orgId: string, provider: 'slack' | 'github') {
    const now = new Date().toISOString();

    const { data: existing } = await this.supabase.client
      .from('integrations')
      .select('id')
      .eq('org_id', orgId)
      .eq('provider', provider)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await this.supabase.client
        .from('integrations')
        .update({ status: 'active', connected_at: now })
        .eq('id', existing.id)
        .eq('org_id', orgId);
    } else {
      await this.supabase.client.from('integrations').insert({
        org_id: orgId,
        provider,
        status: 'active',
        connected_at: now,
      });
    }

    return { url: this.buildAuth0AuthorizeUrl(provider) };
  }

  async disconnectIntegration(orgId: string, integrationId: string) {
    const { data } = await this.supabase.client
      .from('integrations')
      .update({ status: 'disconnected' })
      .eq('id', integrationId)
      .eq('org_id', orgId)
      .select('*')
      .maybeSingle();

    return data;
  }

  private resolveAuth0Connection(provider: 'slack' | 'github'): string {
    if (provider === 'slack') {
      // WHY: Default changed from 'sign-in-with-slack' to 'slack'. Auth0's
      // built-in "Sign in with Slack" uses Slack's legacy OAuth v1 which only
      // supports identity.* scopes. A custom social connection using Slack's
      // OAuth v2 (/oauth/v2/authorize) is required for Web API scopes.
      return this.config.get<string>('AUTH0_CONNECTION_SLACK') ?? 'slack';
    }

    return this.config.get<string>('AUTH0_CONNECTION_GITHUB') ?? 'github';
  }

  private resolveAuth0ConnectionScope(provider: 'slack' | 'github'): string {
    const raw =
      provider === 'slack'
        // WHY: Auth0's built-in slack-oauth-2 connection passes connection_scope
        // as user_scope in Slack OAuth v2. Only user-token-compatible scopes
        // are valid here — chat:write is a bot-only scope and causes
        // "invalid_scope" from Slack when passed as user_scope.
        // admin.* scopes require Slack Enterprise Grid — omitted from defaults.
        // See: https://api.slack.com/scopes
        ? (this.config.get<string>('AUTH0_CONNECTION_SCOPE_SLACK') ??
            'users:read,users:read.email,team:read,channels:read')
        : (this.config.get<string>('AUTH0_CONNECTION_SCOPE_GITHUB') ??
            'read:org,read:user,repo,read:audit_log,admin:org');

    // WHY: Auth0 expects connection_scope as comma-separated values. Normalize
    // comma or whitespace input so envs remain backward compatible.
    return raw
      .split(/[\s,]+/)
      .map((scope) => scope.trim())
      .filter(Boolean)
      .join(',');
  }

  private buildAuth0AuthorizeUrl(provider: 'slack' | 'github'): string {
    const baseUrl = this.config.get<string>('AUTH0_BASE_URL');

    if (!baseUrl) {
      throw new BadRequestException(
        'Auth0 configuration is incomplete for integration connect flow',
      );
    }

    // WHY: Use our app's /auth/login route with connection params to trigger
    // an /authorize flow that stores tokens in Token Vault. The login route
    // strips the organization param to avoid Auth0 rejecting the request
    // (social connections can't always be added to org connection lists).
    // The SDK sets state/nonce cookies so the callback succeeds.
    const params = new URLSearchParams({
      returnTo: '/integrations',
      connection: this.resolveAuth0Connection(provider),
      connection_scope: this.resolveAuth0ConnectionScope(provider),
      prompt: 'consent',
    });

    return `${baseUrl}/auth/login?${params.toString()}`;
  }
}
