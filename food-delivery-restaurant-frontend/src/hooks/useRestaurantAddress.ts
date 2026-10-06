import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  apiGetRestaurantAddress,
  apiUpdateRestaurantAddress,
  RestaurantAddressResponse,
  RestaurantAddressUpdatePayload,
} from '@/services/api';

export type { RestaurantAddressResponse, RestaurantAddressUpdatePayload };

export interface UpdateRestaurantAddressParams {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  // CamelCase convenience aliases
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
}

export interface UseUpdateRestaurantAddressReturn {
  updateAddress: (
    params: UpdateRestaurantAddressParams,
    options?: { showToast?: boolean }
  ) => Promise<RestaurantAddressResponse>;
  isUpdating: boolean;
  error: string | null;
  resetError: () => void;
}

export interface UseRestaurantAddressReturn {
  address: RestaurantAddressResponse | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  fetchAddress: () => Promise<RestaurantAddressResponse | null>;
  updateAddress: (
    params: UpdateRestaurantAddressParams,
    options?: { showToast?: boolean }
  ) => Promise<RestaurantAddressResponse>;
  resetError: () => void;
  setAddress: React.Dispatch<React.SetStateAction<RestaurantAddressResponse | null>>;
}

/**
 * Normalizes input parameters (supporting both snake_case and camelCase)
 * to RestaurantAddressUpdatePayload for the backend API.
 */
function toAddressPayload(params: UpdateRestaurantAddressParams): RestaurantAddressUpdatePayload {
  const payload: RestaurantAddressUpdatePayload = {};

  const line1 = params.address_line1 !== undefined ? params.address_line1 : params.addressLine1;
  if (line1 !== undefined) payload.address_line1 = line1.trim();

  const line2 = params.address_line2 !== undefined ? params.address_line2 : params.addressLine2;
  if (line2 !== undefined) payload.address_line2 = line2.trim();

  if (params.city !== undefined) payload.city = params.city.trim();
  if (params.state !== undefined) payload.state = params.state.trim();

  const postal = params.postal_code !== undefined ? params.postal_code : params.postalCode;
  if (postal !== undefined) payload.postal_code = postal.trim();

  return payload;
}

/**
 * Custom React hook to update restaurant address via PATCH /restaurants/me/address
 */
export function useUpdateRestaurantAddress(): UseUpdateRestaurantAddressReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useApp();

  const resetError = useCallback(() => setError(null), []);

  const updateAddress = useCallback(
    async (
      params: UpdateRestaurantAddressParams,
      options: { showToast?: boolean } = { showToast: true }
    ): Promise<RestaurantAddressResponse> => {
      setIsUpdating(true);
      setError(null);

      try {
        const payload = toAddressPayload(params);
        const response = await apiUpdateRestaurantAddress(payload);

        if (options.showToast !== false) {
          addToast({
            type: 'success',
            title: 'Address updated',
            message: 'Restaurant location and address have been updated.',
          });
        }

        return response;
      } catch (err: any) {
        const message = err?.message || 'Failed to update restaurant address';
        setError(message);
        if (options.showToast !== false) {
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
    updateAddress,
    isUpdating,
    error,
    resetError,
  };
}

/**
 * Custom React hook to fetch and update restaurant address details
 */
export function useRestaurantAddress(autoFetch = false): UseRestaurantAddressReturn {
  const [address, setAddress] = useState<RestaurantAddressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { updateAddress: rawUpdate, isUpdating, error, resetError } = useUpdateRestaurantAddress();

  const fetchAddress = useCallback(async (): Promise<RestaurantAddressResponse | null> => {
    setIsLoading(true);
    try {
      const data = await apiGetRestaurantAddress();
      setAddress(data);
      return data;
    } catch (err: any) {
      console.warn('Could not load restaurant address:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchAddress();
    }
  }, [autoFetch, fetchAddress]);

  const updateAddress = useCallback(
    async (
      params: UpdateRestaurantAddressParams,
      options?: { showToast?: boolean }
    ): Promise<RestaurantAddressResponse> => {
      const updated = await rawUpdate(params, options);
      setAddress(updated);
      return updated;
    },
    [rawUpdate]
  );

  return {
    address,
    isLoading,
    isUpdating,
    error,
    fetchAddress,
    updateAddress,
    resetError,
    setAddress,
  };
}
