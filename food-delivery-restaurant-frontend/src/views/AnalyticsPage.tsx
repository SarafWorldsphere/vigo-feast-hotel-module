import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  analyticsData, analyticsSalesTrend, analyticsTopItems, analyticsCustomerBreakdown,
  AnalyticsRange,
} from '@/data/mockData';
import { CountUp } from '@/components/ui/CountUp';
import { PageSkeleton } from '@/components/ui/Skeletons';
import { FoodImage } from '@/components/ui/FoodImage';
import {
  CheckCircle2, XCircle, Clock, Star, TrendingUp, IndianRupee,
  ArrowUpRight, ArrowDownRight, Users, Target, Zap, Award,
} from 'lucide-react';

const rangeTabs: { id: AnalyticsRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<AnalyticsRange>('today');
  const [sortBy, setSortBy] = useState<'orders' | 'revenue' | 'rating'>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <PageSkeleton />;

  const data = analyticsData[range];
  const trend = analyticsSalesTrend[range];

  const kpiCards = [
    { label: 'Acceptance Rate', value: data.acceptanceRate, suffix: '%', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', change: '+2%', up: true },
    { label: 'Cancellation Rate', value: data.cancellationRate, suffix: '%', icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', change: '-1%', up: true },
    { label: 'Avg Order Value', value: data.avgOrderValue, prefix: '₹', icon: IndianRupee, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10', change: '+3%', up: true },
    { label: 'Avg Prep Time', value: data.avgPrepTime, suffix: ' min', icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', change: '-2min', up: true },
    { label: 'On-Time Prep Rate', value: data.onTimePrepRate, suffix: '%', icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', change: '+5%', up: true },
    { label: 'Order Accuracy', value: data.orderAccuracy, suffix: '%', icon: Target, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10', change: '+1%', up: true },
    { label: 'Avg Rating', value: data.avgRating, decimals: 1, icon: Star, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', change: '+0.1', up: true },
    { label: 'Total Orders', value: data.totalOrders, icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', change: '+12%', up: true },
  ];

  const sortedItems = useMemo(() => {
    const sorted = [...analyticsTopItems].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'orders') return (a.orders - b.orders) * dir;
      if (sortBy === 'rating') return (a.rating - b.rating) * dir;
      return (a.revenue - b.revenue) * dir;
    });
    return sorted;
  }, [sortBy, sortDir]);

  const toggleSort = (col: 'orders' | 'revenue' | 'rating') => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Range selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {rangeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                range === tab.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpiCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${s.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
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

      {/* Sales chart + Customer breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales trend chart */}
        <div className="card p-5 lg:col-span-2 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Sales Trend</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Orders & revenue — {range}</p>
            </div>
            <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              +12% vs last period
            </span>
          </div>
          <AnalyticsChart data={trend} />
        </div>

        {/* Customer breakdown */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Customer Breakdown</h3>
          </div>
          <DonutChart newPct={analyticsCustomerBreakdown.newPct} returningPct={analyticsCustomerBreakdown.returningPct} />
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">New Customers</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{analyticsCustomerBreakdown.new}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Returning</span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{analyticsCustomerBreakdown.returning}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top items leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Top Selling Items</h3>
          </div>
          <div className="space-y-3">
            {analyticsTopItems.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-5">{i + 1}</span>
                <FoodImage image={item.image} name={item.name} className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{item.orders} orders</p>
                </div>
                <div className="w-20 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(item.orders / analyticsTopItems[0].orders) * 100}%`, transitionDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{item.revenue.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Highest Revenue Items</h3>
          </div>
          <div className="space-y-3">
            {[...analyticsTopItems].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-5">{i + 1}</span>
                <FoodImage image={item.image} name={item.name} className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">₹{item.revenue.toLocaleString('en-IN')} revenue</p>
                </div>
                <div className="w-20 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(item.revenue / [...analyticsTopItems].sort((a, b) => b.revenue - a.revenue)[0].revenue) * 100}%`, transitionDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.orders}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Menu item performance table */}
      <div className="card p-5 animate-slide-up">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Menu Item Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3">Item</th>
                <th className="pb-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort('orders')}>
                  <span className="flex items-center gap-1">Orders {sortBy === 'orders' && (sortDir === 'desc' ? '↓' : '↑')}</span>
                </th>
                <th className="pb-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort('revenue')}>
                  <span className="flex items-center gap-1">Revenue {sortBy === 'revenue' && (sortDir === 'desc' ? '↓' : '↑')}</span>
                </th>
                <th className="pb-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort('rating')}>
                  <span className="flex items-center gap-1">Rating {sortBy === 'rating' && (sortDir === 'desc' ? '↓' : '↑')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <FoodImage image={item.image} name={item.name} className="w-8 h-8 rounded-lg shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{item.orders}</td>
                  <td className="py-3 text-sm font-semibold text-gray-900 dark:text-white">₹{item.revenue.toLocaleString('en-IN')}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.rating}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AnalyticsChart({ data }: { data: { label: string; orders: number; revenue: number }[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const width = 100;
  const height = 100;
  const barWidth = width / data.length;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
        <defs>
          <linearGradient id="analyticsBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const barH = (d.revenue / maxRevenue) * height;
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={height - barH}
              width={barWidth * 0.7}
              height={barH}
              fill="url(#analyticsBarGradient)"
              rx={0.5}
              className="animate-draw-in"
              style={{ animationDelay: `${i * 40}ms` }}
            />
          );
        })}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        {data.filter((_, i) => i % 2 === 0 || data.length <= 7).map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ newPct, returningPct }: { newPct: number; returningPct: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const newStroke = (newPct / 100) * circumference;
  const returningStroke = (returningPct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-40 h-40 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-gray-800" />
        <circle
          cx="50" cy="50" r={radius} fill="none" stroke="#f97316" strokeWidth="10"
          strokeDasharray={`${newStroke} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <circle
          cx="50" cy="50" r={radius} fill="none" stroke="#10b981" strokeWidth="10"
          strokeDasharray={`${returningStroke} ${circumference}`}
          strokeDashoffset={-newStroke}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsCustomerBreakdown.total}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Total</p>
      </div>
    </div>
  );
}
