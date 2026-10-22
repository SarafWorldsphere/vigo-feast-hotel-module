import { useState, useCallback, useEffect } from 'react';
import { apiGetDashboard, type DashboardResponse } from '@/services/api';

export type { DashboardResponse };

export interface UseDashboardOptions {
  autoFetch?: boolean;
}

export interface UseDashboardReturn {
  dashboard: DashboardResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<DashboardResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/restaurants/dashboard
 * and manage dashboard state.
 *
 * Automatically fetches on mount when autoFetch is true (default).
 */
export function useDashboard(
  options: UseDashboardOptions = { autoFetch: true }
): UseDashboardReturn {
  const { autoFetch = true } = options;

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (): Promise<DashboardResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetDashboard();
      setDashboard(data);
      return data;
    } catch (err: any) {
      const message = err?.message || 'Failed to fetch dashboard data';
      setError(message);
      console.warn('Could not load dashboard:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchDashboard();
    }
  }, [autoFetch, fetchDashboard]);

  return {
    dashboard,
    isLoading,
    error,
    refetch: fetchDashboard,
  };
}
