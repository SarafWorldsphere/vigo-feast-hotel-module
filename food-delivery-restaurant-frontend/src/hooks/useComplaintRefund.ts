import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  apiCreateComplaintRefund,
  type RefundCreatePayload,
  type RefundResponse,
  type BackendRefund,
  type RefundDestination,
  type RefundStatus,
} from '@/services/api';

export type {
  RefundCreatePayload,
  RefundResponse,
  BackendRefund,
  RefundDestination,
  RefundStatus,
};

export interface CreateComplaintRefundInput {
  amount: number;
  reason: string;
  destination_method: RefundDestination;
  idempotency_key?: string;
}

export interface UseComplaintRefundOptions {
  showToast?: boolean;
  onSuccess?: (data: RefundResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseComplaintRefundReturn {
  createRefund: (
    complaintId: number | string,
    payload: CreateComplaintRefundInput,
    overrideOptions?: { showToast?: boolean }
  ) => Promise<RefundResponse>;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  data: RefundResponse | null;
  reset: () => void;
}

/**
 * Generates an RFC4122 v4 UUID for request idempotency.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Custom React hook to call POST /api/v1/complaints/{complaint_id}/refunds
 *
 * Provides:
 * - `createRefund(complaintId, payload)`: Triggers the refund API request.
 * - Automatic UUID generation for `idempotency_key` if not explicitly supplied.
 * - Loading, success, error, and response data state management.
 * - Optional user feedback toast notifications via AppContext.
 */
export function useComplaintRefund(
  options: UseComplaintRefundOptions = {}
): UseComplaintRefundReturn {
  const { showToast: defaultShowToast = true, onSuccess, onError } = options;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RefundResponse | null>(null);

  const { addToast } = useApp();

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(false);
    setError(null);
    setData(null);
  }, []);

  const createRefund = useCallback(
    async (
      complaintId: number | string,
      payload: CreateComplaintRefundInput,
      overrideOptions?: { showToast?: boolean }
    ): Promise<RefundResponse> => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);

      const showToast = overrideOptions?.showToast ?? defaultShowToast;

      try {
        const fullPayload: RefundCreatePayload = {
          amount: Number(payload.amount),
          reason: payload.reason.trim(),
          destination_method: payload.destination_method,
          idempotency_key: payload.idempotency_key || generateUUID(),
        };

        const result = await apiCreateComplaintRefund(complaintId, fullPayload);

        setData(result);
        setIsSuccess(true);

        if (showToast && addToast) {
          addToast({
            type: 'success',
            title: 'Refund Initiated',
            message: `Refund of ₹${result.amount} created with status ${result.status}.`,
          });
        }

        onSuccess?.(result);
        return result;
      } catch (err: any) {
        const message = err?.message || 'Failed to create refund request';
        setError(message);
        setIsSuccess(false);

        if (showToast && addToast) {
          addToast({
            type: 'error',
            title: 'Refund Request Failed',
            message,
          });
        }

        const errorObj = err instanceof Error ? err : new Error(message);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [defaultShowToast, addToast, onSuccess, onError]
  );

  return {
    createRefund,
    isLoading,
    isSuccess,
    error,
    data,
    reset,
  };
}

// Export useRefund as an alias for convenience
export const useRefund = useComplaintRefund;
