'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Sidebar, BottomNav } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { ToastContainer } from '@/components/ui/Toasts';
import { DashboardPage } from '@/views/DashboardPage';
import { OrdersPage } from '@/views/OrdersPage';
import { MenuPage } from '@/views/MenuPage';
import { DeliveryPage } from '@/views/DeliveryPage';
import { EarningsPage } from '@/views/EarningsPage';
import { OffersPage } from '@/views/OffersPage';
import { SettingsPage } from '@/views/SettingsPage';
import { ReviewsPage } from '@/views/ReviewsPage';
import { NotificationsPage } from '@/views/NotificationsPage';
import { AnalyticsPage } from '@/views/AnalyticsPage';
import { LoginPage } from '@/views/LoginPage';
import { OwnerSignupPage } from '@/views/OwnerSignupPage';
import { RegisterPage } from '@/views/RegisterPage';
import { StatusScreenPage } from '@/views/StatusScreenPage';
import { BarChart3, Tag, Star, Bell } from 'lucide-react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: "Today's performance overview" },
  orders: { title: 'Orders', subtitle: 'Manage incoming and active orders' },
  menu: { title: 'Menu', subtitle: 'Manage your menu items and categories' },
  delivery: { title: 'Delivery', subtitle: 'Delivery partner management' },
  earnings: { title: 'Earnings', subtitle: 'Revenue and payout details' },
  analytics: { title: 'Analytics', subtitle: 'Deep dive into your metrics' },
  offers: { title: 'Offers', subtitle: 'Create and manage promotions' },
  reviews: { title: 'Reviews', subtitle: 'Customer feedback and ratings' },
  notifications: { title: 'Notifications', subtitle: 'Stay updated on everything' },
  settings: { title: 'Settings', subtitle: 'Configure your restaurant profile' },
};

const comingSoonIcons: Record<string, typeof BarChart3> = {
  analytics: BarChart3,
  offers: Tag,
  reviews: Star,
  notifications: Bell,
};

function ComingSoon({ page }: { page: string }) {
  const Icon = comingSoonIcons[page] ?? BarChart3;
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Coming Soon</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500">This section is under development</p>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, isAuthLoading, authView, registrationStatus, currentPage } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkSize = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 768 && w < 1280);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  if (!mounted || isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Checking partner session...</p>
      </div>
    );
  }

  // Status Gating & Auth Routing (lightweight pages, no sidebar/topbar shell)
  if (!isAuthenticated) {
    if (authView === 'signup') return <OwnerSignupPage />;
    if (authView === 'wizard' || authView === 'register') return <RegisterPage />;
    if (authView === 'status') return <StatusScreenPage />;
    return <LoginPage />;
  }

  // If authenticated but application is not approved yet, show the status screen
  if (registrationStatus !== 'APPROVED') {
    return <StatusScreenPage />;
  }

  const sidebarCollapsed = isTablet;
  const enabledPages = [
    'dashboard',
    'orders',
    'menu',
    'delivery',
    'earnings',
    'offers',
    'reviews',
    'settings',
    'notifications',
    'analytics',
  ];
  const isEnabled = enabledPages.includes(currentPage);
  const meta = pageTitles[currentPage] || { title: 'Dashboard', subtitle: 'Overview' };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative animate-slide-in-right" style={{ animationDuration: '200ms' }}>
            <Sidebar collapsed={false} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page header */}
        <div className="px-4 lg:px-6 pt-4 pb-2">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{meta.title}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{meta.subtitle}</p>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 pb-20 md:pb-6 pt-2">
          {currentPage === 'dashboard' && <DashboardPage />}
          {currentPage === 'orders' && <OrdersPage />}
          {currentPage === 'menu' && <MenuPage />}
          {currentPage === 'delivery' && <DeliveryPage />}
          {currentPage === 'earnings' && <EarningsPage />}
          {currentPage === 'offers' && <OffersPage />}
          {currentPage === 'reviews' && <ReviewsPage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'notifications' && <NotificationsPage />}
          {currentPage === 'analytics' && <AnalyticsPage />}
          {!isEnabled && <ComingSoon page={currentPage} />}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <BottomNav />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
}
