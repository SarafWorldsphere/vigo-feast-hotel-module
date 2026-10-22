import { useState, useCallback, useEffect } from 'react';
import {
  apiGetEarnings,
  type EarningsResponse,
  type EarningsSummary,
  type EarningsParams,
} from '@/services/api';

export type { EarningsResponse, EarningsSummary, EarningsParams };

export type EarningsPeriod = 'today' | 'week' | 'month' | 'custom';

export interface UseEarningsOptions {
  period?: EarningsPeriod;
  startDate?: string;
  endDate?: string;
  autoFetch?: boolean;
}

export interface UseEarningsReturn {
  earnings: EarningsResponse | null;
  summary: EarningsSummary | null;
  isLoading: boolean;
  error: string | null;
  period: EarningsPeriod;
  startDate?: string;
  endDate?: string;
  setPeriod: (period: EarningsPeriod) => void;
  setDateRange: (startDate?: string, endDate?: string) => void;
  refetch: (paramsOverride?: EarningsParams) => Promise<EarningsResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/restaurants/earnings
 * and manage earnings reporting state.
 *
 * Supports period presets ('today', 'week', 'month') and custom date ranges.
 */
export function useEarnings(
  options: UseEarningsOptions = {}
): UseEarningsReturn {
  const {
    period: initialPeriod = 'today',
    startDate: initialStartDate,
    endDate: initialEndDate,
    autoFetch = true,
  } = options;

  const [period, setPeriodState] = useState<EarningsPeriod>(initialPeriod);
  const [startDate, setStartDate] = useState<string | undefined>(initialStartDate);
  const [endDate, setEndDate] = useState<string | undefined>(initialEndDate);

  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = useCallback(
    async (paramsOverride?: EarningsParams): Promise<EarningsResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams: EarningsParams = paramsOverride || (
          startDate && endDate
            ? { period: period === 'custom' ? 'custom' : period, start_date: startDate, end_date: endDate }
            : { period }
        );

        const data = await apiGetEarnings(queryParams);
        setEarnings(data);
        return data;
      } catch (err: any) {
        const message = err?.message || 'Failed to fetch earnings data';
        setError(message);
        console.warn('Could not load earnings:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [period, startDate, endDate]
  );

  const setPeriod = useCallback((newPeriod: EarningsPeriod) => {
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
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchEarnings();
    }
  }, [autoFetch, fetchEarnings]);

  return {
    earnings,
    summary: earnings?.summary ?? null,
    isLoading,
    error,
    period,
    startDate,
    endDate,
    setPeriod,
    setDateRange,
    refetch: fetchEarnings,
  };
}
