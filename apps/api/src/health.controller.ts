import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SupabaseService } from './common/supabase.service';

// WHY: Health checks are called frequently by load balancers and uptime monitors.
// Throttling them would cause false-positive downtime alerts.
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async check() {
    const { error } = await this.supabase.client
      .from('organizations')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    if (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'vaultguard-api',
        database: 'down',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      service: 'vaultguard-api',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
