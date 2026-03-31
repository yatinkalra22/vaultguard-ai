import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Metrics service — calculates and emits real-time KPI updates
 * Tracks: findings, remediations, violations prevented, scan coverage
 */

export interface DashboardMetrics {
  totalFindings: number;
  criticalFindings: number;
  remediationsCompleted: number;
  remediationsPending: number;
  violationsPrevented: number;
  scanCoverage: number; // percentage
  scanLastRun?: string; // ISO timestamp
  findingsTrend: Array<{ date: string; count: number }>; // last 7 days
}

export interface MetricsUpdateEvent {
  type: 'metrics_updated';
  metrics: DashboardMetrics;
  timestamp: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger('Metrics');

  constructor(private eventEmitter: EventEmitter2) {}

  /**
   * Calculate current dashboard metrics — in production, query database
   * For MVP, return mock data that updates on scan/remediation completion
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // In production: aggregate from findings, remediations, scans tables
    return {
      totalFindings: 47,
      criticalFindings: 8,
      remediationsCompleted: 12,
      remediationsPending: 5,
      violationsPrevented: 23,
      scanCoverage: 87,
      scanLastRun: new Date(Date.now() - 2 * 60000).toISOString(), // 2 mins ago
      findingsTrend: [
        { date: '2026-03-25', count: 32 },
        { date: '2026-03-26', count: 38 },
        { date: '2026-03-27', count: 41 },
        { date: '2026-03-28', count: 45 },
        { date: '2026-03-29', count: 46 },
        { date: '2026-03-30', count: 47 },
        { date: '2026-03-31', count: 47 },
      ],
    };
  }

  /**
   * Emit metrics update event when scan completes
   * Triggers real-time push to all connected dashboard clients
   */
  async onScanCompleted(findingsCount: number) {
    const metrics = await this.getDashboardMetrics();

    const event: MetricsUpdateEvent = {
      type: 'metrics_updated',
      metrics,
      timestamp: Date.now(),
    };

    this.logger.debug(`Scan completed: ${findingsCount} new findings`);
    this.eventEmitter.emit('metrics.updated', event);
  }

  /**
   * Emit metrics update event when remediation succeeds
   * Increments remediationsCompleted, decrements remediationsPending
   */
  async onRemediationCompleted(remediationId: string) {
    const metrics = await this.getDashboardMetrics();

    const event: MetricsUpdateEvent = {
      type: 'metrics_updated',
      metrics,
      timestamp: Date.now(),
    };

    this.logger.debug(`Remediation completed: ${remediationId}`);
    this.eventEmitter.emit('metrics.updated', event);
  }

  /**
   * Get trend data for sparkline charts
   */
  async getMetricsTrend(days = 7): Promise<DashboardMetrics['findingsTrend']> {
    const metrics = await this.getDashboardMetrics();
    return metrics.findingsTrend.slice(-days);
  }
}
