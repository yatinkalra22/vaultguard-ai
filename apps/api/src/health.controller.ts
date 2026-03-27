import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// WHY: Health checks are called frequently by load balancers and uptime monitors.
// Throttling them would cause false-positive downtime alerts.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'vaultguard-api',
      timestamp: new Date().toISOString(),
    };
  }
}
