import { useApp } from '@/context/AppContext';
import { useOwnerProfile } from '@/hooks/useOwnerProfile';
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, ChevronDown, Clock, Menu as MenuIcon, Bell } from 'lucide-react';
import { OfflinePanel } from './OfflinePanel';

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { owner, availability, orderSettings, offlineUntil, unreadNotificationCount, setPage } = useApp();
  const { ownerProfile } = useOwnerProfile({ autoFetch: !owner?.name });

  const currentOwner = owner || ownerProfile;
  const ownerName = currentOwner?.name?.trim();
  const ownerInitial = ownerName ? ownerName.charAt(0).toUpperCase() : 'V';
  const profileImageUrl = currentOwner?.profile_image_url;
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const [offlineCountdown, setOfflineCountdown] = useState('');

  const isAcceptingOrders = availability?.is_accepting_orders ?? false;
  const isPaused = availability ? availability.is_paused : (orderSettings?.is_paused ?? false);
  const status: 'ONLINE' | 'PAUSED' | 'OFFLINE' = isAcceptingOrders
    ? 'ONLINE'
    : isPaused
    ? 'PAUSED'
    : 'OFFLINE';

  useEffect(() => {
    if (!offlineUntil) {
      setOfflineCountdown('');
      return;
    }
    const update = () => {
      const diff = offlineUntil.getTime() - Date.now();
      if (diff <= 0) {
        setOfflineCountdown('');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setOfflineCountdown(`${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [offlineUntil]);

  return (
    <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="lg:hidden btn-ghost p-2"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowOfflinePanel(!showOfflinePanel)}
            aria-expanded={showOfflinePanel}
            aria-label="Online status menu"
            className={`flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-xl border transition-all ${
              status === 'ONLINE'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                : status === 'PAUSED'
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <span className="relative flex items-center">
              {status === 'ONLINE' ? (
                <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : status === 'PAUSED' ? (
                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
              {status === 'ONLINE' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </span>
            <span
              className={`text-sm font-semibold ${
                status === 'ONLINE'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : status === 'PAUSED'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {status === 'ONLINE' ? 'Online' : status === 'PAUSED' ? 'Paused' : 'Offline'}
            </span>
            {offlineCountdown && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Clock className="w-3 h-3" />
                {offlineCountdown}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${showOfflinePanel ? 'rotate-180' : ''}`}
            />
          </button>


          {showOfflinePanel && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowOfflinePanel(false)} />
              <OfflinePanel onClose={() => setShowOfflinePanel(false)} />
            </>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button onClick={() => setPage('notifications')} className="btn-ghost p-2 relative">
          <Bell className="w-5 h-5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-500 text-white text-[10px] font-bold animate-pulse">
              {unreadNotificationCount}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2.5 pl-2">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={ownerName || 'Owner'}
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-brand-200 dark:border-brand-800"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              {ownerInitial}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {ownerName || 'VIGO FEAST'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Owner</p>
          </div>
        </div>
      </div>
    </header>
  );
}
