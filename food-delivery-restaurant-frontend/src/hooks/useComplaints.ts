import { useState, useCallback, useEffect } from 'react';
import {
  apiGetComplaints,
  apiUpdateComplaintStatus,
  apiCreateComplaintRefund,
  type BackendComplaint,
  type BackendComplaintListResponse,
  type BackendComplaintStatus,
  type BackendComplaintCategory,
  type ComplaintQueryParams,
  type RefundCreatePayload,
  type RefundResponse,
  type RefundDestination,
} from '@/services/api';

export type {
  BackendComplaint,
  BackendComplaintListResponse,
  BackendComplaintStatus,
  BackendComplaintCategory,
  ComplaintQueryParams,
  RefundCreatePayload,
  RefundResponse,
  RefundDestination,
};

export interface CreateRefundParams {
  amount: number;
  reason: string;
  destination_method: RefundDestination;
  idempotency_key?: string;
}

export interface UseComplaintsOptions extends ComplaintQueryParams {
  autoFetch?: boolean;
}

export interface UseComplaintsReturn {
  complaintsData: BackendComplaintListResponse | null;
  complaints: BackendComplaint[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  error: string | null;
  refetch: (overrideParams?: ComplaintQueryParams) => Promise<BackendComplaintListResponse | null>;
  updateStatus: (
    complaintId: number | string,
    status: 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED',
    note?: string
  ) => Promise<BackendComplaint | null>;
  createRefund: (
    complaintId: number | string,
    payload: CreateRefundParams
  ) => Promise<RefundResponse>;
}

/**
 * Custom React hook to call GET /api/v1/complaints?status=OPEN&limit=20&offset=0
 * and manage restaurant complaints, filtering, pagination, and status updates.
 */
export function useComplaints(
  options: UseComplaintsOptions = {}
): UseComplaintsReturn {
  const {
    status = 'OPEN',
    category,
    limit = 20,
    offset = 0,
    autoFetch = true,
  } = options;

  const [complaintsData, setComplaintsData] = useState<BackendComplaintListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchComplaints = useCallback(
    async (overrideParams?: ComplaintQueryParams): Promise<BackendComplaintListResponse | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams: ComplaintQueryParams = {
          status,
          category,
          limit,
          offset,
          ...overrideParams,
        };
        const data = await apiGetComplaints(queryParams);
        setComplaintsData(data);
        return data;
      } catch (err: any) {
        const message = err?.message || 'Failed to load complaints';
        setError(message);
        console.warn('Could not load complaints:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [status, category, limit, offset]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchComplaints();
    }
  }, [autoFetch, fetchComplaints]);

  const updateStatus = useCallback(
    async (
      complaintId: number | string,
      newStatus: 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED',
      note?: string
    ): Promise<BackendComplaint | null> => {
      try {
        const updated = await apiUpdateComplaintStatus(complaintId, {
          status: newStatus,
          note,
        });

        // Update local state if the complaint is present
        setComplaintsData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((c) =>
              c.complaint_id === Number(complaintId) ? updated : c
            ),
          };
        });

        return updated;
      } catch (err: any) {
        console.error('Failed to update complaint status:', err);
        throw err;
      }
    },
    []
  );

  const createRefund = useCallback(
    async (
      complaintId: number | string,
      payload: CreateRefundParams
    ): Promise<RefundResponse> => {
      try {
        const idempotencyKey =
          payload.idempotency_key ||
          (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              }));

        return await apiCreateComplaintRefund(complaintId, {
          amount: payload.amount,
          reason: payload.reason.trim(),
          destination_method: payload.destination_method,
          idempotency_key: idempotencyKey,
        });
      } catch (err: any) {
        console.error('Failed to create complaint refund:', err);
        throw err;
      }
    },
    []
  );

  const complaints = complaintsData?.items || [];
  const total = complaintsData?.total ?? 0;

  return {
    complaintsData,
    complaints,
    total,
    limit: complaintsData?.limit ?? limit,
    offset: complaintsData?.offset ?? offset,
    isLoading,
    error,
    refetch: fetchComplaints,
    updateStatus,
    createRefund,
  };
}
