import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  public readonly client: SupabaseClient;

  constructor(private config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    // WHY: Using service_role key (not anon key) for backend — this bypasses RLS
    // so server-side operations aren't blocked. RLS policies still protect the
    // Supabase REST API if accessed directly from clients.
    // See: https://supabase.com/docs/guides/api/api-keys#service-role-key
    this.client = createClient(url, key, {
      auth: {
        // WHY: Disable auto-refresh and session persistence — this is a server-side
        // client, not a browser client. Avoids unnecessary token refresh attempts.
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
