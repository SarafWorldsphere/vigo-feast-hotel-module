import { useState, useCallback, useEffect } from 'react';
import {
  apiGetSettlements,
  type SettlementHistoryItem,
  type SettlementHistoryResponse,
  type SettlementHistoryParams,
} from '@/services/api';

export type { SettlementHistoryItem, SettlementHistoryResponse, SettlementHistoryParams };

export interface UseSettlementsOptions {
  limit?: number;
  offset?: number;
  autoFetch?: boolean;
}

export interface UseSettlementsReturn {
  settlements: SettlementHistoryItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  limit: number;
  offset: number;
  setPagination: (offset: number, limit?: number) => void;
  refetch: (paramsOverride?: SettlementHistoryParams) => Promise<SettlementHistoryResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/restaurants/settlements
 * and manage settlement history state.
 */
export function useSettlements(
  options: UseSettlementsOptions = {}
): UseSettlementsReturn {
  const { limit: initialLimit = 20, offset: initialOffset = 0, autoFetch = true } = options;

  const [limit, setLimit] = useState<number>(initialLimit);
  const [offset, setOffset] = useState<number>(initialOffset);
  const [settlements, setSettlements] = useState<SettlementHistoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlements = useCallback(
    async (paramsOverride?: SettlementHistoryParams): Promise<SettlementHistoryResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const params: SettlementHistoryParams = paramsOverride || { limit, offset };
        const data = await apiGetSettlements(params);
        setSettlements(data.settlements || []);
        setTotal(data.total || 0);
        return data;
      } catch (err: any) {
        const message = err?.message || 'Failed to fetch settlements';
        setError(message);
        console.warn('Could not load settlements:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [limit, offset]
  );

  const setPagination = useCallback((newOffset: number, newLimit?: number) => {
    setOffset(newOffset);
    if (newLimit !== undefined) {
      setLimit(newLimit);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchSettlements();
    }
  }, [autoFetch, fetchSettlements]);

  return {
    settlements,
    total,
    isLoading,
    error,
    limit,
    offset,
    setPagination,
    refetch: fetchSettlements,
  };
}
