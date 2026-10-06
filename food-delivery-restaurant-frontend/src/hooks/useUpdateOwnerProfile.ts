import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  apiUpdateOwnerProfile,
  OwnerProfileResponse,
  OwnerProfileUpdatePayload,
} from '@/services/api';

export type {
  OwnerProfileResponse,
  OwnerProfileUpdatePayload,
};

export interface UseUpdateOwnerProfileReturn {
  updateOwnerProfile: (
    payload: OwnerProfileUpdatePayload,
    options?: { showToast?: boolean }
  ) => Promise<OwnerProfileResponse>;
  isUpdating: boolean;
  error: string | null;
  resetError: () => void;
}

/**
 * Custom React hook dedicated to calling PATCH /api/v1/owners/me/profile
 * to update owner profile details (name, email, phone).
 */
export function useUpdateOwnerProfile(): UseUpdateOwnerProfileReturn {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useApp();

  const resetError = useCallback(() => setError(null), []);

  const updateOwnerProfile = useCallback(
    async (
      payload: OwnerProfileUpdatePayload,
      toastOptions: { showToast?: boolean } = { showToast: true }
    ): Promise<OwnerProfileResponse> => {
      setIsUpdating(true);
      setError(null);
      try {
        // Enforce that only name, email, phone can be sent
        // is_verified and is_active must NEVER come from or be sent by the frontend
        const cleanPayload: OwnerProfileUpdatePayload = {};
        if (payload.name !== undefined) cleanPayload.name = payload.name.trim();
        if (payload.email !== undefined) cleanPayload.email = payload.email.trim();
        if (payload.phone !== undefined) cleanPayload.phone = payload.phone.trim();

        const updated = await apiUpdateOwnerProfile(cleanPayload);
        if (toastOptions.showToast !== false) {
          addToast({
            type: 'success',
            title: 'Profile updated',
            message: 'Owner profile details updated successfully.',
          });
        }
        return updated;
      } catch (err: any) {
        const message = err?.message || 'Failed to update owner profile';
        setError(message);
        if (toastOptions.showToast !== false) {
          addToast({
            type: 'error',
            title: 'Update failed',
            message,
          });
        }
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [addToast]
  );

  return {
    updateOwnerProfile,
    isUpdating,
    error,
    resetError,
  };
}
