import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useDashboard } from '@/hooks/useDashboard';
import { CountUp } from '@/components/ui/CountUp';
import { PageSkeleton } from '@/components/ui/Skeletons';
import { FoodImage } from '@/components/ui/FoodImage';
import {
  ShoppingBag, IndianRupee, Star, Clock, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, AlertTriangle, Info, CheckCircle, ArrowUpRight, Bell, X,
} from 'lucide-react';

export function DashboardPage() {
  const { setPage, isOnline, registrationStatus, statusDetails, owner, pendingRefundsCount, failedRefundsCount } = useApp();
  const { dashboard, isLoading } = useDashboard();
  const [showApprovedBanner, setShowApprovedBanner] = useState(false);

  // Check if banner was already dismissed forever or if the approval is fresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // 1. Check if the banner was already dismissed forever
      const isDismissed =
        localStorage.getItem('nfd_approved_banner_dismissed') === 'true' ||
        Boolean(
          statusDetails?.restaurant_id &&
          localStorage.getItem(`nfd_approved_banner_dismissed_${statusDetails.restaurant_id}`) === 'true'
        ) ||
        Boolean(
          owner?.id &&
          localStorage.getItem(`nfd_approved_banner_dismissed_${owner.id}`) === 'true'
        ) ||
        Boolean(
          owner?.email &&
          (localStorage.getItem(`nfd_approved_banner_dismissed_${owner.email.toLowerCase()}`) === 'true' ||
           localStorage.getItem(`nfd_approved_banner_dismissed_${owner.email}`) === 'true')
        );

      if (isDismissed) {
        setShowApprovedBanner(false);
        return;
      }

      // 2. Check if the owner just received approval in this session/flow
      const justReceived = sessionStorage.getItem('nfd_just_received_approval') === 'true';
      if (justReceived) {
        setShowApprovedBanner(true);
        return;
      }

      // 3. If reviewed_at or submitted_at exists, verify if it was within the last 48 hours
      const timestamp = statusDetails?.reviewed_at || statusDetails?.submitted_at;
      if (timestamp) {
        const approvedTime = new Date(timestamp).getTime();
        if (!isNaN(approvedTime)) {
          const diffHours = (Date.now() - approvedTime) / (1000 * 60 * 60);
          if (diffHours > 48) {
            setShowApprovedBanner(false);
            return;
          }
        }
      } else {
        setShowApprovedBanner(false);
        return;
      }

      setShowApprovedBanner(true);
    } catch {
      setShowApprovedBanner(false);
    }
  }, [
    statusDetails?.restaurant_id,
    statusDetails?.reviewed_at,
    statusDetails?.submitted_at,
    owner?.id,
    owner?.email,
  ]);

  const handleDismissBanner = () => {
    setShowApprovedBanner(false);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('nfd_just_received_approval');
        localStorage.setItem('nfd_approved_banner_dismissed', 'true');
        if (statusDetails?.restaurant_id) {
          localStorage.setItem(`nfd_approved_banner_dismissed_${statusDetails.restaurant_id}`, 'true');
        }
        if (owner?.id) {
          localStorage.setItem(`nfd_approved_banner_dismissed_${owner.id}`, 'true');
        }
        if (owner?.email) {
          localStorage.setItem(`nfd_approved_banner_dismissed_${owner.email.toLowerCase()}`, 'true');
          localStorage.setItem(`nfd_approved_banner_dismissed_${owner.email}`, 'true');
        }
      } catch {
        // ignore localStorage errors (e.g. private browsing storage limits)
      }
    }
  };

  if (isLoading) return <PageSkeleton />;

  // ── Live data (with safe fallbacks while API data loads) ──────────────────
  const summary = dashboard?.summary;
  const salesTrend = dashboard?.sales_trend;
  const orderPipeline = dashboard?.order_pipeline;
  const topItems = dashboard?.top_selling_items ?? [];

  const statCards = [
    {
      label: "Today's Orders",
      value: summary?.today_orders ?? 0,
      icon: ShoppingBag,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      change: salesTrend?.change_percentage != null
        ? `${salesTrend.change_percentage >= 0 ? '+' : ''}${salesTrend.change_percentage.toFixed(1)}%`
        : '—',
      up: (salesTrend?.change_percentage ?? 0) >= 0,
    },
    {
      label: 'Gross Revenue',
      value: summary?.gross_revenue ?? 0,
      prefix: '₹',
      icon: IndianRupee,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      change: salesTrend?.change_percentage != null
        ? `${salesTrend.change_percentage >= 0 ? '+' : ''}${salesTrend.change_percentage.toFixed(1)}%`
        : '—',
      up: (salesTrend?.change_percentage ?? 0) >= 0,
    },
    {
      label: 'Avg Order Value',
      value: summary?.average_order_value ?? 0,
      prefix: '₹',
      icon: TrendingUp,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-500/10',
      change: '—',
      up: true,
    },
    {
      label: 'Rating',
      value: summary?.rating ?? 0,
      decimals: 1,
      suffix: '',
      icon: Star,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      change: '—',
      up: true,
    },
  ];

  const pipeline = [
    {
      label: 'New',
      count: orderPipeline?.new ?? 0,
      color: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      label: 'Preparing',
      count: orderPipeline?.preparing ?? 0,
      color: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      label: 'Ready',
      count: orderPipeline?.ready ?? 0,
      color: 'bg-purple-500',
      textColor: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
    },
    {
      label: 'Completed',
      count: orderPipeline?.completed ?? 0,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      label: 'Rejected',
      count: orderPipeline?.rejected ?? 0,
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
    },
  ];

  const alertIcons = {
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  };

  // Static alerts — replace with a real alerts API when available
  // Alerts panel items including real-time pending/failed refund notifications
  const alerts = [
    ...(failedRefundsCount > 0
      ? [
          {
            type: 'warning',
            message: `${failedRefundsCount} refund${failedRefundsCount > 1 ? 's' : ''} failed gateway processing — retry required`,
            time: 'Action needed',
          },
        ]
      : []),
    ...(pendingRefundsCount > 0
      ? [
          {
            type: 'info',
            message: `${pendingRefundsCount} refund request${pendingRefundsCount > 1 ? 's' : ''} awaiting gateway processing`,
            time: 'Pending review',
          },
        ]
      : []),
    { type: 'info', message: 'Dashboard data is now live from the API', time: 'Just now' },
  ];

  // Change badge label for the Sales Trend card
  const changePct = salesTrend?.change_percentage;
  const changeBadge =
    changePct != null
      ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}% vs yesterday`
      : 'vs yesterday';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Registration Approved Celebration Banner */}
      {registrationStatus === 'APPROVED' && showApprovedBanner && (
        <div className="card p-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-gray-900 border-emerald-200/80 dark:border-emerald-800/60 shadow-sm animate-slide-up">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
              🎉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Registration Approved</p>
                <span className="badge bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                  Verified Partner
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Your restaurant has been verified. You are now live to receive customer orders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissBanner}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-1.5 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="card p-4 flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 animate-slide-up">
          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">You're currently offline</p>
            <p className="text-xs text-red-500 dark:text-red-400/80">New orders are paused. Go online from the top bar to resume.</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${s.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
              <CountUp
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                decimals={s.decimals ?? 0}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              />
            </div>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Net Revenue', value: summary?.net_revenue ?? 0, prefix: '₹', icon: IndianRupee },
          {
            label: 'Avg Prep Time',
            value: summary?.average_preparation_time ?? 0,
            suffix: summary?.average_preparation_time != null ? ' min' : '',
            icon: Clock,
          },
          { label: 'Acceptance Rate', value: summary?.acceptance_rate ?? 0, suffix: '%', icon: CheckCircle2 },
          { label: 'Cancellation Rate', value: summary?.cancellation_rate ?? 0, suffix: '%', icon: XCircle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-4 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${(i + 4) * 80}ms` }}>
              <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-gray-500">{s.label}</p>
                {s.label === 'Avg Prep Time' && summary?.average_preparation_time == null ? (
                  <p className="text-lg font-bold text-gray-400 dark:text-gray-600">—</p>
                ) : (
                  <CountUp
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    className="text-lg font-bold text-gray-900 dark:text-white"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <div className="card p-5 lg:col-span-2 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Sales Trend</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Hourly revenue today</p>
            </div>
            {changePct != null && (
              <span className={`badge ${changePct >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                <ArrowUpRight className="w-3 h-3" />
                {changeBadge}
              </span>
            )}
          </div>
          <SalesChart data={salesTrend?.hourly ?? []} />
        </div>

        {/* Pipeline */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Order Pipeline</h3>
          <div className="space-y-2.5">
            {pipeline.map((p, i) => {
              const max = Math.max(...pipeline.map(x => x.count), 1);
              const pct = (p.count / max) * 100;
              return (
                <div key={i} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{p.label}</span>
                    <span className={`text-sm font-bold ${p.textColor}`}>{p.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full ${p.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${pct}%`, transitionDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setPage('orders')}
            className="btn-secondary w-full mt-4 text-xs"
          >
            View All Orders
          </button>
        </div>
      </div>

      {/* Top items + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top items */}
        <div className="card p-5 lg:col-span-2 animate-slide-up">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Top Selling Items</h3>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No sales recorded today yet.</p>
            ) : (
              topItems.map((item, i) => (
                <div key={item.item_id} className="flex items-center gap-3 group">
                  <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-5">{i + 1}</span>
                  <FoodImage image={undefined} name={item.item_name} className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.item_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{item.quantity_sold} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{item.revenue.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="w-24 hidden sm:block">
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-1000"
                        style={{
                          width: `${topItems[0]?.quantity_sold > 0 ? (item.quantity_sold / topItems[0].quantity_sold) * 100 : 0}%`,
                          transitionDelay: `${i * 100}ms`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Alerts</h3>
          </div>
          <div className="space-y-2.5">
            {alerts.map((alert, i) => {
              const cfg = alertIcons[alert.type as keyof typeof alertIcons];
              const Icon = cfg.icon;
              return (
                <div
                  key={i}
                  onClick={() => alert.message.toLowerCase().includes('refund') && setPage('refunds')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${alert.message.toLowerCase().includes('refund') ? 'cursor-pointer hover:ring-1 hover:ring-brand-500/30' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-200">{alert.message}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{alert.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SalesChart ──────────────────────────────────────────────────────────────
// Accepts { hour, revenue } from the API (backend field name is `revenue`)

function SalesChart({ data }: { data: { hour: string; revenue: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  const width = 100;
  const height = 100;
  const barWidth = width / Math.max(data.length, 1);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barH = (d.revenue / max) * height;
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={height - barH}
              width={barWidth * 0.7}
              height={barH}
              fill="url(#barGradient)"
              rx={0.5}
              className="animate-draw-in"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        {data.filter((_, i) => i % 2 === 0).map((d, i) => (
          <span key={i}>{d.hour}</span>
        ))}
      </div>
    </div>
  );
}
