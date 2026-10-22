import { useState, useCallback, useEffect } from 'react';
import {
  apiGetAnalyticsOverview,
  type AnalyticsOverviewResponse,
  type AnalyticsOverviewParams,
  type AnalyticsMetric,
} from '@/services/api';

export type { AnalyticsOverviewResponse, AnalyticsOverviewParams, AnalyticsMetric };

export type AnalyticsPeriod = 'today' | 'week' | 'weekly' | 'month' | 'monthly' | 'custom';

export interface UseAnalyticsOverviewOptions {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  autoFetch?: boolean;
}

export interface UseAnalyticsOverviewReturn {
  overview: AnalyticsOverviewResponse | null;
  isLoading: boolean;
  error: string | null;
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  setPeriod: (period: AnalyticsPeriod) => void;
  setDateRange: (startDate?: string, endDate?: string) => void;
  refetch: (paramsOverride?: AnalyticsOverviewParams) => Promise<AnalyticsOverviewResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/analytics/overview
 * and manage analytics overview metrics state.
 *
 * Supports period presets ('today', 'week', 'month') and custom date ranges.
 */
export function useAnalyticsOverview(
  options: UseAnalyticsOverviewOptions = {}
): UseAnalyticsOverviewReturn {
  const {
    period: initialPeriod = 'today',
    startDate: initialStartDate,
    endDate: initialEndDate,
    autoFetch = true,
  } = options;

  const [period, setPeriodState] = useState<AnalyticsPeriod>(initialPeriod);
  const [startDate, setStartDate] = useState<string | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(
    async (paramsOverride?: AnalyticsOverviewParams): Promise<AnalyticsOverviewResponse | null> => {
      const effectivePeriod = paramsOverride?.period || period;
      const effectiveStart = paramsOverride?.start_date ?? startDate;
      const effectiveEnd = paramsOverride?.end_date ?? endDate;

      // Prevent calling custom period without both start_date and end_date
      if (effectivePeriod === 'custom' && (!effectiveStart || !effectiveEnd)) {
        setIsLoading(false);
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const queryParams: AnalyticsOverviewParams = paramsOverride || (
          effectiveStart && effectiveEnd
            ? { period: 'custom', start_date: effectiveStart, end_date: effectiveEnd }
            : { period: effectivePeriod }
        );

        const data = await apiGetAnalyticsOverview(queryParams);
        setOverview(data);
        return data;
      } catch (err: any) {
        const message = err?.message || 'Failed to fetch analytics overview';
        setError(message);
        console.warn('Could not load analytics overview:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [period, startDate, endDate]
  );

  const setPeriod = useCallback((newPeriod: AnalyticsPeriod) => {
    setPeriodState(newPeriod);
    if (newPeriod !== 'custom') {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, []);

  const setDateRange = useCallback((newStart?: string, newEnd?: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    if (newStart && newEnd) {
      setPeriodState('custom');
      fetchOverview({
        period: 'custom',
        start_date: newStart,
        end_date: newEnd,
      });
    }
  }, [fetchOverview]);

  useEffect(() => {
    if (autoFetch) {
      if (period === 'custom' && (!startDate || !endDate)) {
        return;
      }
      fetchOverview();
    }
  }, [autoFetch, fetchOverview, period, startDate, endDate]);

  return {
    overview,
    isLoading,
    error,
    period,
    startDate,
    endDate,
    setPeriod,
    setDateRange,
    refetch: fetchOverview,
  };
}
