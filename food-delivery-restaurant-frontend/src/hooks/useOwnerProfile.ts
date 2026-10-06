import { useState, useCallback, useEffect } from 'react';
import {
  apiGetOwnerProfile,
  OwnerProfileResponse,
  OwnerProfileUpdatePayload,
} from '@/services/api';
import {
  useUpdateOwnerProfile,
  type UseUpdateOwnerProfileReturn,
} from './useUpdateOwnerProfile';

export { useUpdateOwnerProfile };
export type {
  UseUpdateOwnerProfileReturn,
  OwnerProfileResponse,
  OwnerProfileUpdatePayload,
};

export interface UseOwnerProfileOptions {
  autoFetch?: boolean;
}

export interface UseOwnerProfileReturn {
  ownerProfile: OwnerProfileResponse | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  fetchOwnerProfile: () => Promise<OwnerProfileResponse | null>;
  refetch: () => Promise<OwnerProfileResponse | null>;
  updateOwnerProfile: (
    payload: OwnerProfileUpdatePayload,
    options?: { showToast?: boolean }
  ) => Promise<OwnerProfileResponse>;
  resetError: () => void;
  setOwnerProfile: React.Dispatch<React.SetStateAction<OwnerProfileResponse | null>>;
}

/**
 * Custom React hook to fetch GET /api/v1/owners/me/profile
 * and manage owner profile state and updates (PATCH /api/v1/owners/me/profile).
 *
 * Automatically calls GET /api/v1/owners/me/profile on mount when autoFetch is true.
 */
export function useOwnerProfile(
  options: UseOwnerProfileOptions = { autoFetch: true }
): UseOwnerProfileReturn {
  const { autoFetch = true } = options;
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const {
    updateOwnerProfile: rawUpdate,
    isUpdating,
    error: updateError,
    resetError: resetUpdateError,
  } = useUpdateOwnerProfile();
  const [fetchError, setFetchError] = useState<string | null>(null);

  const resetError = useCallback(() => {
    resetUpdateError();
    setFetchError(null);
  }, [resetUpdateError]);

  const fetchOwnerProfile = useCallback(async (): Promise<OwnerProfileResponse | null> => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await apiGetOwnerProfile();
      setOwnerProfile(data);
      return data;
    } catch (err: any) {
      const message = err?.message || 'Failed to fetch owner profile';
      setFetchError(message);
      console.warn('Could not load owner profile:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchOwnerProfile();
    }
  }, [autoFetch, fetchOwnerProfile]);

  const updateOwnerProfile = useCallback(
    async (
      payload: OwnerProfileUpdatePayload,
      options?: { showToast?: boolean }
    ): Promise<OwnerProfileResponse> => {
      const updated = await rawUpdate(payload, options);
      setOwnerProfile(updated);
      return updated;
    },
    [rawUpdate]
  );

  return {
    ownerProfile,
    isLoading,
    isUpdating,
    error: updateError || fetchError,
    fetchOwnerProfile,
    refetch: fetchOwnerProfile,
    updateOwnerProfile,
    resetError,
    setOwnerProfile,
  };
}

export const useGetOwnerProfile = useOwnerProfile;
