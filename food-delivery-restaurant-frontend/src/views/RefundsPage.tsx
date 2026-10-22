'use client';

import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Refund, RefundStatus } from '@/data/mockData';
import { RefundStatusChip } from '@/components/ui/StatusChip';
import { CountUp } from '@/components/ui/CountUp';
import {
  RotateCcw, Clock, AlertCircle, CheckCircle2, XCircle,
  Plus, Search, ArrowUpRight, IndianRupee, Percent,
  ChevronRight, RefreshCw, Filter, Receipt, ArrowRight,
} from 'lucide-react';

type TabFilter = 'ALL' | RefundStatus;

export function RefundsPage() {
  const {
    refunds,
    orders,
    loadRefunds,
    openRefundModal,
    setSelectedRefundId,
    viewOrder,
    retryRefund,
    completedRefundsTotal,
    pendingRefundsCount,
    failedRefundsCount,
  } = useApp();

  useEffect(() => {
    void loadRefunds();
  }, [loadRefunds]);

  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Stat calculations
  const processingCount = useMemo(
    () => refunds.filter((r) => r.status === 'PROCESSING').length,
    [refunds]
  );

  const processingAmount = useMemo(
    () =>
      refunds
        .filter((r) => r.status === 'PROCESSING')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [refunds]
  );

  const pendingAmount = useMemo(
    () =>
      refunds
        .filter((r) => r.status === 'PENDING')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [refunds]
  );

  const failedAmount = useMemo(
    () =>
      refunds
        .filter((r) => r.status === 'FAILED')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [refunds]
  );

  const refundRate = useMemo(() => {
    const totalOrdersCount = Math.max(orders.length, 1);
    const refundedOrdersCount = new Set(refunds.map((r) => r.order_id)).size;
    return Number(((refundedOrdersCount / totalOrdersCount) * 100).toFixed(1));
  }, [orders, refunds]);

  // 2. Filter tabs configuration
  const tabConfig: { id: TabFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: refunds.length },
    { id: 'PENDING', label: 'Pending', count: pendingRefundsCount },
    { id: 'PROCESSING', label: 'Processing', count: processingCount },
    { id: 'COMPLETED', label: 'Completed', count: refunds.filter((r) => r.status === 'COMPLETED').length },
    { id: 'FAILED', label: 'Failed', count: failedRefundsCount },
  ];

  // 3. Filtered refund list
  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const matchesTab = activeTab === 'ALL' || r.status === activeTab;
      if (!matchesTab) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        r.id.toLowerCase().includes(q) ||
        r.order_id.toLowerCase().includes(q) ||
        r.order_short_id.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.payment_method.toLowerCase().includes(q) ||
        r.refund_reference.toLowerCase().includes(q)
      );
    });
  }, [refunds, activeTab, searchQuery]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statCards = [
    {
      label: 'Total Refunded',
      value: completedRefundsTotal,
      prefix: '₹',
      decimals: 0,
      icon: RotateCcw,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      subtext: `${refunds.filter((r) => r.status === 'COMPLETED').length} settled claims`,
    },
    {
      label: 'Pending Refunds',
      value: pendingRefundsCount,
      prefix: '',
      decimals: 0,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      subtext: `₹${pendingAmount.toLocaleString('en-IN')} pending approval`,
    },
    {
      label: 'Processing',
      value: processingCount,
      prefix: '',
      decimals: 0,
      icon: RefreshCw,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      subtext: `₹${processingAmount.toLocaleString('en-IN')} with gateway`,
    },
    {
      label: 'Failed Refunds',
      value: failedRefundsCount,
      prefix: '',
      decimals: 0,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-500/10',
      subtext: failedRefundsCount > 0 ? `₹${failedAmount.toLocaleString('en-IN')} requires retry` : 'No failures',
    },
    {
      label: 'Refund Rate',
      value: refundRate,
      prefix: '',
      suffix: '%',
      decimals: 1,
      icon: Percent,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-500/10',
      subtext: `${refunds.length} claims across orders`,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Customer Refunds & Adjustments
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Manage reversals, process customer dispute claims, and track bank settlements
          </p>
        </div>

        <button
          onClick={() => openRefundModal()}
          className="btn-primary text-xs py-2 px-4 flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Request Refund</span>
        </button>
      </div>

      {/* Summary Stat Tiles (Dashboard stat-card style, animated count-up) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="stat-card animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-2.5">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{s.label}</p>
              <CountUp
                value={s.value}
                prefix={s.prefix}
                suffix={s.suffix}
                decimals={s.decimals}
                duration={1000}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                {s.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-1">
        {/* Tabs / Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {tabConfig.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === t.id
                      ? 'bg-white/20 dark:bg-gray-900/20'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search refund, order, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9 pr-3 py-1.5 text-xs w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Refund List: Desktop Table / Mobile Stacked Cards */}
      {filteredRefunds.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mx-auto mb-3">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            No refunds in {activeTab === 'ALL' ? 'this view' : activeTab.toLowerCase()}
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `No refunds match the query "${searchQuery}". Try a different keyword.`
              : activeTab === 'PENDING'
              ? 'All refund requests have been reviewed and advanced.'
              : activeTab === 'FAILED'
              ? 'No failed refunds. All settlements are operating normally.'
              : 'Refund requests submitted for orders will appear here with full audit history.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop / Tablet Table Style (reusing Earnings settlement history style) */}
          <div className="hidden md:block card p-5 animate-slide-up">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-3">Refund ID</th>
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/40">
                  {filteredRefunds.map((refund) => (
                    <tr
                      key={refund.id}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedRefundId(refund.id)}
                    >
                      {/* Refund ID & Date */}
                      <td className="py-3.5 text-xs">
                        <span className="font-mono font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">
                          {refund.id}
                        </span>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatDate(refund.created_at)}
                        </p>
                      </td>

                      {/* Clickable Order ID -> Opens that Order's Detail Drawer */}
                      <td className="py-3.5 text-xs" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => viewOrder(refund.order_id)}
                          className="inline-flex items-center gap-1 font-mono font-semibold text-brand-600 dark:text-brand-400 hover:underline bg-brand-50/60 dark:bg-brand-500/10 px-2 py-0.5 rounded-lg border border-brand-200/50 dark:border-brand-500/20"
                          title="Open Order Detail Drawer"
                        >
                          <span>{refund.order_short_id}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 text-xs text-gray-800 dark:text-gray-200 font-medium">
                        {refund.customer_name}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 text-xs">
                        <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px]">
                          {refund.reason}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        {refund.payment_method}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 text-xs text-right">
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₹{refund.amount}
                        </span>
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {refund.refund_type === 'FULL' ? 'Full' : 'Partial'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 text-center">
                        <RefundStatusChip status={refund.status} size="xs" />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {refund.status === 'FAILED' && (
                            <button
                              type="button"
                              onClick={() => retryRefund(refund.id)}
                              className="btn bg-red-600 hover:bg-red-700 text-white text-[11px] py-1 px-2.5 rounded-lg shadow-xs"
                            >
                              <RotateCcw className="w-3 h-3" /> Retry
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedRefundId(refund.id)}
                            className="btn-ghost text-xs p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            title="View refund details"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards (matching Orders / Reviews mobile pattern) */}
          <div className="md:hidden space-y-3">
            {filteredRefunds.map((refund, i) => (
              <div
                key={refund.id}
                onClick={() => setSelectedRefundId(refund.id)}
                className="card p-4 animate-slide-up cursor-pointer hover:shadow-soft active:scale-[0.99] transition-all duration-150"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                      {refund.id}
                    </span>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(refund.created_at)}
                    </p>
                  </div>
                  <RefundStatusChip status={refund.status} size="xs" />
                </div>

                <div className="flex items-center justify-between py-2 border-y border-gray-100 dark:border-gray-800 text-xs">
                  <div>
                    <p className="text-gray-400 text-[11px]">Order</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewOrder(refund.order_id);
                      }}
                      className="font-mono font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 mt-0.5"
                    >
                      {refund.order_short_id} <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[11px]">Customer</p>
                    <p className="font-medium text-gray-900 dark:text-white mt-0.5">
                      {refund.customer_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-[11px]">Amount</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                      ₹{refund.amount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5">
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px]">
                    {refund.reason}
                  </span>
                  {refund.status === 'FAILED' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        retryRefund(refund.id);
                      }}
                      className="btn bg-red-600 text-white text-xs py-1 px-3 rounded-lg"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                      View Drawer <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
