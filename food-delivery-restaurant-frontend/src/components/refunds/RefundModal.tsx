'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Complaint, ComplaintType } from '@/data/mockData';
import type { Order } from '@/types/order';
import { AnimatedCheckmark, ConfettiBurst } from '@/components/ui/SuccessAnimation';
import {
  X, Search, AlertCircle, RotateCcw,
  Receipt, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { apiCreateComplaintRefund } from '@/services/api';

const REASON_OPTIONS = [
  'Missing item',
  'Wrong item',
  'Food quality issue',
  'Damaged packaging',
  'Temperature issue',
  'Late delivery',
  'Customer cancellation',
  'Billing discrepancy',
  'Other',
];

export const complaintTypeToReason: Record<ComplaintType, string> = {
  MISSING_ITEM: 'Missing item',
  WRONG_ITEM: 'Wrong item',
  FOOD_QUALITY: 'Food quality issue',
  PACKAGING: 'Damaged packaging',
  TEMPERATURE: 'Temperature issue',
  DELIVERY: 'Late delivery',
  OTHER: 'Other',
};

/**
 * Calculates the eligible refundable amount for selected items,
 * applying proportional taxes and discounts when order subtotal is present.
 */
function calculateItemEligibleAmount(
  itemsMap: Record<string, number>,
  order: Order | undefined
): number {
  if (!order || !order.items || order.items.length === 0) return 0;

  const rawItemsTotal = order.items.reduce((sum, it) => {
    const q = itemsMap[it.id] || 0;
    return sum + q * it.price;
  }, 0);

  if (rawItemsTotal <= 0) return 0;

  // Apply proportional taxes and discounts when order subtotal is present
  if (order.subtotal > 0) {
    const proportion = rawItemsTotal / order.subtotal;
    const propTax = (order.taxes || 0) * proportion;
    const propDiscount = (order.discount || 0) * proportion;
    const finalAmount = rawItemsTotal + propTax - propDiscount;
    return Math.max(0, Math.min(finalAmount, order.total));
  }

  return Math.min(rawItemsTotal, order.total);
}

export function RefundModal() {
  const {
    refundModalOpen,
    refundModalDefaults,
    closeRefundModal,
    orders,
    complaints,
    refunds,
    loadRefunds,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>('');
  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [amountInput, setAmountInput] = useState<string>('');
  const [destinationMethod, setDestinationMethod] = useState<'ORIGINAL_PAYMENT_METHOD' | 'UPI' | 'BANK_ACCOUNT'>('ORIGINAL_PAYMENT_METHOD');
  const [reason, setReason] = useState<string>('Missing item');
  const [reasonNote, setReasonNote] = useState<string>('');
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Numeric amount helper derived from amountInput
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amountInput);
    return isNaN(parsed) ? 0 : parsed;
  }, [amountInput]);

  // Find the selected order
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return undefined;
    const cleanSelected = selectedOrderId.replace(/^#/, '');
    return orders.find((o) => {
      const cleanOId = o.id.replace(/^#/, '');
      const cleanOShort = o.shortId.replace(/^#/, '');
      return (
        cleanOId === cleanSelected ||
        cleanOShort === cleanSelected ||
        cleanOShort === `ORD-${cleanSelected.padStart(4, '0')}` ||
        cleanSelected === `ORD-${cleanOId.padStart(4, '0')}`
      );
    });
  }, [orders, selectedOrderId]);

  // Check if order is Cash On Delivery
  const isCodOrder = useMemo(() => {
    if (!selectedOrder) return false;
    const pm = (selectedOrder.paymentMethod || '').toUpperCase();
    const ps = (selectedOrder.paymentStatus || '').toUpperCase();
    return pm.includes('COD') || pm.includes('CASH') || ps === 'COD';
  }, [selectedOrder]);

  // Check if order payment is a DEMO payment
  const isDemoPayment = useMemo(() => {
    if (!selectedOrder) return false;
    const pm = (selectedOrder.paymentMethod || '').toUpperCase();
    const ps = (selectedOrder.paymentStatus || '').toUpperCase();
    return pm.includes('DEMO') || ps.includes('DEMO');
  }, [selectedOrder]);

  // Check if item-level pricing information is available
  const hasItemPricing = useMemo(() => {
    return Boolean(
      selectedOrder?.items &&
      selectedOrder.items.length > 0 &&
      selectedOrder.items.some((i) => i.price > 0)
    );
  }, [selectedOrder]);

  // Find currently selected complaint
  const selectedComplaint = useMemo(() => {
    if (!selectedComplaintId) return undefined;
    return complaints.find((c) => String(c.id) === String(selectedComplaintId));
  }, [complaints, selectedComplaintId]);

  const isMissingItemComplaint = useMemo(() => {
    return selectedComplaint?.type === 'MISSING_ITEM' || reason === 'Missing item';
  }, [selectedComplaint, reason]);

  // Eligible item-level amount based on selected items
  const selectedItemsAmount = useMemo(() => {
    return calculateItemEligibleAmount(selectedItems, selectedOrder);
  }, [selectedItems, selectedOrder]);

  // Maximum eligible amount
  const maxRefundAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    const orderTotal = selectedOrder.total || 0;

    if (refundType === 'FULL') {
      return orderTotal;
    }

    // Partial refund mode:
    if (isMissingItemComplaint) {
      if (!hasItemPricing) {
        // If item-level pricing information is unavailable, show a clear validation message instead of inventing a refund amount.
        return 0;
      }
      // For a missing-item complaint, calculate the amount strictly from the affected items and quantities
      return selectedItemsAmount;
    }

    return orderTotal;
  }, [selectedOrder, refundType, isMissingItemComplaint, hasItemPricing, selectedItemsAmount]);

  // Filtered and deduplicated resolved complaints eligible for this order
  const eligibleComplaints = useMemo(() => {
    if (!selectedOrder) return [];
    const cleanId = selectedOrder.shortId.replace(/^#/, '');
    const orderId = selectedOrder.id.replace(/^#/, '');

    // Find complaints belonging to this order
    const orderComplaints = complaints.filter((c) => {
      const cOrderId = (c.order_id || '').replace(/^#/, '');
      const cShortId = (c.orderShortId || '').replace(/^#/, '');
      return (
        cOrderId === cleanId ||
        cOrderId === orderId ||
        cShortId === cleanId ||
        cShortId === orderId ||
        cShortId === `ORD-${cleanId.padStart(4, '0')}`
      );
    });

    // Canonical deduplication by complaint_id
    const seenIds = new Set<string>();
    const uniqueComplaints: Complaint[] = [];
    for (const c of orderComplaints) {
      const cid = String(c.id);
      if (!seenIds.has(cid)) {
        seenIds.add(cid);
        uniqueComplaints.push(c);
      }
    }

    // Set of complaint IDs already linked to a refund
    const refundedComplaintIds = new Set<string>(
      refunds
        .map((r: any) => String(r.complaint_id || r.complaintId || ''))
        .filter((id) => id && id !== 'undefined' && id !== 'null')
    );

    // Filter: Exclude rejected, exclude already linked to refund, ensure resolved
    return uniqueComplaints.filter((c) => {
      const cid = String(c.id);
      // Always preserve preselected complaint if it is resolved
      if (selectedComplaintId && cid === String(selectedComplaintId)) {
        return c.status === 'RESOLVED';
      }
      if (c.status !== 'RESOLVED') return false;
      if (refundedComplaintIds.has(cid)) return false;
      return true;
    });
  }, [complaints, selectedOrder, refunds, selectedComplaintId]);

  // Filtered orders for selector
  const eligibleOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.shortId.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.paymentMethod.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  // Initialize or reset form whenever modal opens or defaults change
  useEffect(() => {
    if (!refundModalOpen) {
      setIsSuccess(false);
      setError(null);
      return;
    }

    const defaultOrderId = refundModalDefaults?.orderId;
    const defaultComplaintId = refundModalDefaults?.complaintId
      ? String(refundModalDefaults.complaintId)
      : '';

    let targetOrderId = defaultOrderId;
    let targetComplaint: Complaint | undefined;
    if (defaultComplaintId) {
      targetComplaint = complaints.find((c) => String(c.id) === defaultComplaintId);
      if (targetComplaint && !targetOrderId) {
        targetOrderId = targetComplaint.order_id || targetComplaint.orderShortId.replace(/^#/, '');
      }
    }

    const initialOrderId = targetOrderId
      ? targetOrderId.replace(/^#/, '')
      : orders[0]
      ? orders[0].shortId.replace(/^#/, '')
      : '';

    setSelectedOrderId(initialOrderId);
    setSelectedComplaintId(defaultComplaintId);

    // Match order
    const matchedOrder = orders.find((o) => {
      const cleanOId = o.id.replace(/^#/, '');
      const cleanOShort = o.shortId.replace(/^#/, '');
      return (
        cleanOId === initialOrderId ||
        cleanOShort === initialOrderId ||
        cleanOShort === `ORD-${initialOrderId.padStart(4, '0')}` ||
        initialOrderId === `ORD-${cleanOId.padStart(4, '0')}`
      );
    });

    const isCod = Boolean(
      matchedOrder &&
      ((matchedOrder.paymentMethod || '').toUpperCase().includes('COD') ||
       (matchedOrder.paymentMethod || '').toUpperCase().includes('CASH') ||
       matchedOrder.paymentStatus === 'COD')
    );
    setDestinationMethod(isCod ? 'UPI' : 'ORIGINAL_PAYMENT_METHOD');

    // Default reason from defaults or complaint or fallback
    if (refundModalDefaults?.defaultReason) {
      setReason(refundModalDefaults.defaultReason);
    } else if (targetComplaint) {
      setReason(complaintTypeToReason[targetComplaint.type] || 'Other');
    } else if (defaultComplaintId) {
      const cmp = complaints.find((c) => String(c.id) === defaultComplaintId);
      if (cmp) {
        setReason(complaintTypeToReason[cmp.type] || 'Other');
      }
    } else {
      setReason('Missing item');
    }

    const fullOrderTotal = matchedOrder?.total || 0;
    const hasItems = Boolean(
      matchedOrder?.items &&
      matchedOrder.items.length > 0 &&
      matchedOrder.items.some((i) => i.price > 0)
    );
    const isMissing = targetComplaint
      ? targetComplaint.type === 'MISSING_ITEM'
      : (refundModalDefaults?.defaultReason === 'Missing item');

    if (refundModalDefaults?.suggestedAmount != null && refundModalDefaults.suggestedAmount > 0) {
      const val = Math.min(refundModalDefaults.suggestedAmount, fullOrderTotal || 999999);
      setAmountInput(val.toFixed(2));
      if (fullOrderTotal && refundModalDefaults.suggestedAmount < fullOrderTotal) {
        setRefundType('PARTIAL');
      } else {
        setRefundType('FULL');
      }
      setSelectedItems({});
    } else if (isMissing && hasItems) {
      // For a missing item complaint with item-level data, start partial with 0 items selected
      setRefundType('PARTIAL');
      setAmountInput('');
      setSelectedItems({});
    } else if (fullOrderTotal > 0) {
      setAmountInput(fullOrderTotal.toFixed(2));
      setRefundType('FULL');
      if (matchedOrder?.items) {
        const all: Record<string, number> = {};
        matchedOrder.items.forEach((it) => {
          all[it.id] = it.quantity;
        });
        setSelectedItems(all);
      }
    } else {
      setAmountInput('0.00');
      setRefundType('FULL');
      setSelectedItems({});
    }

    setReasonNote('');
    setError(null);
    setIsSuccess(false);
    setSearchQuery('');
  }, [refundModalOpen, refundModalDefaults, orders, complaints]);

  const handleSelectOrder = (order: Order) => {
    const clean = order.shortId.replace(/^#/, '');
    setSelectedOrderId(clean);
    setOrderDropdownOpen(false);

    const isCod =
      (order.paymentMethod || '').toUpperCase().includes('COD') ||
      (order.paymentMethod || '').toUpperCase().includes('CASH') ||
      order.paymentStatus === 'COD';
    setDestinationMethod(isCod ? 'UPI' : 'ORIGINAL_PAYMENT_METHOD');

    // Find eligible resolved complaints for this new order
    const orderCleanId = order.shortId.replace(/^#/, '');
    const orderId = order.id.replace(/^#/, '');
    const matchingResolved = complaints.filter((c) => {
      const cOrderId = (c.order_id || '').replace(/^#/, '');
      const cShortId = (c.orderShortId || '').replace(/^#/, '');
      const isMatch =
        cOrderId === orderCleanId ||
        cOrderId === orderId ||
        cShortId === orderCleanId ||
        cShortId === orderId ||
        cShortId === `ORD-${orderCleanId.padStart(4, '0')}`;
      return isMatch && c.status === 'RESOLVED';
    });

    if (matchingResolved.length > 0) {
      setSelectedComplaintId(matchingResolved[0].id);
      if (complaintTypeToReason[matchingResolved[0].type]) {
        setReason(complaintTypeToReason[matchingResolved[0].type]);
      }
    } else {
      setSelectedComplaintId('');
    }

    if (refundType === 'FULL') {
      setAmountInput(order.total.toFixed(2));
      if (order.items && order.items.length > 0) {
        const all: Record<string, number> = {};
        order.items.forEach((it) => {
          all[it.id] = it.quantity;
        });
        setSelectedItems(all);
      }
    } else {
      setSelectedItems({});
      setAmountInput('');
    }
  };

  const handleRefundTypeChange = (type: 'FULL' | 'PARTIAL') => {
    setRefundType(type);
    if (type === 'FULL') {
      if (selectedOrder) {
        setAmountInput(selectedOrder.total.toFixed(2));
        if (selectedOrder.items && selectedOrder.items.length > 0) {
          const all: Record<string, number> = {};
          selectedOrder.items.forEach((it) => {
            all[it.id] = it.quantity;
          });
          setSelectedItems(all);
        }
      }
    } else {
      // PARTIAL mode
      if (isMissingItemComplaint && hasItemPricing) {
        const itemAmount = calculateItemEligibleAmount(selectedItems, selectedOrder);
        setAmountInput(itemAmount > 0 ? itemAmount.toFixed(2) : '');
      }
    }
  };

  const handleItemQuantityChange = (itemId: string, newQty: number) => {
    setSelectedItems((prev) => {
      const updated = { ...prev, [itemId]: newQty };
      const nextAmount = calculateItemEligibleAmount(updated, selectedOrder);
      setAmountInput(nextAmount > 0 ? nextAmount.toFixed(2) : '');
      setRefundType('PARTIAL');
      return updated;
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string so user can clear and type numbers
    if (val === '') {
      setAmountInput('');
      return;
    }
    // Allow positive numbers with optional decimal point and up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(val)) {
      setAmountInput(val);
      if (refundType === 'FULL') {
        setRefundType('PARTIAL');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!selectedOrder) {
      setError('Please select an order to refund');
      return;
    }

    if (!selectedComplaintId) {
      setError('Select the complaint associated with this refund');
      return;
    }

    const complaintToRefund = complaints.find(
      (c) => String(c.id) === String(selectedComplaintId)
    );

    if (!complaintToRefund) {
      setError('Selected complaint could not be found');
      return;
    }

    if (complaintToRefund.status !== 'RESOLVED') {
      setError('Only a resolved complaint can be refunded');
      return;
    }

    // Check if missing-item complaint lacks item-level pricing
    if (isMissingItemComplaint && !hasItemPricing && refundType === 'PARTIAL') {
      setError(
        'Item pricing details are unavailable for this order (no itemized quantities or prices found in order records). An itemized missing-item refund cannot be calculated.'
      );
      return;
    }

    if (numericAmount <= 0) {
      setError('Please enter a valid positive refund amount');
      return;
    }

    // Max amount validation
    if (numericAmount > maxRefundAmount) {
      setError(
        `Refund amount cannot exceed the maximum eligible amount of ₹${maxRefundAmount.toFixed(2)}`
      );
      return;
    }

    if (!reason.trim()) {
      setError('Please choose a reason for the refund');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const destination = isCodOrder ? destinationMethod : 'ORIGINAL_PAYMENT_METHOD';
      const result = await apiCreateComplaintRefund(
        Number(selectedComplaintId),
        {
          amount: Number(numericAmount.toFixed(2)),
          reason: [reason.trim(), reasonNote.trim()]
            .filter(Boolean)
            .join(' — ')
            .slice(0, 255),
          destination_method: destination,
          idempotency_key: crypto.randomUUID(),
        }
      );

      await loadRefunds();
      console.info('Refund record created:', result);
      setIsSuccess(true);

      // Close modal after showing success
      setTimeout(() => {
        closeRefundModal();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create the refund record'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!refundModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSuccess && closeRefundModal()}
      />

      {/* Modal Dialog */}
      <div className="relative card w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-2xl shadow-2xl animate-slide-up border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
        {/* Celebration State on Submit */}
        {isSuccess ? (
          <div className="p-10 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[360px]">
            <ConfettiBurst count={24} />
            <div className="mb-4">
              <AnimatedCheckmark size="lg" variant="emerald" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {isDemoPayment ? 'Pending Development Refund Created' : 'Refund Record Created'}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              {isDemoPayment
                ? 'A PENDING refund request was recorded for testing against demo payment data. No money has been transferred or deducted.'
                : 'The refund record was created successfully. Payment execution has not been confirmed.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-gray-900 dark:text-white leading-tight">
                    Issue Customer Refund
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Create payment reversal and synchronize resolution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRefundModal}
                className="btn-ghost p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {isDemoPayment && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Development / Demo Order:</strong> This order was paid via a DEMO payment. Submitting will record a PENDING refund request for testing purposes only. No money will be transferred or paid out.
                  </span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Order Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Select Order <span className="text-red-500">*</span>
                </label>

                {selectedOrder && !orderDropdownOpen ? (
                  <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold shrink-0">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {selectedOrder.shortId}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {selectedOrder.customerName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Total: <strong className="text-gray-900 dark:text-white">₹{selectedOrder.total}</strong> • Paid via {selectedOrder.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderDropdownOpen(true)}
                      className="btn-secondary text-xs py-1 px-2.5"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search order ID (e.g. ORD-0012) or customer name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10 text-xs"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800/60 scrollbar-thin bg-white dark:bg-gray-900">
                      {eligibleOrders.length === 0 ? (
                        <p className="p-3 text-xs text-gray-400 text-center">No orders match your search.</p>
                      ) : (
                        eligibleOrders.map((ord) => (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => handleSelectOrder(ord)}
                            className="w-full text-left p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{ord.shortId} — {ord.customerName}</p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                {ord.items.length > 0
                                  ? ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
                                  : 'No items recorded'}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <span className="font-bold text-gray-900 dark:text-white">₹{ord.total}</span>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{ord.paymentStatus}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Linked Complaint Dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Linked Complaint <span className="text-red-500">*</span></span>
                  {selectedComplaintId && (
                    <button
                      type="button"
                      onClick={() => setSelectedComplaintId('')}
                      className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Unlink
                    </button>
                  )}
                </label>
                <div className="relative">
                  <select
                    value={selectedComplaintId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedComplaintId(cid);
                      if (cid) {
                        const matched = complaints.find((c) => String(c.id) === cid);
                        if (matched && complaintTypeToReason[matched.type]) {
                          setReason(complaintTypeToReason[matched.type]);
                        }
                      }
                    }}
                    className="input text-xs appearance-none pr-8 cursor-pointer"
                  >
                    <option value="">Select a resolved complaint</option>
                    {eligibleComplaints.map((c) => (
                      <option key={c.id} value={c.id}>
                        Complaint #{c.id} · {c.orderShortId} · {c.type.replace(/_/g, ' ')} ({c.status})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {eligibleComplaints.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    No eligible resolved complaints found for this order. Only resolved complaints can be refunded.
                  </p>
                )}
              </div>

              {/* 3. Affected Items */}
              {selectedOrder && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                      Affected Items
                    </label>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Select the affected item quantities to calculate the refund.
                    </p>
                  </div>

                  {!hasItemPricing ? (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Item pricing details are unavailable for this order (no itemized quantities or prices found in order records). An itemized missing-item refund cannot be calculated.
                      </span>
                    </div>
                  ) : (
                    selectedOrder.items.map((item) => {
                      const quantity = selectedItems[item.id] || 0;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-800 rounded-xl p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₹{item.price.toFixed(2)} each · Quantity ordered: {item.quantity}
                            </p>
                          </div>

                          <select
                            value={quantity}
                            onChange={(event) => {
                              handleItemQuantityChange(item.id, Number(event.target.value));
                            }}
                            className="input w-20 text-xs"
                            aria-label={`Refund quantity for ${item.name}`}
                          >
                            {Array.from(
                              { length: item.quantity + 1 },
                              (_, index) => index
                            ).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 4. Refund Type Toggle */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Refund Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRefundTypeChange('FULL')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      refundType === 'FULL'
                        ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500 text-brand-700 dark:text-brand-300 shadow-xs'
                        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${refundType === 'FULL' ? 'border-brand-500' : 'border-gray-400'}`}>
                      {refundType === 'FULL' && <span className="w-2 h-2 rounded-full bg-brand-500" />}
                    </div>
                    Full Refund {selectedOrder ? `(₹${selectedOrder.total})` : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRefundTypeChange('PARTIAL')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      refundType === 'PARTIAL'
                        ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500 text-brand-700 dark:text-brand-300 shadow-xs'
                        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${refundType === 'PARTIAL' ? 'border-brand-500' : 'border-gray-400'}`}>
                      {refundType === 'PARTIAL' && <span className="w-2 h-2 rounded-full bg-brand-500" />}
                    </div>
                    Partial Refund
                  </button>
                </div>
              </div>

              {/* 5. Refund Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Item Refund Amount <span className="text-red-500">*</span>
                  </label>
                  {hasItemPricing && (
                    <span className="text-[11px] text-gray-400">
                      Selected items: ₹{selectedItemsAmount.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    readOnly={refundType === 'FULL'}
                    value={amountInput}
                    onChange={handleAmountChange}
                    className={`input pl-8 font-bold text-sm ${
                      refundType === 'FULL' ? 'bg-gray-50 dark:bg-gray-800/60 cursor-not-allowed' : ''
                    }`}
                    placeholder={
                      hasItemPricing && isMissingItemComplaint && selectedItemsAmount === 0
                        ? 'Select affected items above'
                        : '0.00'
                    }
                  />
                </div>

                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <span className="text-gray-500">
                    Maximum eligible amount: ₹{maxRefundAmount.toFixed(2)}
                  </span>
                  {refundType === 'FULL' && (
                    <span className="text-gray-400 italic">Full order refund (read-only)</span>
                  )}
                </div>

                {isMissingItemComplaint && !hasItemPricing && refundType === 'PARTIAL' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Item-level pricing is unavailable for this order. An itemized refund cannot be calculated.
                  </p>
                )}
              </div>

              {/* 6. COD Refund Destination Method (Only for COD Orders) */}
              {isCodOrder && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                    Refund Destination Method <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDestinationMethod('UPI')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        destinationMethod === 'UPI'
                          ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestinationMethod('BANK_ACCOUNT')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        destinationMethod === 'BANK_ACCOUNT'
                          ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-500 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Bank Account
                    </button>
                  </div>
                </div>
              )}

              {/* 7. Reason Dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Refund Reason <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input text-xs appearance-none pr-8 cursor-pointer"
                  >
                    {REASON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 8. Reason Note */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Remarks / Internal Note <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Additional context about this refund (e.g. customer called regarding delivery pack)..."
                  className="input text-xs resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-2xl">
              <button
                type="button"
                onClick={closeRefundModal}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : `Submit Refund (₹${numericAmount.toFixed(2)})`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
