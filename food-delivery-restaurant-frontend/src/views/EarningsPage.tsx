import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useEarnings, type EarningsPeriod } from '@/hooks/useEarnings';
import { useSettlements } from '@/hooks/useSettlements';
import {
  apiGetCurrentSettlementPeriod,
  type CurrentSettlementPeriod,
} from '@/services/api';
import {
  type WaterfallStep,
  payoutDetails,
} from '@/data/mockData';
import { CountUp } from '@/components/ui/CountUp';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  IndianRupee, TrendingDown, Percent, Receipt, RotateCcw,
  Download, Building2, Wallet, Calendar, ArrowUpRight,
  AlertCircle, RefreshCw,
} from 'lucide-react';

type TabId = 'today' | 'week' | 'month' | 'custom';

const rangeTabs: { id: TabId; label: string; period: EarningsPeriod }[] = [
  { id: 'today', label: 'Today', period: 'today' },
  { id: 'week', label: 'Weekly', period: 'week' },
  { id: 'month', label: 'Monthly', period: 'month' },
  { id: 'custom', label: 'Custom Range', period: 'custom' },
];

const settlementStatusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  PAID: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  PENDING: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  PROCESSING: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  FAILED: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

export function EarningsPage() {
  const { addToast, completedRefundsTotal } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [customStart, setCustomStart] = useState<string>('2026-09-27');
  const [customEnd, setCustomEnd] = useState<string>('2026-09-27');

  const {
    earnings,
    summary,
    isLoading,
    error,
    setPeriod,
    setDateRange,
    refetch: refetchEarnings,
  } = useEarnings({
    period: 'today',
  });

  const {
    settlements,
    total: totalSettlements,
    isLoading: settlementsLoading,
    refetch: refetchSettlements,
  } = useSettlements();

  const [currentSettlement, setCurrentSettlement] =
    useState<CurrentSettlementPeriod | null>(null);
  const [isCurrentSettlementLoading, setIsCurrentSettlementLoading] =
    useState<boolean>(false);

  const fetchCurrentSettlement = useCallback(async () => {
    setIsCurrentSettlementLoading(true);
    try {
      const data = await apiGetCurrentSettlementPeriod();
      setCurrentSettlement(data);
    } catch (error) {
      console.error("Failed to fetch current settlement period:", error);
    } finally {
      setIsCurrentSettlementLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentSettlement();
  }, [fetchCurrentSettlement]);

  const handleRefreshSettlements = useCallback(() => {
    refetchSettlements();
    fetchCurrentSettlement();
  }, [refetchSettlements, fetchCurrentSettlement]);

  const isSettlementRefreshing = settlementsLoading || isCurrentSettlementLoading;

  const handleRefreshAll = () => {
    refetchEarnings();
    handleRefreshSettlements();
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'custom') {
      if (customStart && customEnd) {
        setDateRange(customStart, customEnd);
      }
    } else {
      setPeriod(tab);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      addToast({
        type: 'warning',
        title: 'Missing dates',
        message: 'Please provide both start date and end date.',
      });
      return;
    }
    setDateRange(customStart, customEnd);
  };

  const grossSales = Number(summary?.gross_sales ?? 0);
  const netEarnings = Number(currentSettlement?.net_amount ?? 0);
  const periodNetEarnings = Number(summary?.net_earnings ?? 0);
  const commission = Number(summary?.commission ?? 0);
  const commissionTax = Number(summary?.commission_tax ?? 0);
  const otherFees = Number(summary?.other_fees ?? 0);
  const taxesAndFees = commissionTax + otherFees;
  const discounts = Number(summary?.restaurant_discounts ?? 0);
  const refunds = completedRefundsTotal > 0 ? completedRefundsTotal : Number(summary?.refunds ?? 0);
  const adjustments = Number(summary?.adjustments ?? 0);
  const deliveredOrders = summary?.delivered_orders ?? 0;
  const unfinalizedOrders = summary?.unfinalized_delivered_orders ?? 0;

  const waterfall: WaterfallStep[] = useMemo(() => {
    if (!summary) return [];
    const steps: WaterfallStep[] = [
      { label: 'Gross Sales', value: grossSales, type: 'start' },
      { label: 'Commission', value: -commission, type: 'subtract' },
      { label: 'Taxes & Fees', value: -taxesAndFees, type: 'subtract' },
      { label: 'Discounts', value: -discounts, type: 'subtract' },
      { label: 'Refunds', value: -refunds, type: 'subtract' },
    ];
    if (adjustments !== 0) {
      steps.push({
        label: 'Adjustments',
        value: adjustments,
        type: adjustments >= 0 ? 'add' : 'subtract',
      });
    }
    steps.push({ label: 'Net Earnings', value: periodNetEarnings, type: 'end' });
    return steps;
  }, [summary, grossSales, commission, taxesAndFees, discounts, refunds, adjustments, periodNetEarnings]);

  if (isLoading && !earnings) return <PageSkeleton />;

  const statCards = [
    { label: 'Gross Sales', value: grossSales, prefix: '₹', icon: IndianRupee, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Net Earnings', value: periodNetEarnings, prefix: '₹', icon: Wallet, color: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-500/10' },
    { label: 'Commission', value: commission, prefix: '₹', icon: Percent, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
    { label: 'Taxes & Fees', value: taxesAndFees, prefix: '₹', icon: Receipt, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  ];

  const secondaryStats = [
    { label: 'Discounts Given', value: discounts, prefix: '₹', icon: TrendingDown, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Refunds Issued', value: refunds, prefix: '₹', icon: RotateCcw, color: 'text-orange-600 dark:text-orange-400' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Range toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {rangeTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleRefreshAll}
            disabled={isLoading || isSettlementRefreshing}
            className="btn-secondary text-sm"
            title="Refresh earnings and settlements"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isSettlementRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => addToast({ type: 'success', title: 'Export started', message: 'Your earnings report is being prepared' })}
            className="btn-secondary text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Custom Range Picker */}
      {activeTab === 'custom' && (
        <form
          onSubmit={handleApplyCustomRange}
          className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 animate-fade-in"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 dark:text-gray-300 font-medium">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600 dark:text-gray-300 font-medium">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary py-1.5 px-3.5 text-xs font-semibold"
          >
            {isLoading ? 'Querying...' : 'Apply Date Range'}
          </button>
          {earnings && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
              Showing: {earnings.start_date} to {earnings.end_date}
            </span>
          )}
        </form>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs border border-red-200 dark:border-red-900/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => refetchEarnings()}
            className="font-medium underline hover:no-underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Unfinalized warning banner */}
      {unfinalizedOrders > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800/60">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            {unfinalizedOrders} delivered order{unfinalizedOrders > 1 ? 's' : ''} in this period have pending financial snapshots and will be recognized once finalized.
          </span>
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
                {deliveredOrders > 0 && s.label === 'Gross Sales' && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {deliveredOrders} delivered
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
              <CountUp
                value={s.value}
                prefix={s.prefix}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              />
            </div>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        {secondaryStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-4 flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${(i + 4) * 80}ms` }}>
              <div className={`w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</p>
                <CountUp value={s.value} prefix={s.prefix} className="text-lg font-bold text-gray-900 dark:text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart + Payout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Waterfall chart */}
        <div className="card p-5 lg:col-span-2 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Gross to Net Breakdown</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Revenue waterfall — {earnings?.period ?? activeTab} {earnings ? `(${earnings.start_date} – ${earnings.end_date})` : ''}
              </p>
            </div>
            <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              {activeTab === 'today' ? 'Today' : activeTab === 'week' ? 'This week' : activeTab === 'month' ? 'This month' : 'Custom'}
            </span>
          </div>
          {waterfall.length > 0 ? (
            <WaterfallChart steps={waterfall} />
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400">
              No financial activity recorded in this period.
            </div>
          )}
        </div>

        {/* Payout details */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Payout Details</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Bank</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{payoutDetails.bankName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Account</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{payoutDetails.accountNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">IFSC</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{payoutDetails.ifsc}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">UPI ID</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{payoutDetails.upiId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Cycle</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{payoutDetails.payoutCycle}</span>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Current Period Net</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ₹{netEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {currentSettlement?.settlement_date ?? "No settlement scheduled"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settlement history */}
      <div className="card p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Settlement History</h3>
            {totalSettlements > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {totalSettlements}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshSettlements}
              disabled={isSettlementRefreshing}
              className="btn-ghost text-xs p-1.5"
              title="Refresh settlement history"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSettlementRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => addToast({ type: 'info', title: 'Export started', message: 'Settlement history is being prepared' })}
              className="btn-ghost text-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3">Period</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 text-right">Orders</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {settlementsLoading && settlements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                    Loading settlement history...
                  </td>
                </tr>
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                    No settlement records found.
                  </td>
                </tr>
              ) : (
                settlements.map((s) => {
                  const cfg = settlementStatusConfig[s.status] || settlementStatusConfig.PENDING;
                  const periodLabel = s.period_start === s.period_end ? s.period_start : `${s.period_start} – ${s.period_end}`;
                  const amount = Number(s.amount ?? s.net_amount) || 0;
                  const orders = s.orders ?? s.total_orders ?? 0;
                  return (
                    <tr key={s.batch_id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {periodLabel}
                        {s.is_simulated && (
                          <span className="ml-2 text-[10px] text-gray-400 font-normal border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
                            Simulated
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-500 dark:text-gray-400">{s.settlement_date}</td>
                      <td className="py-3 text-sm text-gray-500 dark:text-gray-400 text-right">{orders}</td>
                      <td className="py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">
                        {amount > 0 ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`badge px-2 py-0.5 text-[10px] ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${s.status === 'PROCESSING' ? 'animate-pulse' : ''}`} />
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getStepCeiling(val: number): number {
  if (val <= 1000) return 1000;
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  const step = mag >= 1000000 ? 200000 : mag >= 100000 ? 50000 : 5000;
  return Math.ceil(val / step) * step;
}

function formatCompactCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
  return `₹${val}`;
}

function WaterfallChart({ steps }: { steps: { label: string; value: number; type: string }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'waterfall' | 'breakdown'>('waterfall');

  const grossSales = steps.find((s) => s.type === 'start')?.value || 1;
  const netEarnings = steps.find((s) => s.type === 'end')?.value || grossSales;
  const retentionPct = ((netEarnings / grossSales) * 100).toFixed(1);

  const maxVal = Math.max(...steps.map((s) => Math.abs(s.value)));
  const ceiling = getStepCeiling(maxVal);

  // Usable height for the bars in pixels
  const chartHeightPx = 160;
  const scale = chartHeightPx / ceiling;

  let running = 0;
  const processedBars = steps.map((step) => {
    const isStart = step.type === 'start';
    const isEnd = step.type === 'end';
    const absVal = Math.abs(step.value);

    let startVal: number;
    let endVal: number;
    let bottomPx: number;
    let heightPx: number;
    let connectorY: number;

    if (isStart) {
      startVal = 0;
      endVal = step.value;
      running = step.value;
      bottomPx = 0;
      heightPx = Math.max(step.value * scale, 24);
      connectorY = heightPx;
    } else if (isEnd) {
      startVal = 0;
      endVal = step.value;
      bottomPx = 0;
      heightPx = Math.max(step.value * scale, 24);
      connectorY = heightPx;
    } else {
      startVal = running;
      endVal = running + step.value; // step.value is negative
      running = endVal;

      const topVal = Math.max(startVal, endVal);
      const botVal = Math.min(startVal, endVal);

      const topPx = topVal * scale;
      const rawHeight = (topVal - botVal) * scale;

      if (absVal === 0) {
        heightPx = 4;
        bottomPx = topPx;
        connectorY = topPx;
      } else {
        // Enforce minimum height of 16px so deductions are never tiny invisible slivers
        heightPx = Math.max(rawHeight, 16);
        bottomPx = Math.max(0, topPx - heightPx);
        connectorY = bottomPx;
      }
    }

    const pctOfGross = ((absVal / grossSales) * 100).toFixed(1);

    return {
      ...step,
      startVal,
      endVal,
      bottomPx,
      heightPx,
      absVal,
      pctOfGross,
      connectorY,
      runningAfter: isEnd ? step.value : running,
    };
  });

  const stepMeta: Record<
    string,
    {
      title: string;
      desc: string;
      icon: React.ComponentType<{ className?: string }>;
      textColor: string;
      badgeStyle: string;
      barBg: string;
    }
  > = {
    'Gross Sales': {
      title: 'Gross Sales',
      desc: 'Total food & beverage sales before platform deductions',
      icon: IndianRupee,
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeStyle:
        'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
      barBg: 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/20',
    },
    Commission: {
      title: 'Platform Commission',
      desc: 'Platform service commission fee on food orders',
      icon: Percent,
      textColor: 'text-rose-600 dark:text-rose-400',
      badgeStyle:
        'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
      barBg: 'bg-gradient-to-t from-rose-600 to-red-400 shadow-sm shadow-rose-500/20',
    },
    'Taxes/Fees': {
      title: 'Taxes & Regulatory Fees',
      desc: 'GST and government regulatory charges',
      icon: Receipt,
      textColor: 'text-rose-600 dark:text-rose-400',
      badgeStyle:
        'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
      barBg: 'bg-gradient-to-t from-rose-600 to-red-400 shadow-sm shadow-rose-500/20',
    },
    Discounts: {
      title: 'Merchant Discounts',
      desc: 'Coupons and promotional discounts funded by the restaurant',
      icon: TrendingDown,
      textColor: 'text-amber-600 dark:text-amber-400',
      badgeStyle:
        'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
      barBg: 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-sm shadow-amber-500/20',
    },
    Refunds: {
      title: 'Customer Refunds',
      desc: 'Order cancellations and customer claim adjustments',
      icon: RotateCcw,
      textColor: 'text-gray-500 dark:text-gray-400',
      badgeStyle:
        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
      barBg: 'bg-gray-300 dark:bg-gray-700',
    },
    'Net Earnings': {
      title: 'Net Payout',
      desc: 'Final payout amount settled to your restaurant bank account',
      icon: Wallet,
      textColor: 'text-brand-600 dark:text-brand-400',
      badgeStyle:
        'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800 font-bold',
      barBg: 'bg-gradient-to-t from-brand-600 to-brand-400 shadow-sm shadow-brand-500/20',
    },
  };

  const gridLevels = [
    { label: formatCompactCurrency(ceiling), bottomPx: ceiling * scale },
    { label: formatCompactCurrency(ceiling * 0.75), bottomPx: ceiling * 0.75 * scale },
    { label: formatCompactCurrency(ceiling * 0.5), bottomPx: ceiling * 0.5 * scale },
    { label: formatCompactCurrency(ceiling * 0.25), bottomPx: ceiling * 0.25 * scale },
    { label: '₹0', bottomPx: 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Legend & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Starting (Gross)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Deductions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">Net Payout</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
            {retentionPct}% Retained
          </span>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setViewMode('waterfall')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'waterfall'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Waterfall Flow
            </button>
            <button
              onClick={() => setViewMode('breakdown')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'breakdown'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Breakdown List
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'waterfall' ? (
        <div className="pt-2">
          {/* Main Waterfall Chart Canvas */}
          <div className="relative h-[230px] w-full select-none">
            {/* Horizontal Gridlines */}
            <div className="absolute inset-0 pointer-events-none">
              {gridLevels.map((lvl, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 flex items-center"
                  style={{ bottom: `${lvl.bottomPx}px` }}
                >
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 w-10 text-right pr-2">
                    {lvl.label}
                  </span>
                  <div className="flex-1 border-b border-dashed border-gray-200 dark:border-gray-800" />
                </div>
              ))}
            </div>

            {/* Step Columns */}
            <div className="absolute inset-0 pl-11 flex items-end justify-between">
              {processedBars.map((bar, i) => {
                const meta = stepMeta[bar.label] || {
                  title: bar.label,
                  desc: '',
                  icon: IndianRupee,
                  textColor: 'text-gray-600',
                  badgeStyle: 'bg-gray-100 text-gray-700',
                  barBg: 'bg-gray-400',
                };
                const Icon = meta.icon;
                const isHovered = hoveredIdx === i;
                const isZero = bar.absVal === 0;
                const prefix =
                  bar.type === 'start' ? '+' : bar.type === 'subtract' && bar.absVal > 0 ? '-' : '';

                return (
                  <div
                    key={i}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute top-0 z-30 pointer-events-none whitespace-nowrap bg-gray-900/95 dark:bg-gray-800 text-white px-3 py-2 rounded-xl shadow-xl text-xs border border-gray-700/60 backdrop-blur-md animate-fade-in">
                        <div className="flex items-center gap-1.5 font-bold text-gray-100">
                          <Icon className="w-3.5 h-3.5 text-brand-400" />
                          {meta.title}
                        </div>
                        <p className="text-gray-300 mt-1">
                          Amount:{' '}
                          <span className="font-bold text-white">
                            {prefix}₹{bar.absVal.toLocaleString('en-IN')}
                          </span>{' '}
                          ({bar.pctOfGross}% of sales)
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 max-w-[200px]">{meta.desc}</p>
                      </div>
                    )}

                    {/* Prominent Amount Tag Above Each Bar */}
                    <div
                      className="absolute z-20 flex flex-col items-center transition-all duration-200 group-hover:scale-105"
                      style={{
                        bottom: `${Math.min(chartHeightPx + 4, bar.bottomPx + bar.heightPx + 6)}px`,
                      }}
                    >
                      <span
                        className={`text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow-xs ${meta.badgeStyle}`}
                      >
                        {prefix}₹{bar.absVal.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
                        {bar.type === 'start'
                          ? '100%'
                          : bar.type === 'end'
                          ? `${retentionPct}%`
                          : `${bar.pctOfGross}%`}
                      </span>
                    </div>

                    {/* Step-to-Step Dashed Connector Line */}
                    {i < processedBars.length - 1 && (
                      <div
                        className="absolute left-1/2 w-full border-t border-dashed border-gray-300 dark:border-gray-600 pointer-events-none z-0"
                        style={{ bottom: `${bar.connectorY}px` }}
                      />
                    )}

                    {/* The Bar */}
                    <div
                      className="relative z-10 w-full max-w-[48px] sm:max-w-[56px] transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height: `${bar.heightPx}px`,
                        marginBottom: `${bar.bottomPx}px`,
                      }}
                    >
                      {isZero ? (
                        <div className="w-full h-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-center">
                          <span className="text-[8px] text-gray-400 font-bold">₹0</span>
                        </div>
                      ) : (
                        <div className={`w-full h-full rounded-lg ${meta.barBg}`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Step Labels */}
          <div className="pl-11 flex items-start justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
            {processedBars.map((bar, i) => {
              const meta = stepMeta[bar.label];
              const Icon = meta?.icon || IndianRupee;
              return (
                <div key={i} className="flex-1 text-center flex flex-col items-center px-1">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Icon className={`w-3.5 h-3.5 ${meta?.textColor}`} />
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[80px] sm:max-w-none">
                      {bar.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    {bar.type === 'start'
                      ? 'Base Sales'
                      : bar.type === 'end'
                      ? 'Take-Home'
                      : 'Deduction'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Detailed Breakdown List */
        <div className="space-y-2.5 pt-2">
          {processedBars.map((item, i) => {
            const meta = stepMeta[item.label];
            const Icon = meta?.icon || IndianRupee;
            const prefix =
              item.type === 'start' ? '+' : item.type === 'subtract' && item.absVal > 0 ? '-' : '';

            return (
              <div
                key={i}
                className="p-3 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/60 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${meta?.badgeStyle}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {meta?.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{meta?.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${meta?.textColor}`}>
                      {prefix}₹{item.absVal.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {item.type === 'start'
                        ? '100% of revenue'
                        : item.type === 'end'
                        ? `${retentionPct}% payout`
                        : `${item.pctOfGross}% of sales`}
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-200/80 dark:bg-gray-700/60 overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${meta?.barBg} transition-all duration-700`}
                    style={{
                      width: `${Math.min(
                        100,
                        item.type === 'start' ? 100 : (item.absVal / grossSales) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-500/10 border border-brand-200/60 dark:border-brand-500/20 flex items-center justify-between text-xs">
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              💡 For every ₹100 earned, you keep <strong>₹{retentionPct}</strong> after all
              platform fees, taxes, and customer discounts.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
