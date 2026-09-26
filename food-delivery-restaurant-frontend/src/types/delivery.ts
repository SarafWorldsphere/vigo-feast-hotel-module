export type DeliveryStage =
  | 'WAITING_FOR_PARTNER'
  | 'ASSIGNED'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED';

export const deliveryStageOrder: DeliveryStage[] = [
  'WAITING_FOR_PARTNER', 'ASSIGNED', 'ARRIVING', 'ARRIVED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED',
];

export const deliveryStageConfig: Record<DeliveryStage, { label: string; bg: string; text: string; dot: string }> = {
  WAITING_FOR_PARTNER: { label: 'Waiting for Partner', bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  ARRIVING: { label: 'Heading to Restaurant', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  ARRIVED: { label: 'Arrived at Restaurant', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  PICKED_UP: { label: 'Picked Up', bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  IN_TRANSIT: { label: 'At Customer', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

export interface DeliveryPartner {
  name?: string;
  phone?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  rating?: number;
}

export interface Delivery {
  id: string;
  shortId: string;
  orderId: number;
  assignmentId?: number;
  orderShortId: string;
  customerName?: string;
  customerPhone?: string;
  stage: DeliveryStage;
  etaMinutes?: number;
  partner?: DeliveryPartner;
  address?: string;
  timeline: { stage: DeliveryStage; timestamp: string; label: string }[];
  order: { total: number; items: { id: string; name?: string; quantity: number; price: number }[] };
  assignmentStatus?: string;
}
