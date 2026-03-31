import { Controller, Get } from '@nestjs/common';
import { MetricsService, DashboardMetrics } from './metrics.service';

@Controller('api/metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('dashboard')
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.metricsService.getDashboardMetrics();
  }

  @Get('trend')
  async getTrend(): Promise<Array<{ date: string; count: number }>> {
    return this.metricsService.getMetricsTrend();
  }
}
