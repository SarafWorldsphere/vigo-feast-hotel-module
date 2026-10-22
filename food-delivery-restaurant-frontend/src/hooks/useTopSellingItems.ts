import { useState, useCallback, useEffect } from 'react';
import {
  apiGetTopSellingItems,
  type TopSellingItemsResponse,
  type TopSellingItem,
  type TopSellingItemsParams,
} from '@/services/api';
import type { AnalyticsPeriod } from '@/hooks/useAnalyticsOverview';

export type { TopSellingItemsResponse, TopSellingItem, TopSellingItemsParams };

export interface UseTopSellingItemsOptions {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  autoFetch?: boolean;
}

export interface UseTopSellingItemsReturn {
  items: TopSellingItem[];
  response: TopSellingItemsResponse | null;
  isLoading: boolean;
  error: string | null;
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  setPeriod: (period: AnalyticsPeriod) => void;
  setDateRange: (startDate?: string, endDate?: string) => void;
  refetch: (paramsOverride?: TopSellingItemsParams) => Promise<TopSellingItemsResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/analytics/top-selling-items
 * and manage top-selling menu items by volume.
 */
export function useTopSellingItems(
  options: UseTopSellingItemsOptions = {}
): UseTopSellingItemsReturn {
  const {
    period: initialPeriod = 'today',
    startDate: initialStartDate,
    endDate: initialEndDate,
    autoFetch = true,
  } = options;

  const [period, setPeriodState] = useState<AnalyticsPeriod>(initialPeriod);
  const [startDate, setStartDate] = useState<string | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);

  const [response, setResponse] = useState<TopSellingItemsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(
    async (paramsOverride?: TopSellingItemsParams): Promise<TopSellingItemsResponse | null> => {
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
        const queryParams: TopSellingItemsParams = paramsOverride || (
          effectiveStart && effectiveEnd
            ? { period: 'custom', start_date: effectiveStart, end_date: effectiveEnd }
            : { period: effectivePeriod }
        );

        const data = await apiGetTopSellingItems(queryParams);
        setResponse(data);
        return data;
      } catch (err: any) {
        const message = err?.message || 'Failed to fetch top selling items';
        setError(message);
        console.warn('Could not load top selling items:', err);
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
      fetchItems({
        period: 'custom',
        start_date: newStart,
        end_date: newEnd,
      });
    }
  }, [fetchItems]);

  useEffect(() => {
    if (autoFetch) {
      if (period === 'custom' && (!startDate || !endDate)) {
        return;
      }
      fetchItems();
    }
  }, [autoFetch, fetchItems, period, startDate, endDate]);

  return {
    items: response?.items ?? [],
    response,
    isLoading,
    error,
    period,
    startDate,
    endDate,
    setPeriod,
    setDateRange,
    refetch: fetchItems,
  };
}
