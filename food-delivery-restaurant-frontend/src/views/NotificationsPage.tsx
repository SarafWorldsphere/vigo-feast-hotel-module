import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { MappedNotificationItem } from '@/hooks/useNotifications';
import { useNotifications } from '@/hooks/useNotifications';
import {
  notificationTypeConfig,
  NotificationType,
} from '@/data/mockData';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  ShoppingBag,
  Bike,
  Wallet,
  AlertCircle,
  Megaphone,
  Star,
  CheckCheck,
  Bell,
  RotateCcw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type FilterType = NotificationType | 'ALL';

const iconMap: Record<string, typeof ShoppingBag> = {
  ShoppingBag,
  Bike,
  Wallet,
  AlertCircle,
  Megaphone,
  Star,
  RotateCcw,
};

const defaultTypeConfig = {
  icon: 'Megaphone',
  bg: 'bg-amber-50 dark:bg-amber-500/10',
  text: 'text-amber-600 dark:text-amber-400',
};

const filters: { id: FilterType; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'NEW_ORDER', label: 'Orders' },
  { id: 'PICKUP_ALERT', label: 'Pickup' },
  { id: 'SETTLEMENT', label: 'Settlements' },
  { id: 'COMPLAINT', label: 'Complaints' },
  { id: 'REFUND', label: 'Refunds' },
  { id: 'REVIEW', label: 'Reviews' },
  { id: 'PLATFORM_ANNOUNCEMENT', label: 'Platform' },
];

export function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const { setPage, setSelectedOrderId, setSelectedRefundId } = useApp();

  const {
    notifications,
    unreadCount,
    page,
    totalPages,
    isLoading,
    isMutating,
    error,
    refetch,
    markRead,
    markAllRead,
    goToPage,
  } = useNotifications({ limit: 20, autoFetch: true });

  const handleNotificationClick = (notif: MappedNotificationItem) => {
    // 1. Mark as read immediately if unread (reduces unread count and header bell count)
    if (!notif.isRead) {
      markRead(notif.notificationId);
    }

    // 2. Navigate based on notification type and entity
    const rawType = (notif.rawType || '').toUpperCase();
    const entityType = (notif.entityType || '').toUpperCase();
    const title = (notif.title || '').toLowerCase();
    const message = (notif.message || '').toLowerCase();
    const type = notif.type;

    // Delivery / Pickup notifications -> Delivery Page
    if (
      entityType === 'DELIVERY' ||
      type === 'PICKUP_ALERT' ||
      rawType.includes('DELIVERY') ||
      rawType.includes('PICKUP') ||
      rawType.includes('RIDER') ||
      title.includes('delivery') ||
      title.includes('pickup') ||
      title.includes('rider') ||
      message.includes('delivery') ||
      message.includes('rider')
    ) {
      setPage('delivery');
      return;
    }

    // Refund notifications -> Refunds Page
    if (
      entityType === 'REFUND' ||
      type === 'REFUND' ||
      rawType.includes('REFUND') ||
      title.includes('refund') ||
      message.includes('refund')
    ) {
      if (notif.entityId) {
        setSelectedRefundId(String(notif.entityId));
      }
      setPage('refunds');
      return;
    }

    // Order notifications (e.g. Order received, order picked up, order delivered) -> Orders Page
    if (
      entityType === 'ORDER' ||
      type === 'NEW_ORDER' ||
      rawType.includes('ORDER') ||
      title.includes('order') ||
      message.includes('order')
    ) {
      if (notif.entityId) {
        setSelectedOrderId(String(notif.entityId));
      }
      setPage('orders');
      return;
    }

    // Review notifications -> Reviews Page
    if (
      type === 'REVIEW' ||
      rawType.includes('REVIEW') ||
      title.includes('review') ||
      title.includes('rating')
    ) {
      setPage('reviews');
      return;
    }

    // Settlement / Payout notifications -> Earnings Page
    if (
      type === 'SETTLEMENT' ||
      rawType.includes('SETTLEMENT') ||
      title.includes('settlement') ||
      title.includes('payout')
    ) {
      setPage('earnings');
      return;
    }

    // Complaints -> Orders Page
    if (
      type === 'COMPLAINT' ||
      rawType.includes('COMPLAINT') ||
      title.includes('complaint')
    ) {
      if (notif.entityId) {
        setSelectedOrderId(String(notif.entityId));
      }
      setPage('orders');
      return;
    }

    // Fallback: Orders Page
    setPage('orders');
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Recently';
      const now = new Date();
      const diffMinutes = (now.getTime() - d.getTime()) / 60000;
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${Math.round(diffMinutes)}m ago`;
      if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading && notifications.length === 0) {
    return <PageSkeleton />;
  }

  const filtered =
    filter === 'ALL'
      ? notifications
      : notifications.filter((n) => n.type === filter);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn-secondary text-sm p-2"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0 || isMutating}
            className="btn-secondary text-sm shrink-0 flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {filter === 'ALL'
              ? 'No notifications here'
              : `No notifications in ${filters.find((f) => f.id === filter)?.label}`}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            New orders, delivery updates, and complaints will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif, i) => {
            const cfg = notificationTypeConfig[notif.type] || defaultTypeConfig;
            const Icon = iconMap[cfg.icon] ?? Bell;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNotificationClick(notif);
                  }
                }}
                className={`card p-4 animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-soft hover:border-brand-300 dark:hover:border-brand-500/40 group ${
                  !notif.isRead
                    ? 'border-brand-200 dark:border-brand-500/20 bg-brand-50/30 dark:bg-brand-500/5'
                    : ''
                }`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}
                  >
                    <Icon className={`w-5 h-5 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm ${
                              notif.isRead
                                ? 'font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand-600 dark:group-hover:text-brand-400'
                                : 'font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400'
                            }`}
                          >
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatTime(notif.createdAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 px-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isLoading}
              className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
              Previous
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-40"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
