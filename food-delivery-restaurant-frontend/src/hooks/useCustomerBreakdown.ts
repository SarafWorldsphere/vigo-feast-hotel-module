import { useState, useCallback, useEffect } from 'react';
import {
  apiGetCustomerBreakdown,
  type CustomerBreakdownResponse,
  type CustomerBreakdownParams,
} from '@/services/api';
import type { AnalyticsPeriod } from '@/hooks/useAnalyticsOverview';

export type { CustomerBreakdownResponse, CustomerBreakdownParams };

export interface UseCustomerBreakdownOptions {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  autoFetch?: boolean;
}

export interface UseCustomerBreakdownReturn {
  breakdown: CustomerBreakdownResponse | null;
  isLoading: boolean;
  error: string | null;
  period: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  setPeriod: (period: AnalyticsPeriod) => void;
  setDateRange: (startDate?: string, endDate?: string) => void;
  refetch: (paramsOverride?: CustomerBreakdownParams) => Promise<CustomerBreakdownResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/analytics/customer-breakdown
 * and manage new vs. returning patron distribution state.
 */
export function useCustomerBreakdown(
  options: UseCustomerBreakdownOptions = {}
): UseCustomerBreakdownReturn {
  const {
    period: initialPeriod = 'today',
    startDate: initialStartDate,
    endDate: initialEndDate,
    autoFetch = true,
  } = options;

  const [period, setPeriodState] = useState<AnalyticsPeriod>(initialPeriod);
  const [startDate, setStartDate] = useState<string | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);

  const [breakdown, setBreakdown] = useState<CustomerBreakdownResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchBreakdown = useCallback(
    async (paramsOverride?: CustomerBreakdownParams): Promise<CustomerBreakdownResponse | null> => {
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
        const queryParams: CustomerBreakdownParams = paramsOverride || (
          effectiveStart && effectiveEnd
            ? { period: 'custom', start_date: effectiveStart, end_date: effectiveEnd }
            : { period: effectivePeriod }
        );

        const data = await apiGetCustomerBreakdown(queryParams);
        setBreakdown(data);
        return data;
      } catch (err: any) {
        const message = err?.message || 'Failed to fetch customer breakdown';
        setError(message);
        console.warn('Could not load customer breakdown:', err);
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
      fetchBreakdown({
        period: 'custom',
        start_date: newStart,
        end_date: newEnd,
      });
    }
  }, [fetchBreakdown]);

  useEffect(() => {
    if (autoFetch) {
      if (period === 'custom' && (!startDate || !endDate)) {
        return;
      }
      fetchBreakdown();
    }
  }, [autoFetch, fetchBreakdown, period, startDate, endDate]);

  return {
    breakdown,
    isLoading,
    error,
    period,
    startDate,
    endDate,
    setPeriod,
    setDateRange,
    refetch: fetchBreakdown,
  };
}
