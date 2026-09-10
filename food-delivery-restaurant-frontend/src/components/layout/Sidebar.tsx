import { useApp, Page } from '@/context/AppContext';
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Truck, Wallet,
  BarChart3, Tag, Star, Bell, Settings, ChefHat, Moon, Sun,
  Volume2, VolumeX, MoreHorizontal, LogOut,
} from 'lucide-react';
import { useState } from 'react';

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard; enabled: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, enabled: true },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed, enabled: true },
  { id: 'delivery', label: 'Delivery', icon: Truck, enabled: true },
  { id: 'earnings', label: 'Earnings', icon: Wallet, enabled: true },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, enabled: true },
  { id: 'offers', label: 'Offers', icon: Tag, enabled: true },
  { id: 'reviews', label: 'Reviews', icon: Star, enabled: true },
  { id: 'notifications', label: 'Notifications', icon: Bell, enabled: true },
  { id: 'settings', label: 'Settings', icon: Settings, enabled: true },
];

export function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { currentPage, setPage, darkMode, toggleDarkMode, soundEnabled, toggleSound, newOrderCount, logout } = useApp();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleNav = (item: typeof navItems[0]) => {
    if (!item.enabled) return;
    setPage(item.id);
    onNavigate?.();
  };

  return (
    <aside className={`h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
          <ChefHat className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">NARAYANI</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Partner Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const showBadge = item.id === 'orders' && newOrderCount > 0;
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => !item.enabled && setTooltip(item.label)}
              onMouseLeave={() => setTooltip(null)}
            >
              <button
                onClick={() => handleNav(item)}
                disabled={!item.enabled}
                className={`nav-item w-full ${isActive ? 'nav-item-active' : item.enabled ? 'nav-item-inactive' : 'nav-item-disabled'} ${collapsed ? 'justify-center' : ''}`}
              >
                <div className="relative shrink-0">
                  <Icon className="w-5 h-5" />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-500 text-white text-[10px] font-bold animate-pulse">
                      {newOrderCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                {!collapsed && !item.enabled && (
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 font-normal">Soon</span>
                )}
              </button>
              {tooltip && !collapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2 py-1 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap pointer-events-none">
                  {tooltip} — Coming soon
                </div>
              )}
              {tooltip && collapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2 py-1 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs whitespace-nowrap pointer-events-none">
                  {tooltip} — Coming soon
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer controls */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-1 shrink-0">
        <button
          onClick={toggleSound}
          className={`nav-item w-full ${collapsed ? 'justify-center' : ''} nav-item-inactive`}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          {!collapsed && <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>}
        </button>
        <button
          onClick={toggleDarkMode}
          className={`nav-item w-full ${collapsed ? 'justify-center' : ''} nav-item-inactive`}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={logout}
          className={`nav-item w-full ${collapsed ? 'justify-center' : ''} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer`}
          title="Sign out of partner account"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

const bottomNavItems: { id: Page; label: string; icon: typeof LayoutDashboard; enabled: boolean }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, enabled: true },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, enabled: true },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed, enabled: true },
  { id: 'earnings', label: 'Earnings', icon: Wallet, enabled: true },
  { id: 'notifications', label: 'More', icon: MoreHorizontal, enabled: true },
];

export function BottomNav() {
  const { currentPage, setPage, newOrderCount } = useApp();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 flex items-center justify-around safe-bottom">
      {bottomNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        const showBadge = item.id === 'orders' && newOrderCount > 0;
        return (
          <button
            key={item.id}
            onClick={() => item.enabled && setPage(item.id)}
            disabled={!item.enabled}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : item.enabled
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-300 dark:text-gray-700'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              {showBadge && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-brand-500 text-white text-[10px] font-bold">
                  {newOrderCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
