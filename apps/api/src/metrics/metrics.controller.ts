import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MetricsService, DashboardMetrics } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user?: {
    orgId?: string;
    org_id?: string;
  };
}

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('dashboard')
  async getDashboardMetrics(
    @Req() req: AuthenticatedRequest,
  ): Promise<DashboardMetrics> {
    const orgId = req.user?.orgId ?? req.user?.org_id ?? 'default';
    return this.metricsService.getDashboardMetrics(orgId);
  }

  @Get('trend')
  async getTrend(
    @Req() req: AuthenticatedRequest,
  ): Promise<Array<{ date: string; count: number }>> {
    const orgId = req.user?.orgId ?? req.user?.org_id ?? 'default';
    return this.metricsService.getMetricsTrend(orgId);
  }
}
