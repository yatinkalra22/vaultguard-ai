import { useEffect, useRef, useState } from 'react';
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

// WHY: Poll at 30s to avoid visible flicker. Event-driven refresh handles
// immediate updates (scan complete, remediation success).
const POLL_INTERVAL_MS = 30_000;

export function useMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastJsonRef = useRef<string>('');

  useEffect(() => {
    let isInitial = true;

    const fetchMetrics = async () => {
      try {
        // WHY: Only show loading state on first fetch — subsequent polls
        // should silently update to prevent UI flicker.
        if (isInitial) setLoading(true);

        const data = await api.get<DashboardMetrics>('metrics/dashboard');

        // WHY: Skip setState if data hasn't changed to avoid re-renders
        const json = JSON.stringify(data);
        if (json !== lastJsonRef.current) {
          lastJsonRef.current = json;
          setMetrics(data);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
      } finally {
        if (isInitial) {
          setLoading(false);
          isInitial = false;
        }
      }
    };

    fetchMetrics();

    const interval = setInterval(fetchMetrics, POLL_INTERVAL_MS);

    // WHY: Event-driven refresh for immediate updates after user actions
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
