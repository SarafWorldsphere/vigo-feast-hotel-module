import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  mockNotifications, notificationTypeConfig,
  NotificationItem, NotificationType,
} from '@/data/mockData';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  ShoppingBag, Bike, Wallet, AlertCircle, Megaphone, Star,
  CheckCheck, Bell,
} from 'lucide-react';

type FilterType = NotificationType | 'ALL';

const iconMap: Record<string, typeof ShoppingBag> = {
  ShoppingBag, Bike, Wallet, AlertCircle, Megaphone, Star,
};

const filters: { id: FilterType; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'NEW_ORDER', label: 'Orders' },
  { id: 'PICKUP_ALERT', label: 'Pickup' },
  { id: 'SETTLEMENT', label: 'Settlements' },
  { id: 'COMPLAINT', label: 'Complaints' },
  { id: 'REVIEW', label: 'Reviews' },
  { id: 'PLATFORM_ANNOUNCEMENT', label: 'Platform' },
];

const simulatedNotifications: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>[] = [
  { type: 'NEW_ORDER', title: 'New Order Received', message: 'Order from a new customer — 2 items, ₹480. Accept within 5 minutes.' },
  { type: 'PICKUP_ALERT', title: 'Delivery Partner Assigned', message: 'A delivery partner has been assigned and is heading to your restaurant.' },
  { type: 'SETTLEMENT', title: 'Payout Initiated', message: 'Your daily settlement of ₹42,530 has been initiated and will arrive in T+1.' },
  { type: 'COMPLAINT', title: 'New Complaint', message: 'A customer has filed a complaint about a recent order. Review and respond.' },
  { type: 'REVIEW', title: 'New Review', message: 'A customer just left a 4-star review on their recent order.' },
  { type: 'PLATFORM_ANNOUNCEMENT', title: 'Peak Hours Alert', message: 'High demand expected this weekend. Ensure adequate inventory and staffing.' },
];

export function NotificationsPage() {
  const { addToast, unreadNotificationCount, setUnreadNotificationCount } = useApp();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const simIndex = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Simulate periodic new notifications arriving
  useEffect(() => {
    const interval = setInterval(() => {
      const template = simulatedNotifications[simIndex.current % simulatedNotifications.length];
      simIndex.current++;
      const newNotif: NotificationItem = {
        ...template,
        id: `n-sim-${Date.now()}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadNotificationCount(unreadNotificationCount + 1);
      addToast({ type: 'info', title: newNotif.title, message: newNotif.message });
    }, 30000);
    return () => clearInterval(interval);
  }, [addToast, setUnreadNotificationCount, unreadNotificationCount]);

  if (loading) return <PageSkeleton />;

  const filtered = filter === 'ALL' ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 60000;
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.round(diff)}m ago`;
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleMarkRead = (id: string) => {
    const wasUnread = notifications.find((n) => n.id === id && !n.isRead);
    if (!wasUnread) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)));
    setUnreadNotificationCount(Math.max(0, unreadNotificationCount - 1));
  };

  const handleMarkAllRead = () => {
    const unread = notifications.filter((n) => !n.isRead).length;
    if (unread === 0) return;
    setNotifications((prev) => prev.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() })));
    setUnreadNotificationCount(0);
    addToast({ type: 'success', title: 'All caught up', message: `${unread} notifications marked as read` });
  };

  return (
    <div className="animate-fade-in">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-thin">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="btn-secondary text-sm shrink-0"
        >
          <CheckCheck className="w-4 h-4" /> Mark all read
        </button>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No notifications here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif, i) => {
            const cfg = notificationTypeConfig[notif.type];
            const Icon = iconMap[cfg.icon] ?? Bell;
            return (
              <div
                key={notif.id}
                onClick={() => handleMarkRead(notif.id)}
                className={`card p-4 animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-soft ${
                  !notif.isRead ? 'border-brand-200 dark:border-brand-500/20 bg-brand-50/30 dark:bg-brand-500/5' : ''
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${notif.isRead ? 'font-medium text-gray-700 dark:text-gray-300' : 'font-semibold text-gray-900 dark:text-white'}`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatTime(notif.createdAt)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{notif.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
