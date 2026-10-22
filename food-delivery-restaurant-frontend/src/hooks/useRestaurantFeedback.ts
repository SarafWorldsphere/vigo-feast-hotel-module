import { useState, useCallback, useEffect } from 'react';
import {
  apiGetRestaurantFeedback,
  type FeedbackListResponse,
  type FeedbackItem,
} from '@/services/api';

export type { FeedbackListResponse, FeedbackItem };

export interface UseRestaurantFeedbackOptions {
  autoFetch?: boolean;
}

export interface RatingDistributionItem {
  stars: number;
  count: number;
  pct: number;
}

export interface UseRestaurantFeedbackReturn {
  feedbackData: FeedbackListResponse | null;
  reviews: FeedbackItem[];
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistributionItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<FeedbackListResponse | null>;
}

/**
 * Custom React hook to fetch GET /api/v1/restaurants/me/feedback
 * and manage customer feedback, overall rating, and rating distribution.
 */
export function useRestaurantFeedback(
  options: UseRestaurantFeedbackOptions = { autoFetch: true }
): UseRestaurantFeedbackReturn {
  const { autoFetch = true } = options;

  const [feedbackData, setFeedbackData] = useState<FeedbackListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async (): Promise<FeedbackListResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetRestaurantFeedback();
      setFeedbackData(data);
      return data;
    } catch (err: any) {
      const message = err?.message || 'Failed to load restaurant feedback';
      setError(message);
      console.warn('Could not load restaurant feedback:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchFeedback();
    }
  }, [autoFetch, fetchFeedback]);

  const reviews = feedbackData?.reviews || [];
  const averageRating = feedbackData?.average_rating ?? 0;
  const totalReviews = feedbackData?.total_reviews ?? 0;

  const distribution: RatingDistributionItem[] = [5, 4, 3, 2, 1].map((stars) => {
    const count = feedbackData?.rating_distribution?.[String(stars)] ?? 0;
    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { stars, count, pct };
  });

  return {
    feedbackData,
    reviews,
    averageRating,
    totalReviews,
    distribution,
    isLoading,
    error,
    refetch: fetchFeedback,
  };
}
