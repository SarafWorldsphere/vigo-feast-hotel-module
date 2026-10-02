import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  analyticsData,
  analyticsSalesTrend,
  analyticsTopItems,
  analyticsCustomerBreakdownByRange,
  AnalyticsRange,
  AnalyticsItemPerformance,
  AnalyticsTrendPoint,
} from '@/data/mockData';
import { CountUp } from '@/components/ui/CountUp';
import { PageSkeleton } from '@/components/ui/Skeletons';
import { FoodImage } from '@/components/ui/FoodImage';
import {
  CheckCircle2, XCircle, Clock, Star, TrendingUp, IndianRupee,
  ArrowUpRight, ArrowDownRight, Users, Target, Zap, Award,
  Calendar, Download, Search, ChevronUp, ChevronDown,
  Eye,
} from 'lucide-react';

const rangeTabs: { id: AnalyticsRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
];

// Pre-computed unique categories outside the component
const categories = ['All', ...Array.from(new Set(analyticsTopItems.map((item) => item.category)))];

export function AnalyticsPage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<AnalyticsRange>('today');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'both'>('both');

  // Custom date range inputs
  const [customStartDate, setCustomStartDate] = useState('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-15');
  const [appliedCustomDates, setAppliedCustomDates] = useState({ start: '2026-10-01', end: '2026-10-15' });

  // Table filtering and sorting
  const [tableSearch, setTableSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<keyof AnalyticsItemPerformance>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Initial load
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Smooth loading simulation when changing range
  const handleRangeChange = (newRange: AnalyticsRange) => {
    if (newRange === range) return;
    setLoading(true);
    setRange(newRange);
    setTimeout(() => setLoading(false), 350);
  };

  const handleApplyCustomDates = () => {
    setLoading(true);
    setAppliedCustomDates({ start: customStartDate, end: customEndDate });
    setTimeout(() => {
      setLoading(false);
      addToast({
        type: 'info',
        title: 'Date Range Applied',
        message: `Analytics updated for ${customStartDate} to ${customEndDate}`,
      });
    }, 350);
  };

  // Get active range data
  const data = analyticsData[range];
  const trend = analyticsSalesTrend[range];
  const customerBreakdown = analyticsCustomerBreakdownByRange[range] || analyticsCustomerBreakdownByRange.today;

  // Filtered and sorted table items (pure inline computation, zero hook overhead)
  let filteredAndSortedItems = analyticsTopItems;
  if (selectedCategory !== 'All') {
    filteredAndSortedItems = filteredAndSortedItems.filter((item) => item.category === selectedCategory);
  }

  if (tableSearch.trim()) {
    const q = tableSearch.toLowerCase().trim();
    filteredAndSortedItems = filteredAndSortedItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }

  filteredAndSortedItems = [...filteredAndSortedItems].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const valA = a[sortBy];
    const valB = b[sortBy];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * dir;
    }
    return String(valA).localeCompare(String(valB)) * dir;
  });

  const toggleSort = (col: keyof AnalyticsItemPerformance) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  // KPI Tiles
  const kpiCards = [
    {
      label: 'Acceptance Rate',
      value: data.acceptanceRate,
      suffix: '%',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      change: '+2.1%',
      up: true,
      description: 'Orders accepted vs received',
    },
    {
      label: 'Cancellation Rate',
      value: data.cancellationRate,
      suffix: '%',
      decimals: 1,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
      change: '-0.8%',
      up: true,
      description: 'Orders cancelled post-placement',
    },
    {
      label: 'Avg Order Value (AOV)',
      value: data.avgOrderValue,
      prefix: '₹',
      icon: IndianRupee,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-500/10',
      change: '+4.2%',
      up: true,
      description: 'Gross revenue divided by orders',
    },
    {
      label: 'Avg Preparation Time',
      value: data.avgPrepTime,
      suffix: ' min',
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      change: '-2.5 min',
      up: true,
      description: 'Accepted to food ready time',
    },
    {
      label: 'On-Time Prep Rate',
      value: data.onTimePrepRate,
      suffix: '%',
      decimals: 1,
      icon: Zap,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      change: '+3.5%',
      up: true,
      description: 'Prepared within target SLA',
    },
    {
      label: 'Order Accuracy',
      value: data.orderAccuracy,
      suffix: '%',
      decimals: 1,
      icon: Target,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-500/10',
      change: '+1.2%',
      up: true,
      description: 'Zero item-missing reports',
    },
    {
      label: 'Customer Rating',
      value: data.avgRating,
      decimals: 1,
      icon: Star,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      change: '+0.2',
      up: true,
      description: 'Average 5-star customer reviews',
    },
    {
      label: 'Gross Revenue',
      value: data.totalRevenue,
      prefix: '₹',
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      change: '+12.5%',
      up: true,
      description: `${data.totalOrders} total orders processed`,
    },
  ];

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5 animate-fade-in pb-8">
      {/* Date Range Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Segmented Control */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80">
            {rangeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleRangeChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  range === tab.id
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Period Label */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 pl-2 border-l border-gray-200 dark:border-gray-800">
            <Calendar className="w-3.5 h-3.5 text-brand-500" />
            <span>
              {range === 'today' && 'Today: Live Metrics'}
              {range === 'weekly' && 'Last 7 Days (Mon - Sun)'}
              {range === 'monthly' && 'Last 30 Days (4 Weeks)'}
              {range === 'custom' && `${appliedCustomDates.start} to ${appliedCustomDates.end}`}
            </span>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              addToast({
                type: 'success',
                title: 'Export Started',
                message: `Analytics dataset for ${range} has been generated.`,
              })
            }
            className="btn-secondary text-xs sm:text-sm py-1.5 px-3 flex items-center gap-2 ml-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (Shown when 'custom' is active) */}
      {range === 'custom' && (
        <div className="card p-4 bg-gradient-to-r from-brand-50/50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-850 border-brand-200/80 dark:border-brand-500/20 animate-slide-up flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-500" /> Select Range:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Quick Presets */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('2026-09-25');
                  setCustomEndDate('2026-10-02');
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('2026-09-02');
                  setCustomEndDate('2026-10-02');
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('2026-09-01');
                  setCustomEndDate('2026-09-30');
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium"
              >
                Previous Month
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyCustomDates}
            className="btn-primary text-xs py-1.5 px-4 shadow-sm shrink-0"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* KPI 8-Grid (4 columns on desktop, 2 on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpiCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="stat-card animate-slide-up flex flex-col justify-between"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div>
                <div className="flex items-start justify-between mb-2.5">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      s.up
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {s.change}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                <div className="mt-1">
                  <CountUp
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals ?? 0}
                    className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/80 truncate">
                {s.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Section: Sales Trend & Customer Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend Chart (Col span 2) */}
        <div className="card p-5 lg:col-span-2 animate-slide-up flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Sales & Orders Trend</h3>
                <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">
                  <ArrowUpRight className="w-3 h-3" />
                  +12.5% vs previous
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Aggregated revenue & order frequency ({range.toUpperCase()})
              </p>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric('both')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  chartMetric === 'both'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Dual View
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  chartMetric === 'revenue'
                    ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Revenue (₹)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('orders')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  chartMetric === 'orders'
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                Orders
              </button>
            </div>
          </div>

          {/* Interactive Chart Component with Hover Tooltip */}
          <InteractiveAnalyticsChart data={trend} metric={chartMetric} />
        </div>

        {/* New vs Returning Customers Chart */}
        <div className="card p-5 animate-slide-up flex flex-col justify-between" style={{ animationDelay: '90ms' }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">Customer Breakdown</h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">New vs. Returning Patronage</p>
                </div>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="py-2">
              <DonutCustomerChart
                newPct={customerBreakdown.newPct}
                returningPct={customerBreakdown.returningPct}
                total={customerBreakdown.total}
              />
            </div>

            {/* Breakdown Stats */}
            <div className="space-y-2.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-brand-500 shadow-sm" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">New Customers</p>
                    <p className="text-[10px] text-gray-400">First order in this cycle</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {customerBreakdown.new.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 ml-1.5">
                    ({customerBreakdown.newPct}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Returning Customers</p>
                    <p className="text-[10px] text-gray-400">Repeated orders & loyal patrons</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {customerBreakdown.returning.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 ml-1.5">
                    ({customerBreakdown.returningPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Retention Insight Banner */}
          <div className="mt-3 p-2.5 rounded-xl bg-brand-50/60 dark:bg-brand-500/10 border border-brand-200/50 dark:border-brand-500/20 text-xs">
            <span className="font-bold text-brand-700 dark:text-brand-300">💡 Loyalty Insight: </span>
            <span className="text-brand-900/80 dark:text-brand-200/80 text-[11px]">
              Returning customers average{' '}
              <strong>+{Math.round((customerBreakdown.returningAovMultiplier - 1) * 100)}% higher basket value</strong> than first-time diners.
            </span>
          </div>
        </div>
      </div>

      {/* Leaderboard Grid: Top Selling Items & Highest Revenue Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top-Selling Items by Volume */}
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Top-Selling Items</h3>
                <p className="text-[11px] text-gray-400">Ranked by total order volume</p>
              </div>
            </div>
            <span className="badge bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-semibold">
              Volume Leaders
            </span>
          </div>

          <div className="space-y-3">
            {analyticsTopItems.slice(0, 5).map((item, i) => {
              const maxOrders = analyticsTopItems[0].orders;
              const pct = (item.orders / maxOrders) * 100;
              return (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors flex items-center gap-3"
                >
                  {/* Rank Badge */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-600'
                        : i === 1
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        : i === 2
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}
                  >
                    #{i + 1}
                  </span>

                  {/* Thumbnail */}
                  <FoodImage
                    image={item.image}
                    name={item.name}
                    className="w-11 h-11 rounded-xl shrink-0 object-cover shadow-sm"
                  />

                  {/* Details & Progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {item.orders.toLocaleString('en-IN')} <span className="text-[10px] text-gray-400 font-normal">orders</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-amber-500 rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%`, transitionDelay: `${i * 90}ms` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                      <span>{item.category}</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        ₹{item.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highest Revenue Items */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Highest Revenue Items</h3>
                <p className="text-[11px] text-gray-400">Ranked by gross sales contribution</p>
              </div>
            </div>
            <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              Top Earners
            </span>
          </div>

          <div className="space-y-3">
            {[...analyticsTopItems]
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5)
              .map((item, i) => {
                const maxRev = [...analyticsTopItems].sort((a, b) => b.revenue - a.revenue)[0].revenue;
                const pct = (item.revenue / maxRev) * 100;
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors flex items-center gap-3"
                  >
                    {/* Rank Badge */}
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-600'
                          : i === 1
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          : i === 2
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      #{i + 1}
                    </span>

                    {/* Thumbnail */}
                    <FoodImage
                      image={item.image}
                      name={item.name}
                      className="w-11 h-11 rounded-xl shrink-0 object-cover shadow-sm"
                    />

                    {/* Details & Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{item.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                          style={{ width: `${pct}%`, transitionDelay: `${i * 90}ms` }}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                        <span>₹{item.price} unit price</span>
                        <span>{item.orders} orders</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Menu Item Performance Table (Reusing Settlement History Table styling from Earnings) */}
      <div className="card p-5 animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Menu Item Performance Table</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Derived aggregates from order_items & menu_items database schema
            </p>
          </div>

          {/* Search and Category Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items or categories..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Category Dropdown/Selector */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter menu items by category"
              className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 pl-2">Menu Item</th>
                <th className="pb-3">Category</th>
                <th
                  className="pb-3 text-right cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => toggleSort('orders')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Orders
                    {sortBy === 'orders' ? (
                      sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-brand-500" /> : <ChevronUp className="w-3.5 h-3.5 text-brand-500" />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-[10px]">↕</span>
                    )}
                  </span>
                </th>
                <th
                  className="pb-3 text-right cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => toggleSort('revenue')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Revenue (₹)
                    {sortBy === 'revenue' ? (
                      sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-brand-500" /> : <ChevronUp className="w-3.5 h-3.5 text-brand-500" />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-[10px]">↕</span>
                    )}
                  </span>
                </th>
                <th
                  className="pb-3 text-right cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => toggleSort('rating')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Rating
                    {sortBy === 'rating' ? (
                      sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-brand-500" /> : <ChevronUp className="w-3.5 h-3.5 text-brand-500" />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-[10px]">↕</span>
                    )}
                  </span>
                </th>
                <th
                  className="pb-3 text-right cursor-pointer select-none hover:text-gray-900 dark:hover:text-white transition-colors"
                  onClick={() => toggleSort('prepTimeMinutes')}
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Avg Prep
                    {sortBy === 'prepTimeMinutes' ? (
                      sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-brand-500" /> : <ChevronUp className="w-3.5 h-3.5 text-brand-500" />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-[10px]">↕</span>
                    )}
                  </span>
                </th>
                <th className="pb-3 text-right pr-2">Performance</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                    No items match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const tagColors: Record<AnalyticsItemPerformance['performanceTag'], string> = {
                    Bestseller: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
                    'High Margin': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
                    Trending: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200/50',
                    Popular: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/50',
                    Steady: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200/50',
                  };

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* Name & Photo */}
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <FoodImage
                            image={item.image}
                            name={item.name}
                            className="w-9 h-9 rounded-lg shrink-0 object-cover shadow-sm"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">₹{item.price} base price</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3">
                        <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-medium">
                          {item.category}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                        {item.orders.toLocaleString('en-IN')}
                      </td>

                      {/* Revenue */}
                      <td className="py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                        ₹{item.revenue.toLocaleString('en-IN')}
                      </td>

                      {/* Rating */}
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {item.rating.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      {/* Prep Time */}
                      <td className="py-3 text-xs text-gray-600 dark:text-gray-400 text-right font-medium">
                        {item.prepTimeMinutes} mins
                      </td>

                      {/* Tag */}
                      <td className="py-3 text-right pr-2">
                        <span
                          className={`badge border px-2 py-0.5 text-[10px] font-semibold ${
                            tagColors[item.performanceTag]
                          }`}
                        >
                          {item.performanceTag}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
          <p>
            Showing {filteredAndSortedItems.length} of {analyticsTopItems.length} menu items
          </p>
          <p className="italic">
            Aggregated over <code>vgf_orders</code>, <code>vgf_order_items</code> & <code>vgf_menu_items</code>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive SVG Sales Chart with Dual-Bars and Rich Hover Tooltip
 */
function InteractiveAnalyticsChart({
  data,
  metric,
}: {
  data: AnalyticsTrendPoint[];
  metric: 'revenue' | 'orders' | 'both';
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxRevenue = Math.max(...data.map((d) => d.revenue)) || 1;
  const maxOrders = Math.max(...data.map((d) => d.orders)) || 1;

  const width = 100;
  const height = 65;
  const barSlot = width / data.length;
  const barWidth = barSlot * 0.65;

  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative pt-2">
      {/* Dynamic Hover Tooltip Card */}
      <div className="h-10 mb-2 flex items-center justify-between px-2">
        {activePoint ? (
          <div className="flex items-center gap-3 animate-fade-in bg-gray-900 dark:bg-gray-800 text-white px-3 py-1.5 rounded-xl shadow-lg border border-gray-700/50 text-xs">
            <span className="font-semibold text-brand-300">
              {activePoint.periodName || activePoint.label}:
            </span>
            <span className="font-bold text-emerald-400">
              ₹{activePoint.revenue.toLocaleString('en-IN')} revenue
            </span>
            <span className="text-gray-300">
              • {activePoint.orders} orders
            </span>
            <span className="text-gray-400 text-[11px]">
              (Avg ₹{Math.round(activePoint.revenue / (activePoint.orders || 1))}/order)
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Hover over any bar to view granular sales & order insights
          </span>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {(metric === 'revenue' || metric === 'both') && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-brand-600 to-amber-500" />
              <span>Revenue (₹)</span>
            </div>
          )}
          {(metric === 'orders' || metric === 'both') && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-blue-600 to-cyan-400" />
              <span>Orders</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible" preserveAspectRatio="none">
          <defs>
            {/* Revenue Gradient */}
            <linearGradient id="analyticsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
            </linearGradient>

            {/* Orders Gradient */}
            <linearGradient id="analyticsOrdersGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
            </linearGradient>

            {/* Active Hover Glow */}
            <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#f97316" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="currentColor" strokeOpacity="0.06" strokeDasharray="1 2" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="currentColor" strokeOpacity="0.06" strokeDasharray="1 2" />
          <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="currentColor" strokeOpacity="0.06" strokeDasharray="1 2" />
          <line x1="0" y1={height} x2={width} y2={height} stroke="currentColor" strokeOpacity="0.12" />

          {/* Data Bars */}
          {data.map((d, i) => {
            const isHovered = hoveredIndex === i;
            const x = i * barSlot + (barSlot - barWidth) / 2;

            const revH = (d.revenue / maxRevenue) * (height - 6);
            const ordH = (d.orders / maxOrders) * (height - 6);

            return (
              <g
                key={i}
                className="cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Background column hover highlight */}
                {isHovered && (
                  <rect
                    x={i * barSlot}
                    y={0}
                    width={barSlot}
                    height={height}
                    fill="currentColor"
                    fillOpacity="0.05"
                    rx={1}
                  />
                )}

                {/* Dual bars or single metric display */}
                {metric === 'both' ? (
                  <>
                    {/* Revenue Bar */}
                    <rect
                      x={x}
                      y={height - revH}
                      width={barWidth * 0.55}
                      height={Math.max(revH, 2)}
                      fill="url(#analyticsRevenueGrad)"
                      rx={0.6}
                      className="animate-draw-in transition-all duration-300"
                      style={{
                        animationDelay: `${i * 35}ms`,
                        opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1,
                        filter: isHovered ? 'url(#barGlow)' : 'none',
                      }}
                    />
                    {/* Orders Bar */}
                    <rect
                      x={x + barWidth * 0.55 + 0.3}
                      y={height - ordH}
                      width={barWidth * 0.45}
                      height={Math.max(ordH, 2)}
                      fill="url(#analyticsOrdersGrad)"
                      rx={0.6}
                      className="animate-draw-in transition-all duration-300"
                      style={{
                        animationDelay: `${i * 35 + 20}ms`,
                        opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1,
                      }}
                    />
                  </>
                ) : metric === 'revenue' ? (
                  <rect
                    x={x}
                    y={height - revH}
                    width={barWidth}
                    height={Math.max(revH, 2)}
                    fill="url(#analyticsRevenueGrad)"
                    rx={0.8}
                    className="animate-draw-in transition-all duration-300"
                    style={{
                      animationDelay: `${i * 35}ms`,
                      opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1,
                      filter: isHovered ? 'url(#barGlow)' : 'none',
                    }}
                  />
                ) : (
                  <rect
                    x={x}
                    y={height - ordH}
                    width={barWidth}
                    height={Math.max(ordH, 2)}
                    fill="url(#analyticsOrdersGrad)"
                    rx={0.8}
                    className="animate-draw-in transition-all duration-300"
                    style={{
                      animationDelay: `${i * 35}ms`,
                      opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1,
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* X-Axis Labels */}
        <div className="flex justify-between mt-2.5 px-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          {data.map((d, i) => {
            const show = data.length <= 8 || i % 2 === 0 || i === data.length - 1;
            return (
              <span
                key={i}
                className={`transition-colors text-center ${
                  hoveredIndex === i ? 'text-brand-600 dark:text-brand-400 font-bold' : ''
                } ${show ? 'visible' : 'invisible'}`}
                style={{ width: `${barSlot}%` }}
              >
                {d.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Animated SVG Donut Chart for Customer Breakdown
 */
function DonutCustomerChart({
  newPct,
  returningPct,
  total,
}: {
  newPct: number;
  returningPct: number;
  total: number;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const newStroke = (newPct / 100) * circumference;
  const returningStroke = (returningPct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center my-2">
      <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90">
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          className="text-gray-100 dark:text-gray-800"
        />

        {/* New Customers Segment (Orange) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#f97316"
          strokeWidth="11"
          strokeDasharray={`${newStroke} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />

        {/* Returning Customers Segment (Emerald) */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="11"
          strokeDasharray={`${returningStroke} ${circumference}`}
          strokeDashoffset={-newStroke}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Central Total Metric */}
      <div className="absolute text-center flex flex-col items-center">
        <CountUp
          value={total}
          className="text-2xl font-black text-gray-900 dark:text-white tracking-tight"
        />
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Total Customers
        </p>
      </div>
    </div>
  );
}
