import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface DashboardMetrics {
  totalFindings: number;
  criticalFindings: number;
  remediationsCompleted: number;
  remediationsPending: number;
  violationsPrevented: number;
  scanCoverage: number;
  scanLastRun?: string;
  findingsTrend: Array<{ date: string; count: number }>;
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch initial metrics
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await api.get<DashboardMetrics>('metrics/dashboard');
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Poll for updates every 5 seconds
    // In production: upgrade to WebSocket for true real-time
    const interval = setInterval(fetchMetrics, 5000);

    // Listen for toast events that indicate metrics changed
    // When scan completes or remediation succeeds, refresh metrics
    window.addEventListener('custom:metricsUpdated', fetchMetrics);

    return () => {
      clearInterval(interval);
      window.removeEventListener('custom:metricsUpdated', fetchMetrics);
    };
  }, []);

  return { metrics, loading, error };
}

/**
 * Emit custom event when metrics should be refreshed
 * Called from scanning/remediation success handlers
 */
export function triggerMetricsRefresh() {
  window.dispatchEvent(new CustomEvent('custom:metricsUpdated'));
}
