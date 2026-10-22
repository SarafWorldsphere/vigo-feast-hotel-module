import { RefundStatus, refundStatusConfig } from '@/data/mockData';
import type { OrderStatus } from '@/types/order';

const statusConfig: Record<OrderStatus, { label: string; bg: string; text: string; dot: string }> = {
  PLACED: { label: 'New', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  ACCEPTED: { label: 'Accepted', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  PREPARING: { label: 'Preparing', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  READY_FOR_PICKUP: { label: 'Ready', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  PICKED_UP: { label: 'Picked Up', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  DELIVERED: { label: 'Delivered', bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500' },
  FAILED: { label: 'Failed', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  REFUNDED: { label: 'Refunded', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
};

export function StatusChip({ status, size = 'sm' }: { status: OrderStatus; size?: 'sm' | 'xs' }) {
  const cfg = statusConfig[status];
  const padding = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`badge ${padding} ${cfg.bg} ${cfg.text} transition-all duration-300`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'PLACED' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

export function RefundStatusChip({ status, size = 'sm' }: { status: RefundStatus; size?: 'sm' | 'xs' }) {
  const cfg = refundStatusConfig[status] || refundStatusConfig.PENDING;
  const padding = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`badge ${padding} ${cfg.bg} ${cfg.text} transition-all duration-300`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function getStatusConfig(status: OrderStatus) {
  return statusConfig[status];
}

export function getRefundStatusConfig(status: RefundStatus) {
  return refundStatusConfig[status] || refundStatusConfig.PENDING;
}

export { statusConfig, refundStatusConfig };
