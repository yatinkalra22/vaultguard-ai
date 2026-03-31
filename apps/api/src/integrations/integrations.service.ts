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

  private buildAuth0AuthorizeUrl(provider: 'slack' | 'github'): string {
    const domain = this.config.get<string>('AUTH0_DOMAIN');
    const clientId = this.config.get<string>('AUTH0_CLIENT_ID');
    const audience = this.config.get<string>('AUTH0_AUDIENCE');
    const baseUrl = this.config.get<string>('AUTH0_BASE_URL');

    if (!domain || !clientId || !audience || !baseUrl) {
      throw new BadRequestException(
        'Auth0 configuration is incomplete for integration connect flow',
      );
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: `${baseUrl}/api/auth/callback`,
      scope: 'openid profile email offline_access',
      audience,
      connection: provider,
      prompt: 'consent',
    });

    return `https://${domain}/authorize?${params.toString()}`;
  }
}
