import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Offer, OfferType } from '@/data/mockData';
import { apiCreateOffer, mapBackendOfferToFrontend, CreateOfferPayload } from '@/services/api';

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
