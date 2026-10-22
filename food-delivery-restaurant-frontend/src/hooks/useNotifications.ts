import { useState, useCallback, useEffect, useRef } from 'react';
import {
  apiGetNotifications,
  apiGetUnreadNotificationCount,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  type BackendNotification,
  type BackendNotificationListResponse,
  type NotificationQueryParams,
} from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { NotificationType } from '@/data/mockData';

export interface MappedNotificationItem {
  id: string;
  notificationId: number;
  type: NotificationType;
  rawType: string;
  entityType: 'ORDER' | 'COMPLAINT' | 'REFUND' | 'DELIVERY' | null;
  entityId: number | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  raw: BackendNotification;
}

export function mapBackendNotificationToItem(n: BackendNotification): MappedNotificationItem {
  let mappedType: NotificationType = 'PLATFORM_ANNOUNCEMENT';

  const rawType = (n.notification_type || '').toUpperCase();
  const entityType = (n.entity_type || '').toUpperCase();

  if (entityType === 'DELIVERY' || rawType.startsWith('DELIVERY_') || rawType === 'PICKUP_ALERT') {
    mappedType = 'PICKUP_ALERT';
  } else if (entityType === 'COMPLAINT' || rawType.startsWith('COMPLAINT_')) {
    mappedType = 'COMPLAINT';
  } else if (entityType === 'REFUND' || rawType.startsWith('REFUND')) {
    mappedType = 'REFUND';
  } else if (
    entityType === 'ORDER' ||
    rawType === 'NEW_ORDER' ||
    rawType.startsWith('ORDER_')
  ) {
    mappedType = 'NEW_ORDER';
  } else if (rawType.startsWith('SETTLEMENT')) {
    mappedType = 'SETTLEMENT';
  } else if (rawType.startsWith('REVIEW')) {
    mappedType = 'REVIEW';
  }

  return {
    id: String(n.notification_id),
    notificationId: n.notification_id,
    type: mappedType,
    rawType: n.notification_type,
    entityType: n.entity_type,
    entityId: n.entity_id,
    title: n.title,
    message: n.message,
    isRead: n.is_read,
    createdAt: n.created_at,
    readAt: n.read_at,
    raw: n,
  };
}

export interface UseNotificationsOptions {
  limit?: number;
  autoFetch?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 20, autoFetch = true } = options;
  const { setUnreadNotificationCount, addToast } = useApp();

  const [notifications, setNotifications] = useState<MappedNotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNotifications = useCallback(
    async (params?: NotificationQueryParams) => {
      const fetchLimit = params?.limit ?? limit;
      const fetchOffset = params?.offset ?? offset;

      setIsLoading(true);
      setError(null);

      try {
        const res: BackendNotificationListResponse = await apiGetNotifications({
          limit: fetchLimit,
          offset: fetchOffset,
        });

        if (!isMountedRef.current) return;

        const mapped = (res.items || []).map(mapBackendNotificationToItem);
        setNotifications(mapped);
        setTotal(res.total ?? 0);
        setUnreadCount(res.unread_count ?? 0);
        setUnreadNotificationCount(res.unread_count ?? 0);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        const msg = err?.message || 'Failed to load notifications';
        setError(msg);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [limit, offset, setUnreadNotificationCount]
  );

  // Initial load
  useEffect(() => {
    if (autoFetch) {
      fetchNotifications();
    }
  }, [fetchNotifications, autoFetch]);

  // Listen to live WebSocket events via window event dispatched by AppContext
  useEffect(() => {
    const handleLiveEvent = () => {
      // Re-fetch current page quietly so new notifications appear
      fetchNotifications();
    };

    window.addEventListener('restaurant:notification_event', handleLiveEvent);
    return () => {
      window.removeEventListener('restaurant:notification_event', handleLiveEvent);
    };
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (notificationId: number | string) => {
      const numId = Number(notificationId);
      if (isNaN(numId)) return;

      const target = notifications.find((n) => n.notificationId === numId);
      if (target && target.isRead) {
        return; // Already read
      }

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.notificationId === numId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        setUnreadNotificationCount(next);
        return next;
      });

      try {
        await apiMarkNotificationRead(numId);
      } catch (err: any) {
        // Rollback on failure
        fetchNotifications();
        addToast({
          type: 'warning',
          title: 'Update Failed',
          message: err?.message || 'Could not mark notification as read.',
        });
      }
    },
    [notifications, fetchNotifications, setUnreadNotificationCount, addToast]
  );

  const markAllRead = useCallback(async () => {
    const currentUnread = notifications.filter((n) => !n.isRead).length;
    if (currentUnread === 0 && unreadCount === 0) return;

    setIsMutating(true);
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
    setUnreadNotificationCount(0);

    try {
      const res = await apiMarkAllNotificationsRead();
      addToast({
        type: 'success',
        title: 'All Caught Up',
        message: `${res.updated_count || currentUnread} notifications marked as read`,
      });
    } catch (err: any) {
      // Rollback on failure
      fetchNotifications();
      addToast({
        type: 'warning',
        title: 'Action Failed',
        message: err?.message || 'Could not mark all notifications as read.',
      });
    } finally {
      if (isMountedRef.current) {
        setIsMutating(false);
      }
    }
  }, [notifications, unreadCount, fetchNotifications, setUnreadNotificationCount, addToast]);

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const goToPage = useCallback(
    (newPage: number) => {
      const targetPage = Math.max(1, Math.min(newPage, totalPages));
      const newOffset = (targetPage - 1) * limit;
      setOffset(newOffset);
    },
    [limit, totalPages]
  );

  return {
    notifications,
    total,
    unreadCount,
    limit,
    offset,
    page,
    totalPages,
    isLoading,
    isMutating,
    error,
    refetch: fetchNotifications,
    markRead,
    markAllRead,
    goToPage,
  };
}
