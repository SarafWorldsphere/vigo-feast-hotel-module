import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Offer, OfferType } from '@/data/mockData';
import {
  apiCreateOffer,
  apiUpdateOffer,
  apiToggleOffer,
  apiDeleteOffer,
  mapBackendOfferToFrontend,
  CreateOfferPayload,
  UpdateOfferPayload,
} from '@/services/api';

export interface CreateOfferParams {
  name: string;
  offerCode?: string | null;
  offerType: OfferType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number;
  startAt: string;
  endAt: string;
  applicableCategories?: string[];
  applicableItems?: string[];
  categoryIds?: string[];
  menuItemIds?: string[];
}

export interface UseCreateOfferReturn {
  createOffer: (params: CreateOfferParams) => Promise<Offer>;
  isCreating: boolean;
  error: string | null;
  resetError: () => void;
}

/**
 * Custom React hook to create an offer via POST /api/v1/offers
 */
export function useCreateOffer(): UseCreateOfferReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { categories, menuItems, addToast } = useApp();

  const resetError = useCallback(() => setError(null), []);

  const createOffer = useCallback(
    async (params: CreateOfferParams): Promise<Offer> => {
      setIsCreating(true);
      setError(null);

      try {
        const catNameToId: Record<string, string> = {};
        categories.forEach((c) => {
          catNameToId[c.name] = c.id;
        });
        const itemNameToId: Record<string, string> = {};
        menuItems.forEach((m) => {
          itemNameToId[m.name] = m.id;
        });

        // Resolve names to IDs if categoryIds not already supplied
        const category_ids =
          params.categoryIds && params.categoryIds.length > 0
            ? params.categoryIds
            : (params.applicableCategories || [])
                .map((name) => catNameToId[name])
                .filter(Boolean);

        const menu_item_ids =
          params.menuItemIds && params.menuItemIds.length > 0
            ? params.menuItemIds
            : (params.applicableItems || [])
                .map((name) => itemNameToId[name])
                .filter(Boolean);

        const payload: CreateOfferPayload = {
          offer_name: params.name.trim(),
          offer_code: params.offerCode?.trim() ? params.offerCode.trim().toUpperCase() : null,
          discount_type: params.offerType,
          discount_value: Number(params.discountValue),
          min_order_amount: Number(params.minimumOrderAmount || 0),
          max_discount_amount:
            params.maxDiscountAmount != null && params.maxDiscountAmount > 0
              ? Number(params.maxDiscountAmount)
              : null,
          valid_from: new Date(params.startAt).toISOString(),
          valid_to: new Date(params.endAt).toISOString(),
          category_ids,
          menu_item_ids,
        };

        const backendOffer = await apiCreateOffer(payload);

        const idToCatMap: Record<string, string> = {};
        categories.forEach((c) => {
          idToCatMap[c.id] = c.name;
        });
        const idToItemMap: Record<string, string> = {};
        menuItems.forEach((m) => {
          idToItemMap[m.id] = m.name;
        });

        const newOffer = mapBackendOfferToFrontend(backendOffer, idToCatMap, idToItemMap);

        addToast({
          type: 'success',
          title: 'Offer created',
          message: `"${newOffer.name}" has been published successfully.`,
        });

        return newOffer;
      } catch (err: any) {
        const message = err?.message || 'Failed to create offer';
        setError(message);
        addToast({
          type: 'error',
          title: 'Failed to create offer',
          message,
        });
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [categories, menuItems, addToast]
  );

  return {
    createOffer,
    isCreating,
    error,
    resetError,
  };
}

export interface UpdateOfferParams {
  id: string | number;
  name?: string;
  offerCode?: string | null;
  offerType?: OfferType;
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minimumOrderAmount?: number;
  startAt?: string;
  endAt?: string;
  applicableCategories?: string[];
  applicableItems?: string[];
  categoryIds?: string[];
  menuItemIds?: string[];
}

export interface UseUpdateOfferReturn {
  updateOffer: (params: UpdateOfferParams) => Promise<Offer>;
  isUpdating: boolean;
  error: string | null;
  resetError: () => void;
}

/**
 * Custom React hook to update an existing offer via PATCH /api/v1/offers/{offer_id}
 */
export function useUpdateOffer(): UseUpdateOfferReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { categories, menuItems, addToast } = useApp();

  const resetError = useCallback(() => setError(null), []);

  const updateOffer = useCallback(
    async (params: UpdateOfferParams): Promise<Offer> => {
      setIsUpdating(true);
      setError(null);

      try {
        const catNameToId: Record<string, string> = {};
        categories.forEach((c) => {
          catNameToId[c.name] = c.id;
        });
        const itemNameToId: Record<string, string> = {};
        menuItems.forEach((m) => {
          itemNameToId[m.name] = m.id;
        });

        // Resolve names to IDs if categoryIds not supplied
        const category_ids =
          params.categoryIds !== undefined
            ? params.categoryIds
            : params.applicableCategories !== undefined
            ? params.applicableCategories.map((name) => catNameToId[name]).filter(Boolean)
            : undefined;

        const menu_item_ids =
          params.menuItemIds !== undefined
            ? params.menuItemIds
            : params.applicableItems !== undefined
            ? params.applicableItems.map((name) => itemNameToId[name]).filter(Boolean)
            : undefined;

        const payload: UpdateOfferPayload = {};
        if (params.name !== undefined) payload.offer_name = params.name.trim();
        if (params.offerCode !== undefined) {
          payload.offer_code = params.offerCode?.trim() ? params.offerCode.trim().toUpperCase() : null;
        }
        if (params.offerType !== undefined) payload.discount_type = params.offerType;
        if (params.discountValue !== undefined) payload.discount_value = Number(params.discountValue);
        if (params.minimumOrderAmount !== undefined) payload.min_order_amount = Number(params.minimumOrderAmount || 0);
        if (params.maxDiscountAmount !== undefined) {
          payload.max_discount_amount =
            params.maxDiscountAmount != null && params.maxDiscountAmount > 0
              ? Number(params.maxDiscountAmount)
              : null;
        }
        if (params.startAt !== undefined) payload.valid_from = new Date(params.startAt).toISOString();
        if (params.endAt !== undefined) payload.valid_to = new Date(params.endAt).toISOString();
        if (category_ids !== undefined) payload.category_ids = category_ids;
        if (menu_item_ids !== undefined) payload.menu_item_ids = menu_item_ids;

        const backendOffer = await apiUpdateOffer(params.id, payload);

        const idToCatMap: Record<string, string> = {};
        categories.forEach((c) => {
          idToCatMap[c.id] = c.name;
        });
        const idToItemMap: Record<string, string> = {};
        menuItems.forEach((m) => {
          idToItemMap[m.id] = m.name;
        });

        const updatedOffer = mapBackendOfferToFrontend(backendOffer, idToCatMap, idToItemMap);

        // Preserve mapped categories/items from params if backend returns empty lists
        if (
          (!updatedOffer.applicableCategories || updatedOffer.applicableCategories.length === 0) &&
          params.applicableCategories &&
          params.applicableCategories.length > 0
        ) {
          updatedOffer.applicableCategories = params.applicableCategories;
        }

        if (
          (!updatedOffer.applicableItems || updatedOffer.applicableItems.length === 0) &&
          params.applicableItems &&
          params.applicableItems.length > 0
        ) {
          updatedOffer.applicableItems = params.applicableItems;
        }

        addToast({
          type: 'success',
          title: 'Offer updated',
          message: `"${updatedOffer.name}" has been updated successfully.`,
        });

        return updatedOffer;
      } catch (err: any) {
        const message = err?.message || 'Failed to update offer';
        setError(message);
        addToast({
          type: 'error',
          title: 'Failed to update offer',
          message,
        });
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    [categories, menuItems, addToast]
  );

  return {
    updateOffer,
    isUpdating,
    error,
    resetError,
  };
}

export interface UseToggleOfferReturn {
  toggleOffer: (id: string | number, isActive: boolean) => Promise<any>;
  isToggling: boolean;
  togglingId: string | number | null;
  error: string | null;
  resetError: () => void;
}

/**
 * Custom React hook to toggle an existing offer's active status via PATCH /api/v1/offers/{offer_id}/toggle
 */
export function useToggleOffer(): UseToggleOfferReturn {
  const [isToggling, setIsToggling] = useState(false);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useApp();

  const resetError = useCallback(() => setError(null), []);

  const toggleOffer = useCallback(
    async (id: string | number, isActive: boolean) => {
      setIsToggling(true);
      setTogglingId(id);
      setError(null);

      try {
        const backendOffer = await apiToggleOffer(id, isActive);
        addToast({
          type: 'info',
          title: isActive ? 'Offer activated' : 'Offer paused',
          message: backendOffer.offer_name || '',
        });
        return backendOffer;
      } catch (err: any) {
        const message = err?.message || 'Failed to toggle offer status';
        setError(message);
        addToast({
          type: 'error',
          title: 'Failed to update status',
          message,
        });
        throw err;
      } finally {
        setIsToggling(false);
        setTogglingId(null);
      }
    },
    [addToast]
  );

  return {
    toggleOffer,
    isToggling,
    togglingId,
    error,
    resetError,
  };
}

export interface UseDeleteOfferReturn {
  deleteOffer: (id: string | number) => Promise<void>;
  isDeleting: boolean;
  deletingId: string | number | null;
  error: string | null;
  resetError: () => void;
}

/**
 * Custom React hook to soft delete an existing offer via DELETE /api/v1/offers/{offer_id}
 */
export function useDeleteOffer(): UseDeleteOfferReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useApp();

  const resetError = useCallback(() => setError(null), []);

  const deleteOffer = useCallback(
    async (id: string | number): Promise<void> => {
      setIsDeleting(true);
      setDeletingId(id);
      setError(null);

      try {
        await apiDeleteOffer(id);
        addToast({
          type: 'success',
          title: 'Offer deleted',
          message: 'The offer has been removed successfully.',
        });
      } catch (err: any) {
        const message = err?.message || 'Failed to delete offer';
        setError(message);
        addToast({
          type: 'error',
          title: 'Failed to delete offer',
          message,
        });
        throw err;
      } finally {
        setIsDeleting(false);
        setDeletingId(null);
      }
    },
    [addToast]
  );

  return {
    deleteOffer,
    isDeleting,
    deletingId,
    error,
    resetError,
  };
}



