'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { RefundStatusChip } from '@/components/ui/StatusChip';
import {
  X, CheckCircle2, XCircle, Clock, RotateCcw,
  Receipt, ArrowUpRight, Copy, Check, AlertCircle,
  ExternalLink, User, Phone, MapPin, IndianRupee,
} from 'lucide-react';

export function RefundDrawer() {
  const {
    selectedRefundId,
    setSelectedRefundId,
    refunds,
    orders,
    complaints,
    viewOrder,
    viewComplaint,
    retryRefund,
    addToast,
  } = useApp();

  const [copiedRef, setCopiedRef] = useState(false);

  if (!selectedRefundId) return null;

  const refund = refunds.find((r) => r.id === selectedRefundId);
  if (!refund) return null;

  const order = orders.find(
    (o) =>
      o.id === refund.order_id ||
      o.shortId === refund.order_short_id ||
      o.shortId === `#${refund.order_id}`
  );

  const linkedComplaint = refund.complaint_id
    ? complaints.find((c) => String(c.id) === String(refund.complaint_id))
    : null;

  const handleCopyRef = () => {
    if (!refund.refund_reference) return;
    navigator.clipboard?.writeText(refund.refund_reference);
    setCopiedRef(true);
    addToast({
      type: 'info',
      title: 'Reference Copied',
      message: `Gateway reference ${refund.refund_reference} copied to clipboard`,
    });
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFailed = refund.status === 'FAILED';
  const isCompleted = refund.status === 'COMPLETED';
  const isProcessing = refund.status === 'PROCESSING';
  const isPending = refund.status === 'PENDING';

  const hasPaymentMethod = Boolean(
    refund.payment_method &&
    refund.payment_method.trim() !== '' &&
    refund.payment_method !== 'Not available'
  );

  const hasRefundRef = Boolean(
    refund.refund_reference &&
    refund.refund_reference.trim() !== ''
  );

  // Stepper steps configuration
  const steps = [
    {
      id: 'PENDING',
      title: 'Refund Requested',
      desc: 'Refund request recorded; awaiting payment processing integration.',
      timestamp: refund.created_at,
      isDone: true,
      isCurrent: isPending,
    },
    {
      id: 'PROCESSING',
      title: 'Refund Processing',
      desc: isProcessing
        ? 'Refund marked as processing. External payment confirmation is not yet verified.'
        : 'Awaiting processing.',
      timestamp:
        isProcessing || isCompleted
          ? refund.updated_at || refund.created_at
          : null,
      isDone: isCompleted,
      isCurrent: isProcessing,
    },
    {
      id: 'COMPLETED',
      title: 'Refund Completed',
      desc: isCompleted
        ? 'Refund marked completed. Verify provider confirmation before treating it as settled.'
        : 'Awaiting verified refund completion.',
      timestamp: isCompleted ? refund.completed_at : null,
      isDone: isCompleted,
      isCurrent: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setSelectedRefundId(null)}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full flex flex-col shadow-2xl border-l border-gray-200 dark:border-gray-800 animate-slide-in-right z-10">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{refund.id}</h2>
                <RefundStatusChip status={refund.status} size="xs" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Created on {formatDate(refund.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedRefundId(null)}
            className="btn-ghost p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
          {/* Status Timeline Stepper */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Refund Timeline
            </h3>

            {isFailed ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Refund Initiated</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(refund.created_at)}</p>
                  </div>
                </div>

                <div className="pl-4">
                  <div className="w-0.5 h-6 bg-red-300 dark:bg-red-800 -my-2" />
                </div>

                {/* Failed Branch */}
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400">
                  <div className="flex items-center gap-2 mb-1.5 font-bold text-xs">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span>Settlement Failed</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-300 mb-3">
                    {refund.failed_reason ||
                      'Refund processing failed. Check the recorded failure details before taking further action.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => retryRefund(refund.id)}
                    disabled
                    className="btn bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs w-full py-1.5 cursor-not-allowed shadow-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Unavailable (Gateway Integration Required)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                            step.isDone
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          } ${step.isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}
                        >
                          {step.isDone ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">{i + 1}</span>
                          )}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 h-10 ${
                              step.isDone ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'
                            }`}
                          />
                        )}
                      </div>
                      <div className="pt-1 pb-5 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            step.isDone
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {step.desc}
                        </p>
                        {step.timestamp && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
                            {formatDate(step.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Summary Card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Order Details
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedRefundId(null);
                  viewOrder(refund.order_id);
                }}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                View Order <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Order ID:</span>
                <span className="font-bold text-gray-900 dark:text-white">{refund.order_short_id}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Customer:</span>
                <span className="font-medium text-gray-900 dark:text-white">{refund.customer_name}</span>
              </div>
              {refund.customer_phone && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Contact:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">{refund.customer_phone}</span>
                </div>
              )}
              {order && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                  <p className="text-gray-400 dark:text-gray-500 text-[11px] mb-1">Items in original order:</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="card p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Financial Breakdown
            </h3>
            {order && Number.isFinite(Number(order.total)) ? (
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Original Order Amount</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ₹{Number(order.total).toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Original order amount unavailable.
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Refund Scope</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {refund.refund_type === 'FULL' ? 'Full Refund (100%)' : 'Partial Refund'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Refund Amount</span>
              <span className="text-brand-600 dark:text-brand-400">
                ₹{Number(refund.amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Gateway & Payment Details */}
          {(hasPaymentMethod || hasRefundRef || refund.reason) && (
            <div className="card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Refund Destination & Reference
              </h3>
              {hasPaymentMethod && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Refund Destination:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{refund.payment_method}</span>
                </div>
              )}
              {hasRefundRef && (
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">GATEWAY REF</p>
                    <p className="font-mono font-bold text-gray-900 dark:text-white text-xs mt-0.5">
                      {refund.refund_reference}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="btn-ghost p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    title="Copy reference code"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
              {refund.reason && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Refund Reason:</p>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 text-xs font-semibold">
                      {refund.reason}
                    </span>
                  </div>
                  {refund.reason_note && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 italic">
                      "{refund.reason_note}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Items Refunded */}
          {refund.items_refunded && refund.items_refunded.length > 0 && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">
                Items Refunded
              </h3>
              <div className="space-y-2">
                {refund.items_refunded.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Complaint Card */}
          {linkedComplaint && (
            <div className="card p-4 border-l-4 border-l-brand-500 bg-brand-50/20 dark:bg-brand-500/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Linked Customer Complaint</h4>
                </div>
                <span className="text-[10px] uppercase font-bold text-brand-600 dark:text-brand-400">
                  {linkedComplaint.status}
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                {linkedComplaint.description}
              </p>
              {linkedComplaint.resolution && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg mb-3">
                  Resolution: {linkedComplaint.resolution}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedRefundId(null);
                  viewComplaint(linkedComplaint.id);
                }}
                className="btn-secondary text-xs w-full py-2 flex items-center justify-center gap-1.5 font-semibold"
              >
                <span>View Complaint in Reviews Tab</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 flex items-center gap-2">
          {isFailed && (
            <button
              onClick={() => retryRefund(refund.id)}
              disabled
              className="btn bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs flex-1 py-2.5 cursor-not-allowed shadow-none"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Unavailable
            </button>
          )}
          <button
            onClick={() => setSelectedRefundId(null)}
            className="btn-secondary text-xs flex-1 py-2.5"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
