import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  useAnalyticsOverview,
  useSalesTrend,
  useCustomerBreakdown,
  useTopSellingItems,
  useHighestRevenueItems,
  useMenuPerformance,
  useExportAnalytics,
} from '@/hooks';
import {
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
  Eye, RefreshCw,
} from 'lucide-react';

const rangeTabs: { id: AnalyticsRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
];

function formatMetricChange(changePercent: number | null | undefined): { change: string | null; up: boolean } {
  if (changePercent === null || changePercent === undefined) {
    return { change: null, up: true };
  }
  const n = Number(changePercent);
  const up = n >= 0;
  return { change: `${up ? '+' : ''}${n.toFixed(1)}%`, up };
}

export function AnalyticsPage() {
  const { addToast } = useApp();
  const [range, setRange] = useState<AnalyticsRange>('today');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'both'>('both');

  // Custom date range inputs
  const [customStartDate, setCustomStartDate] = useState('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState('2026-10-15');
  const [appliedCustomDates, setAppliedCustomDates] = useState({ start: '2026-10-01', end: '2026-10-15' });

  // Real API hook calling GET /api/v1/analytics/overview
  const {
    overview,
    isLoading: isOverviewLoading,
    error: overviewError,
    setPeriod,
    setDateRange,
    refetch: refetchOverview,
  } = useAnalyticsOverview({
    period: range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range,
    startDate: range === 'custom' ? appliedCustomDates.start : undefined,
    endDate: range === 'custom' ? appliedCustomDates.end : undefined,
  });

  // Real API hook calling GET /api/v1/analytics/sales-trend
  const {
    points: salesTrendPoints,
    isLoading: isSalesTrendLoading,
    error: salesTrendError,
    setPeriod: setSalesTrendPeriod,
    setDateRange: setSalesTrendDateRange,
    refetch: refetchSalesTrend,
  } = useSalesTrend({
    period: range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range,
    startDate: range === 'custom' ? appliedCustomDates.start : undefined,
    endDate: range === 'custom' ? appliedCustomDates.end : undefined,
  });

  // Real API hook calling GET /api/v1/analytics/customer-breakdown
  const {
    breakdown,
    isLoading: isBreakdownLoading,
    error: breakdownError,
    setPeriod: setBreakdownPeriod,
    setDateRange: setBreakdownDateRange,
    refetch: refetchBreakdown,
  } = useCustomerBreakdown({
    period: range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range,
    startDate: range === 'custom' ? appliedCustomDates.start : undefined,
    endDate: range === 'custom' ? appliedCustomDates.end : undefined,
  });

  // Real API hook calling GET /api/v1/analytics/top-selling-items
  const {
    items: topSellingItems,
    isLoading: isTopSellingLoading,
    error: topSellingError,
    setPeriod: setTopSellingPeriod,
    setDateRange: setTopSellingDateRange,
    refetch: refetchTopSelling,
  } = useTopSellingItems({
    period: range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range,
    startDate: range === 'custom' ? appliedCustomDates.start : undefined,
    endDate: range === 'custom' ? appliedCustomDates.end : undefined,
  });

  // Real API hook calling GET /api/v1/analytics/highest-revenue-items
  const {
    items: highestRevenueItems,
    isLoading: isHighestRevenueLoading,
    error: highestRevenueError,
    setPeriod: setHighestRevenuePeriod,
    setDateRange: setHighestRevenueDateRange,
    refetch: refetchHighestRevenue,
  } = useHighestRevenueItems({
    period: range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range,
    startDate: range === 'custom' ? appliedCustomDates.start : undefined,
    endDate: range === 'custom' ? appliedCustomDates.end : undefined,
  });

  // Real API hook calling GET /api/v1/analytics/menu-performance
  const {
    items: menuPerformanceItems,
    isLoading: isMenuPerformanceLoading,
    error: menuPerformanceError,
    setPeriod: setMenuPerformancePeriod,
    setDateRange: setMenuPerformanceDateRange,
    refetch: refetchMenuPerformance,
  } = useMenuPerformance({
    period: range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range,
    startDate: range === 'custom' ? appliedCustomDates.start : undefined,
    endDate: range === 'custom' ? appliedCustomDates.end : undefined,
  });

  // Export analytics CSV hook calling GET /api/v1/analytics/export
  const {
    isExporting,
    exportCsv,
  } = useExportAnalytics({
    period: range === 'weekly' ? 'week' : range === 'monthly' ? 'month' : range,
    startDate: range === 'custom' ? appliedCustomDates.start : undefined,
    endDate: range === 'custom' ? appliedCustomDates.end : undefined,
  });

  // Table filtering and sorting
  const [tableSearch, setTableSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<keyof AnalyticsItemPerformance>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Smooth period changes directly hitting the backend API
  const handleRangeChange = (newRange: AnalyticsRange) => {
    if (newRange === range) return;
    setRange(newRange);
    // For custom filter: do NOT call APIs on tab select.
    // Opening the custom tab displays the date range picker container.
    // The API calls will happen only when the user clicks "Apply Range".
    if (newRange === 'custom') {
      return;
    }
    const backendPeriod = newRange === 'weekly' ? 'week' : newRange === 'monthly' ? 'month' : newRange;
    setPeriod(backendPeriod);
    setSalesTrendPeriod(backendPeriod);
    setBreakdownPeriod(backendPeriod);
    setTopSellingPeriod(backendPeriod);
    setHighestRevenuePeriod(backendPeriod);
    setMenuPerformancePeriod(backendPeriod);
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      addToast({
        type: 'error',
        title: 'Select Dates',
        message: 'Both start date and end date are required for custom period.',
      });
      return;
    }
    if (customStartDate > customEndDate) {
      addToast({
        type: 'error',
        title: 'Invalid Date Range',
        message: 'Start date cannot be after end date.',
      });
      return;
    }

    setAppliedCustomDates({ start: customStartDate, end: customEndDate });
    setDateRange(customStartDate, customEndDate);
    setSalesTrendDateRange(customStartDate, customEndDate);
    setBreakdownDateRange(customStartDate, customEndDate);
    setTopSellingDateRange(customStartDate, customEndDate);
    setHighestRevenueDateRange(customStartDate, customEndDate);
    setMenuPerformanceDateRange(customStartDate, customEndDate);
    addToast({
      type: 'info',
      title: 'Date Range Applied',
      message: `Analytics updated for ${customStartDate} to ${customEndDate}`,
    });
  };

  const isHourly = range === 'today' || (range === 'custom' && appliedCustomDates.start === appliedCustomDates.end);

  const trend: AnalyticsTrendPoint[] = useMemo(() => {
    if (!salesTrendPoints || salesTrendPoints.length === 0) {
      return [];
    }
    return salesTrendPoints.map((pt) => {
      const d = new Date(pt.bucket_start);
      let label = '';
      let periodName = '';

      if (isHourly) {
        label = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const nextH = new Date(d.getTime() + 60 * 60 * 1000);
        const endStr = nextH.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        periodName = `${label} - ${endStr}`;
      } else {
        label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        periodName = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
      }

      return {
        label,
        periodName,
        orders: pt.orders || 0,
        revenue: Number(pt.gross_revenue) || 0,
      };
    });
  }, [salesTrendPoints, isHourly]);

  const customerBreakdown = useMemo(() => {
    const total = breakdown?.total_customers ?? 0;
    const newCount = breakdown?.new_customers ?? 0;
    const returningCount = breakdown?.returning_customers ?? 0;
    const newPct = Math.round(Number(breakdown?.new_customer_percent ?? 0));
    const returningPct = Math.round(Number(breakdown?.returning_customer_percent ?? 0));

    return {
      total,
      new: newCount,
      returning: returningCount,
      newPct,
      returningPct,
    };
  }, [breakdown]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuPerformanceItems.forEach((item) => {
      if (item.category_name) set.add(item.category_name);
    });
    return ['All', ...Array.from(set)];
  }, [menuPerformanceItems]);

  // Filtered and sorted table items
  let filteredAndSortedItems = menuPerformanceItems;
  if (selectedCategory !== 'All') {
    filteredAndSortedItems = filteredAndSortedItems.filter(
      (item) => (item.category_name || 'General') === selectedCategory
    );
  }

  if (tableSearch.trim()) {
    const q = tableSearch.toLowerCase().trim();
    filteredAndSortedItems = filteredAndSortedItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.category_name && item.category_name.toLowerCase().includes(q))
    );
  }

  filteredAndSortedItems = [...filteredAndSortedItems].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    let valA: any;
    let valB: any;

    if (sortBy === 'orders') {
      valA = a.orders;
      valB = b.orders;
    } else if (sortBy === 'revenue') {
      valA = Number(a.gross_revenue) || 0;
      valB = Number(b.gross_revenue) || 0;
    } else if (sortBy === 'rating') {
      valA = a.rating != null ? Number(a.rating) : -1;
      valB = b.rating != null ? Number(b.rating) : -1;
    } else if (sortBy === 'prepTimeMinutes') {
      valA = a.average_preparation_minutes != null ? Number(a.average_preparation_minutes) : -1;
      valB = b.average_preparation_minutes != null ? Number(b.average_preparation_minutes) : -1;
    } else {
      valA = a.name;
      valB = b.name;
    }

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

  // KPI Tiles mapped directly from GET /api/v1/analytics/overview response
  const kpiCards = useMemo(() => {
    const accChange = formatMetricChange(overview?.acceptance_rate?.change_percent);
    const canChange = formatMetricChange(overview?.cancellation_rate?.change_percent);
    const aovChange = formatMetricChange(overview?.average_order_value?.change_percent);
    const prepChange = formatMetricChange(overview?.average_preparation_time?.change_percent);
    const onTimeChange = formatMetricChange(overview?.on_time_preparation_rate?.change_percent);
    const accOrderChange = formatMetricChange(overview?.order_accuracy?.change_percent);
    const ratingChange = formatMetricChange(overview?.customer_rating?.change_percent);
    const grossRevChange = formatMetricChange(overview?.gross_revenue?.change_percent);

    return [
      {
        label: 'Acceptance Rate',
        value: overview?.acceptance_rate?.value != null ? Number(overview.acceptance_rate.value) : null,
        suffix: '%',
        decimals: 1,
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        change: accChange.change,
        up: accChange.up,
        description: 'Orders accepted vs received',
      },
      {
        label: 'Cancellation Rate',
        value: overview?.cancellation_rate?.value != null ? Number(overview.cancellation_rate.value) : null,
        suffix: '%',
        decimals: 1,
        icon: XCircle,
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-500/10',
        change: canChange.change,
        up: !canChange.up, // lower cancellation rate is positive
        description: 'Orders cancelled post-placement',
      },
      {
        label: 'Avg Order Value (AOV)',
        value: overview?.average_order_value?.value != null ? Number(overview.average_order_value.value) : null,
        prefix: '₹',
        decimals: 0,
        icon: IndianRupee,
        color: 'text-brand-600 dark:text-brand-400',
        bg: 'bg-brand-50 dark:bg-brand-500/10',
        change: aovChange.change,
        up: aovChange.up,
        description: 'Delivered orders average value',
      },
      {
        label: 'Avg Preparation Time',
        value: overview?.average_preparation_time?.value != null ? Number(overview.average_preparation_time.value) : null,
        suffix: ' min',
        decimals: 1,
        icon: Clock,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-500/10',
        change: prepChange.change,
        up: !prepChange.up, // lower prep time is positive
        description: 'Start to completed prep time',
      },
      {
        label: 'On-Time Prep Rate',
        value: overview?.on_time_preparation_rate?.value != null ? Number(overview.on_time_preparation_rate.value) : null,
        suffix: '%',
        decimals: 1,
        icon: Zap,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        change: onTimeChange.change,
        up: onTimeChange.up,
        description: 'Prepared within target SLA',
      },
      {
        label: 'Order Accuracy',
        value: overview?.order_accuracy?.value != null ? Number(overview.order_accuracy.value) : null,
        suffix: '%',
        decimals: 1,
        icon: Target,
        color: 'text-cyan-600 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-500/10',
        change: accOrderChange.change,
        up: accOrderChange.up,
        description: 'Zero item-missing reports',
      },
      {
        label: 'Customer Rating',
        value: overview?.customer_rating?.value != null ? Number(overview.customer_rating.value) : null,
        decimals: 1,
        icon: Star,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-500/10',
        change: ratingChange.change,
        up: ratingChange.up,
        description: 'Average 5-star customer reviews',
      },
      {
        label: 'Gross Revenue',
        value: overview?.gross_revenue?.value != null ? Number(overview.gross_revenue.value) : null,
        prefix: '₹',
        decimals: 0,
        icon: TrendingUp,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        change: grossRevChange.change,
        up: grossRevChange.up,
        description: overview ? `${overview.start_date} to ${overview.end_date}` : 'Gross revenue from delivered orders',
      },
    ];
  }, [overview]);

  if (isOverviewLoading && !overview) return <PageSkeleton />;

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
            onClick={() => {
              refetchOverview();
              refetchSalesTrend();
              refetchBreakdown();
              refetchTopSelling();
              refetchHighestRevenue();
              refetchMenuPerformance();
            }}
            disabled={isOverviewLoading || isSalesTrendLoading || isBreakdownLoading || isTopSellingLoading || isHighestRevenueLoading || isMenuPerformanceLoading}
            className="btn-ghost p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white shrink-0 transition-colors"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${(isOverviewLoading || isSalesTrendLoading || isBreakdownLoading || isTopSellingLoading || isHighestRevenueLoading || isMenuPerformanceLoading) ? 'animate-spin text-brand-500' : ''}`} />
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={async () => {
              addToast({
                type: 'info',
                title: 'Exporting CSV',
                message: `Preparing analytics export for ${range}...`,
              });
              const success = await exportCsv();
              if (success) {
                addToast({
                  type: 'success',
                  title: 'Export Downloaded',
                  message: `Menu performance CSV for ${range} has been downloaded.`,
                });
              } else {
                addToast({
                  type: 'error',
                  title: 'Export Failed',
                  message: 'Could not generate CSV export. Please try again.',
                });
              }
            }}
            className="btn-secondary text-xs sm:text-sm py-1.5 px-3 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {overviewError && (
        <div className="card p-4 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center justify-between">
          <span>Failed to load live analytics: {overviewError}</span>
          <button
            type="button"
            onClick={() => refetchOverview()}
            className="font-semibold underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

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
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 7);
                  setCustomStartDate(start.toISOString().split('T')[0]);
                  setCustomEndDate(end.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(end.getDate() - 30);
                  setCustomStartDate(start.toISOString().split('T')[0]);
                  setCustomEndDate(end.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-medium"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const end = new Date(now.getFullYear(), now.getMonth(), 0);
                  setCustomStartDate(start.toISOString().split('T')[0]);
                  setCustomEndDate(end.toISOString().split('T')[0]);
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
                  {s.change ? (
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
                  ) : (
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 px-2 py-0.5">
                      --
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                <div className="mt-1">
                  {s.value !== null && s.value !== undefined ? (
                    <CountUp
                      value={s.value}
                      prefix={s.prefix}
                      suffix={s.suffix}
                      decimals={s.decimals ?? 0}
                      className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400 dark:text-gray-500 tracking-tight">
                      --
                    </span>
                  )}
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
              {customerBreakdown.total > 0
                ? `${customerBreakdown.returningPct}% of diners (${customerBreakdown.returning.toLocaleString('en-IN')}) are returning patrons, with ${customerBreakdown.new.toLocaleString('en-IN')} new diners acquired.`
                : 'No customer orders have been recorded in this reporting period yet.'}
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
            {topSellingError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
                <span>Failed to load top-selling items: {topSellingError}</span>
                <button
                  type="button"
                  onClick={() => refetchTopSelling()}
                  className="font-semibold underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}
            {isTopSellingLoading ? (
              <div className="space-y-3 py-2">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                    <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topSellingItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                No delivered order items found for this reporting period.
              </div>
            ) : (
              topSellingItems.map((item, i) => {
                const maxQty = topSellingItems[0]?.quantity_sold || 1;
                const pct = maxQty > 0 ? (item.quantity_sold / maxQty) * 100 : 0;
                return (
                  <div
                    key={item.menu_item_id}
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
                      image={item.image_url || undefined}
                      name={item.name}
                      className="w-11 h-11 rounded-xl shrink-0 object-cover shadow-sm"
                    />

                    {/* Details & Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {item.quantity_sold.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-gray-400 font-normal">
                            sold ({item.order_count} {item.order_count === 1 ? 'order' : 'orders'})
                          </span>
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
                        <span>{item.category_name || 'General'}</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          ₹{Number(item.gross_revenue).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
            {highestRevenueError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
                <span>Failed to load highest-revenue items: {highestRevenueError}</span>
                <button
                  type="button"
                  onClick={() => refetchHighestRevenue()}
                  className="font-semibold underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}
            {isHighestRevenueLoading ? (
              <div className="space-y-3 py-2">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 shrink-0" />
                    <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-full" />
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : highestRevenueItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">
                No delivered order items found for this reporting period.
              </div>
            ) : (
              highestRevenueItems.map((item, i) => {
                const maxRev = Number(highestRevenueItems[0]?.gross_revenue) || 1;
                const pct = maxRev > 0 ? (Number(item.gross_revenue) / maxRev) * 100 : 0;
                return (
                  <div
                    key={item.menu_item_id}
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
                      image={item.image_url || undefined}
                      name={item.name}
                      className="w-11 h-11 rounded-xl shrink-0 object-cover shadow-sm"
                    />

                    {/* Details & Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{Number(item.gross_revenue).toLocaleString('en-IN')}
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
                        <span>{item.category_name || 'General'}</span>
                        <span>
                          {item.quantity_sold} sold ({item.order_count} {item.order_count === 1 ? 'order' : 'orders'})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
              {isMenuPerformanceLoading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="border-b border-gray-50 dark:border-gray-800/50 animate-pulse">
                    <td className="py-3 pl-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-36" />
                    </td>
                    <td className="py-3"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16" /></td>
                    <td className="py-3 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12 ml-auto" /></td>
                    <td className="py-3 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16 ml-auto" /></td>
                    <td className="py-3 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-10 ml-auto" /></td>
                    <td className="py-3 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-14 ml-auto" /></td>
                    <td className="py-3 text-right pr-2"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                    No items match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const label = item.performance_label || 'No Data';
                  const tagColors: Record<string, string> = {
                    'Top Performer': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
                    Average: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/50',
                    'Low Performer': 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
                    'No Data': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200/50',
                  };

                  return (
                    <tr
                      key={item.menu_item_id}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* Name */}
                      <td className="py-3 pl-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                          {item.name}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="py-3">
                        <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[11px] font-medium">
                          {item.category_name || 'General'}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                        {item.orders.toLocaleString('en-IN')}
                      </td>

                      {/* Revenue */}
                      <td className="py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                        ₹{Number(item.gross_revenue).toLocaleString('en-IN')}
                      </td>

                      {/* Rating */}
                      <td className="py-3 text-right">
                        {item.rating != null ? (
                          <div className="inline-flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                              {Number(item.rating).toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Prep Time */}
                      <td className="py-3 text-xs text-gray-600 dark:text-gray-400 text-right font-medium">
                        {item.average_preparation_minutes != null
                          ? `${Number(item.average_preparation_minutes).toFixed(0)} mins`
                          : '—'}
                      </td>

                      {/* Tag */}
                      <td className="py-3 text-right pr-2">
                        <span
                          className={`badge border px-2 py-0.5 text-[10px] font-semibold ${
                            tagColors[label] || tagColors['No Data']
                          }`}
                        >
                          {label}
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
            Showing {filteredAndSortedItems.length} of {menuPerformanceItems.length} menu items
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

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 italic">
        No sales or order data recorded for this period yet.
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 0) || 1;
  const maxOrders = Math.max(...data.map((d) => d.orders), 0) || 1;

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
