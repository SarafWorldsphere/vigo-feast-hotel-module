import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  apiGetRestaurantProfile,
  apiUpdateRestaurantProfile,
  RestaurantProfileResponse,
  RestaurantProfileUpdatePayload,
  RestaurantImagesResponse,
  RestaurantRatingResponse,
  RestaurantAddressResponse,
} from '@/services/api';

export type {
  RestaurantProfileResponse,
  RestaurantProfileUpdatePayload,
  RestaurantImagesResponse,
  RestaurantRatingResponse,
  RestaurantAddressResponse,
};

export interface UseRestaurantProfileOptions {
  autoFetch?: boolean;
}

export interface UseRestaurantProfileReturn {
  profile: RestaurantProfileResponse | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  fetchProfile: () => Promise<RestaurantProfileResponse | null>;
  refetch: () => Promise<RestaurantProfileResponse | null>;
  updateProfile: (
    payload: RestaurantProfileUpdatePayload,
    options?: { showToast?: boolean }
  ) => Promise<RestaurantProfileResponse>;
  resetError: () => void;
  setProfile: React.Dispatch<React.SetStateAction<RestaurantProfileResponse | null>>;
}

/**
 * Custom React hook to fetch GET /api/v1/restaurants/me/profile
 * and manage restaurant profile state and updates.
 *
 * Automatically calls GET /api/v1/restaurants/me/profile on mount when autoFetch is true.
 */
export function useRestaurantProfile(
  options: UseRestaurantProfileOptions = { autoFetch: true }
): UseRestaurantProfileReturn {
  const { autoFetch = true } = options;
  const [profile, setProfile] = useState<RestaurantProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useApp();

  const resetError = useCallback(() => setError(null), []);

  const fetchProfile = useCallback(async (): Promise<RestaurantProfileResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetRestaurantProfile();
      setProfile(data);
      return data;
    } catch (err: any) {
      const message = err?.message || 'Failed to fetch restaurant profile';
      setError(message);
      console.warn('Could not load restaurant profile:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchProfile();
    }
  }, [autoFetch, fetchProfile]);

  const updateProfile = useCallback(
    async (
      payload: RestaurantProfileUpdatePayload,
      toastOptions: { showToast?: boolean } = { showToast: true }
    ): Promise<RestaurantProfileResponse> => {
      setIsUpdating(true);
      setError(null);
      try {
        const updated = await apiUpdateRestaurantProfile(payload);
        setProfile(updated);
        if (toastOptions.showToast !== false) {
          addToast({
            type: 'success',
            title: 'Basic information updated',
            message: 'Restaurant profile details have been updated successfully.',
          });
        }
        return updated;
      } catch (err: any) {
        const message = err?.message || 'Failed to update restaurant profile';
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
    profile,
    isLoading,
    isUpdating,
    error,
    fetchProfile,
    refetch: fetchProfile,
    updateProfile,
    resetError,
    setProfile,
  };
}

export const useGetRestaurantProfile = useRestaurantProfile;
