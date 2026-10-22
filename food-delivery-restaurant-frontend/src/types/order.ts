export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUNDED';

export type OrderTab =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PAID'
  | 'COD'
  | 'PENDING'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  addOns?: string[];
  notes?: string;
}

export interface Order {
  id: string;
  shortId: string;
  customerName: string;
  customerPhone?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  taxes: number;
  deliveryFee: number;
  packagingFee: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  placedAt: string;
  prepTime?: number;
  deliveryPartner?: {
    name: string;
    phone?: string;
    vehicle?: string;
  };
  deliveryAddress?: string;
  rating?: number;
  timeline: { status: OrderStatus; timestamp: string; label: string }[];
}
