import { useState, useCallback, useEffect } from 'react';
import {
  apiGetSalesTrend,
  type SalesTrendResponse,
  type SalesTrendParams,
  type SalesTrendPoint,
} from '@/services/api';
import type { AnalyticsPeriod } from '@/hooks/useAnalyticsOverview';

export type { SalesTrendResponse, SalesTrendParams, SalesTrendPoint };

export interface UseSalesTrendOptions {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  autoFetch?: boolean;
}

export interface UseSalesTrendReturn {
  salesTrend: SalesTrendResponse | null;
  points: SalesTrendPoint[];
  isLoading: boolean;
  error: string | null;
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  setPeriod: (period: AnalyticsPeriod) => void;
  setDateRange: (startDate?: string, endDate?: string) => void;
  refetch: (paramsOverride?: SalesTrendParams) => Promise<SalesTrendResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/analytics/sales-trend
 * and manage sales & order frequency trend data.
 */
export function useSalesTrend(
  options: UseSalesTrendOptions = {}
): UseSalesTrendReturn {
  const {
    period: initialPeriod = 'today',
    startDate: initialStartDate,
    endDate: initialEndDate,
    autoFetch = true,
  } = options;

  const [period, setPeriodState] = useState<AnalyticsPeriod>(initialPeriod);
  const [startDate, setStartDate] = useState<string | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);

  const [salesTrend, setSalesTrend] = useState<SalesTrendResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesTrend = useCallback(
    async (paramsOverride?: SalesTrendParams): Promise<SalesTrendResponse | null> => {
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
        const queryParams: SalesTrendParams = paramsOverride || (
          effectiveStart && effectiveEnd
            ? { period: 'custom', start_date: effectiveStart, end_date: effectiveEnd }
            : { period: effectivePeriod }
        );

        const data = await apiGetSalesTrend(queryParams);
        setSalesTrend(data);
        return data;
      } catch (err: any) {
        const message = err?.message || 'Failed to fetch sales trend';
        setError(message);
        console.warn('Could not load sales trend:', err);
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
      fetchSalesTrend({
        period: 'custom',
        start_date: newStart,
        end_date: newEnd,
      });
    }
  }, [fetchSalesTrend]);

  useEffect(() => {
    if (autoFetch) {
      if (period === 'custom' && (!startDate || !endDate)) {
        return;
      }
      fetchSalesTrend();
    }
  }, [autoFetch, fetchSalesTrend, period, startDate, endDate]);

  return {
    salesTrend,
    points: salesTrend?.points || [],
    isLoading,
    error,
    period,
    startDate,
    endDate,
    setPeriod,
    setDateRange,
    refetch: fetchSalesTrend,
  };
}
