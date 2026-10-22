import type { PaymentStatus } from '@/types/order';

export type ItemAvailability = 'AVAILABLE' | 'TEMP_UNAVAILABLE' | 'OUT_OF_STOCK';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  prepTime: number;
  availability: ItemAvailability;
  image: string;
  image_url?: string;
  rating: number;
  totalOrders: number;
  foodType?: 'VEG' | 'NON_VEG' | 'EGG';
  allergens?: string[];
  variants?: { name: string; price: number }[];
  addOnGroups?: { name: string; min: number; max: number; options: { name: string; price: number }[] }[];
}

export interface Category {
  id: string;
  name: string;
  visible: boolean;
  itemCount: number;
}

const customerNames = [
  'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh',
  'Anjali Gupta', 'Arjun Nair', 'Deepika Joshi', 'Karan Mehta', 'Riya Kapoor',
  'Sanjay Verma', 'Nisha Agarwal', 'Rohit Desai', 'Pooja Iyer', 'Aditya Rao',
];



const addresses = [
  '221B MG Road, Indiranagar, Bangalore 560038',
  '14 Jayanagar 4th Block, Bangalore 560011',
  'Flat 12, Prestige Apartments, Koramangala 560034',
  '45 HSR Layout, Sector 2, Bangalore 560102',
  '8 Whitefield Main Road, Bangalore 560066',
  '33 Hebbal Kempapura, Bangalore 560024',
  '17 Banashankari Stage 2, Bangalore 560070',
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function timeAgo(minutes: number): string {
  const d = new Date(Date.now() - minutes * 60000);
  return d.toISOString();
}

export const mockMenuItems: MenuItem[] = [
  {
    id: 'm1', name: 'Paneer Butter Masala', description: 'Cottage cheese in rich creamy tomato gravy', price: 240, category: 'Main Course', prepTime: 20, availability: 'AVAILABLE', image: 'paneer', rating: 4.5, totalOrders: 342,
    variants: [{ name: 'Half', price: 160 }, { name: 'Full', price: 240 }],
    addOnGroups: [{ name: 'Bread', min: 0, max: 3, options: [{ name: 'Butter Naan', price: 40 }, { name: 'Garlic Naan', price: 60 }, { name: 'Tandoori Roti', price: 30 }] }],
  },
  { id: 'm2', name: 'Chicken Biryani', description: 'Aromatic basmati rice with tender chicken', price: 320, category: 'Main Course', prepTime: 30, availability: 'AVAILABLE', image: 'biryani', rating: 4.7, totalOrders: 521, variants: [{ name: 'Regular', price: 320 }, { name: 'Jumbo', price: 450 }] },
  { id: 'm3', name: 'Margherita Pizza', description: 'Classic pizza with mozzarella and basil', price: 280, category: 'Pizza', prepTime: 25, availability: 'AVAILABLE', image: 'pizza', rating: 4.3, totalOrders: 289, variants: [{ name: 'Medium', price: 280 }, { name: 'Large', price: 380 }], addOnGroups: [{ name: 'Extra Toppings', min: 0, max: 4, options: [{ name: 'Extra Cheese', price: 50 }, { name: 'Mushrooms', price: 40 }, { name: 'Olives', price: 30 }] }] },
  { id: 'm4', name: 'Veg Burger', description: 'Crispy veg patty with fresh veggies', price: 150, category: 'Fast Food', prepTime: 15, availability: 'AVAILABLE', image: 'burger', rating: 4.1, totalOrders: 198 },
  { id: 'm5', name: 'Masala Dosa', description: 'Crispy rice crepe with potato filling', price: 120, category: 'South Indian', prepTime: 12, availability: 'AVAILABLE', image: 'dosa', rating: 4.6, totalOrders: 412 },
  { id: 'm6', name: 'Chicken Tikka', description: 'Grilled marinated chicken pieces', price: 290, category: 'Starters', prepTime: 22, availability: 'OUT_OF_STOCK', image: 'tikka', rating: 4.8, totalOrders: 367, variants: [{ name: 'Half', price: 180 }, { name: 'Full', price: 290 }] },
  { id: 'm7', name: 'Caesar Salad', description: 'Fresh greens with caesar dressing', price: 180, category: 'Salads', prepTime: 10, availability: 'AVAILABLE', image: 'salad', rating: 4.0, totalOrders: 95 },
  { id: 'm8', name: 'Pasta Alfredo', description: 'Creamy white sauce pasta with herbs', price: 260, category: 'Continental', prepTime: 20, availability: 'AVAILABLE', image: 'pasta', rating: 4.4, totalOrders: 234, variants: [{ name: 'White Sauce', price: 260 }, { name: 'Pink Sauce', price: 280 }] },
  { id: 'm9', name: 'Garlic Naan', description: 'Soft tandoor-baked bread with garlic', price: 50, category: 'Breads', prepTime: 8, availability: 'AVAILABLE', image: 'naan', rating: 4.5, totalOrders: 503 },
  { id: 'm10', name: 'Spring Rolls', description: 'Crispy rolls with veggie filling', price: 140, category: 'Starters', prepTime: 15, availability: 'TEMP_UNAVAILABLE', image: 'rolls', rating: 4.2, totalOrders: 167 },
  { id: 'm11', name: 'Fish Curry', description: 'Coastal-style fish in spicy gravy', price: 340, category: 'Main Course', prepTime: 28, availability: 'AVAILABLE', image: 'fish', rating: 4.6, totalOrders: 189 },
  { id: 'm12', name: 'Chocolate Brownie', description: 'Warm fudgy chocolate brownie', price: 120, category: 'Desserts', prepTime: 10, availability: 'AVAILABLE', image: 'brownie', rating: 4.9, totalOrders: 378 },
  { id: 'm13', name: 'Gulab Jamun', description: 'Soft dumplings in sugar syrup', price: 80, category: 'Desserts', prepTime: 5, availability: 'AVAILABLE', image: 'gulab', rating: 4.7, totalOrders: 295 },
  { id: 'm14', name: 'Cold Coffee', description: 'Chilled creamy coffee with ice cream', price: 130, category: 'Beverages', prepTime: 5, availability: 'AVAILABLE', image: 'coffee', rating: 4.5, totalOrders: 421 },
  { id: 'm15', name: 'Fresh Lime Soda', description: 'Refreshing lime with soda', price: 60, category: 'Beverages', prepTime: 3, availability: 'AVAILABLE', image: 'lime', rating: 4.3, totalOrders: 256 },
  { id: 'm16', name: 'Veg Fried Rice', description: 'Wok-tossed rice with vegetables', price: 190, category: 'Chinese', prepTime: 18, availability: 'AVAILABLE', image: 'rice', rating: 4.2, totalOrders: 312 },
];

export const mockCategories: Category[] = [
  { id: 'c1', name: 'Main Course', visible: true, itemCount: 3 },
  { id: 'c2', name: 'Pizza', visible: true, itemCount: 1 },
  { id: 'c3', name: 'Fast Food', visible: true, itemCount: 1 },
  { id: 'c4', name: 'South Indian', visible: true, itemCount: 1 },
  { id: 'c5', name: 'Starters', visible: true, itemCount: 2 },
  { id: 'c6', name: 'Salads', visible: true, itemCount: 1 },
  { id: 'c7', name: 'Continental', visible: true, itemCount: 1 },
  { id: 'c8', name: 'Breads', visible: true, itemCount: 1 },
  { id: 'c9', name: 'Desserts', visible: true, itemCount: 2 },
  { id: 'c10', name: 'Beverages', visible: true, itemCount: 2 },
  { id: 'c11', name: 'Chinese', visible: true, itemCount: 1 },
];

export const dashboardStats = {
  todayOrders: 87,
  grossRevenue: 48230,
  netRevenue: 43890,
  avgOrderValue: 554,
  rating: 4.4,
  avgPrepTime: 24,
  acceptanceRate: 94,
  cancellationRate: 6,
  pipeline: {
    NEW: 3,
    PREPARING: 5,
    READY: 2,
    COMPLETED: 74,
    REJECTED: 3,
  },
  salesTrend: [
    { hour: '9AM', value: 1200 },
    { hour: '10AM', value: 2400 },
    { hour: '11AM', value: 3100 },
    { hour: '12PM', value: 5800 },
    { hour: '1PM', value: 6200 },
    { hour: '2PM', value: 4100 },
    { hour: '3PM', value: 2800 },
    { hour: '4PM', value: 1900 },
    { hour: '5PM', value: 2200 },
    { hour: '6PM', value: 3400 },
    { hour: '7PM', value: 6800 },
    { hour: '8PM', value: 7200 },
    { hour: '9PM', value: 5400 },
    { hour: '10PM', value: 3200 },
  ],
  topItems: [
    { name: 'Chicken Biryani', orders: 38, revenue: 12160, image: 'biryani' },
    { name: 'Garlic Naan', orders: 52, revenue: 2600, image: 'naan' },
    { name: 'Paneer Butter Masala', orders: 31, revenue: 7440, image: 'paneer' },
    { name: 'Margherita Pizza', orders: 24, revenue: 6720, image: 'pizza' },
    { name: 'Cold Coffee', orders: 42, revenue: 5460, image: 'coffee' },
  ],
  alerts: [
    { type: 'warning', message: 'Chicken Tikka is out of stock', time: '5 min ago' },
    { type: 'info', message: '3 new orders waiting for acceptance', time: '2 min ago' },
    { type: 'error', message: 'Order #ORD48231 cancelled by customer', time: '12 min ago' },
    { type: 'success', message: 'Today\'s revenue exceeded yesterday by 12%', time: '1 hr ago' },
  ],
};

export const operatingHours = [
  { day: 'Monday', open: '10:00', close: '23:00', closed: false },
  { day: 'Tuesday', open: '10:00', close: '23:00', closed: false },
  { day: 'Wednesday', open: '10:00', close: '23:00', closed: false },
  { day: 'Thursday', open: '10:00', close: '23:00', closed: false },
  { day: 'Friday', open: '10:00', close: '00:00', closed: false },
  { day: 'Saturday', open: '09:00', close: '00:00', closed: false },
  { day: 'Sunday', open: '09:00', close: '23:00', closed: false },
];

// ===== Earnings types & settlement data =====

export type EarningsRange = 'today' | 'weekly' | 'monthly' | 'custom';

export interface WaterfallStep {
  label: string;
  value: number;
  type: 'start' | 'subtract' | 'add' | 'end';
}



export const payoutDetails = {
  bankName: 'HDFC Bank',
  accountNumber: '5010XXXXXXXXXX4823',
  ifsc: 'HDFC0001234',
  accountHolder: 'VIGO FEAST Restaurant',
  upiId: 'vigofeast@hdfc',
  nextPayoutDate: '2026-09-06',
  nextPayoutAmount: 48230,
  payoutCycle: 'Daily (T+1)',
};

// ===== Restaurant settings mock data =====

export interface RestaurantProfile {
  name: string;
  description: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  rating: number;
  logo: string;
  cover: string;
}

export const mockRestaurantProfile: RestaurantProfile = {
  name: 'Vigo Feast Restaurant',
  description: 'Authentic North Indian and South Indian cuisine served fresh daily. Known for our biryani and dosa.',
  phone: '+91 80 2345 6789',
  email: 'contact@vigofeast.com',
  addressLine1: '221B MG Road, Indiranagar',
  addressLine2: 'Near Metro Station',
  city: 'Bangalore',
  state: 'Karnataka',
  postalCode: '560038',
  rating: 4.4,
  logo: '',
  cover: '',
};

export interface RestaurantOwner {
  name: string;
  email: string;
  phone: string;
  isVerified: boolean;
  isActive: boolean;
}

export const mockRestaurantOwner: RestaurantOwner = {
  name: 'Rahul Sharma',
  email: 'rahul@vigofeast.com',
  phone: '+91 98765 43210',
  isVerified: true,
  isActive: true,
};

// ===== Reviews mock data =====

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  orderShortId: string;
  response: string | null;
  respondedAt: string | null;
}

export const mockReviews: Review[] = [
  { id: 'r1', customerName: 'Priya Patel', rating: 5, comment: 'Absolutely loved the biryani! Perfectly spiced and delivered hot. Will order again.', createdAt: '2026-09-05T14:30:00', orderShortId: 'ORD48231', response: 'Thank you Priya! We are glad you enjoyed it. Looking forward to serving you again.', respondedAt: '2026-09-05T15:10:00' },
  { id: 'r2', customerName: 'Amit Kumar', rating: 4, comment: 'Good food overall, but the delivery was a bit late. The paneer butter masala was excellent though.', createdAt: '2026-09-05T12:15:00', orderShortId: 'ORD48198', response: null, respondedAt: null },
  { id: 'r3', customerName: 'Sneha Reddy', rating: 5, comment: 'Best South Indian food in the area! The masala dosa was crispy and the chutney was perfect.', createdAt: '2026-09-04T19:45:00', orderShortId: 'ORD47902', response: 'Thank you Sneha! Our dosa batter is freshly made every day.', respondedAt: '2026-09-04T20:00:00' },
  { id: 'r4', customerName: 'Vikram Singh', rating: 3, comment: 'Food was decent but the portion size felt small for the price. Expected more for ₹320.', createdAt: '2026-09-04T13:20:00', orderShortId: 'ORD47855', response: null, respondedAt: null },
  { id: 'r5', customerName: 'Anjali Gupta', rating: 5, comment: 'The chocolate brownie was to die for! Warm and fudgy. Highly recommend the desserts here.', createdAt: '2026-09-03T21:00:00', orderShortId: 'ORD47610', response: 'Thank you Anjali! Our brownies are baked fresh every morning.', respondedAt: '2026-09-03T21:15:00' },
  { id: 'r6', customerName: 'Arjun Nair', rating: 4, comment: 'Great pizza, nice and cheesy. Could use a bit more sauce but overall very tasty.', createdAt: '2026-09-03T18:30:00', orderShortId: 'ORD47522', response: null, respondedAt: null },
  { id: 'r7', customerName: 'Deepika Joshi', rating: 2, comment: 'The cold coffee was watery and the spring rolls were soggy. Disappointed this time.', createdAt: '2026-09-02T20:15:00', orderShortId: 'ORD47301', response: 'We are sorry about your experience, Deepika. We have addressed this with our kitchen team.', respondedAt: '2026-09-02T21:00:00' },
  { id: 'r8', customerName: 'Karan Mehta', rating: 5, comment: 'Consistently great food! The garlic naan and chicken tikka are my go-to order. Never disappoints.', createdAt: '2026-09-02T13:00:00', orderShortId: 'ORD47188', response: null, respondedAt: null },
  { id: 'r9', customerName: 'Riya Kapoor', rating: 4, comment: 'Lovely pasta, creamy and flavorful. Delivery was quick too. Would recommend the Alfredo.', createdAt: '2026-09-01T19:30:00', orderShortId: 'ORD47015', response: 'Thank you Riya! Our Alfredo is one of our most popular dishes.', respondedAt: '2026-09-01T20:00:00' },
  { id: 'r10', customerName: 'Sanjay Verma', rating: 3, comment: 'Food was okay. The fish curry lacked the coastal flavor I was expecting. Service was fine.', createdAt: '2026-09-01T14:00:00', orderShortId: 'ORD46902', response: null, respondedAt: null },
];

export const reviewStats = {
  averageRating: 4.1,
  totalReviews: 248,
  distribution: [
    { stars: 5, count: 142, pct: 57 },
    { stars: 4, count: 68, pct: 27 },
    { stars: 3, count: 22, pct: 9 },
    { stars: 2, count: 10, pct: 4 },
    { stars: 1, count: 6, pct: 3 },
  ],
};

// ===== Complaints mock data =====

export type ComplaintType = 'MISSING_ITEM' | 'WRONG_ITEM' | 'FOOD_QUALITY' | 'PACKAGING' | 'TEMPERATURE' | 'DELIVERY' | 'OTHER';
export type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export interface Complaint {
  id: string;
  order_id?: string;
  orderShortId: string;
  customerName: string;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  createdAt: string;
  resolution: string | null;
  resolvedAt: string | null;
}

export const complaintTypeConfig: Record<ComplaintType, { label: string; bg: string; text: string }> = {
  MISSING_ITEM: { label: 'Missing Item', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400' },
  WRONG_ITEM: { label: 'Wrong Item', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' },
  FOOD_QUALITY: { label: 'Food Quality', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  PACKAGING: { label: 'Packaging', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' },
  TEMPERATURE: { label: 'Temperature', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400' },
  DELIVERY: { label: 'Delivery', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400' },
  OTHER: { label: 'Other', bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-600 dark:text-gray-400' },
};

export const complaintStatusConfig: Record<ComplaintStatus, { label: string; bg: string; text: string; dot: string }> = {
  OPEN: { label: 'Open', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  UNDER_REVIEW: { label: 'Under Review', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500' },
};

export const mockComplaints: Complaint[] = [];

// ===== Refunds & Payments mock data =====

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type RefundType = 'FULL' | 'PARTIAL';

export interface RefundItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Refund {
  id: string;
  payment_id: string;
  order_id: string;
  order_short_id: string;
  customer_name: string;
  customer_phone?: string;
  amount: number;
  reason: string;
  reason_note?: string;
  refund_type: RefundType;
  items_refunded?: RefundItem[];
  status: RefundStatus;
  refund_reference: string;
  payment_method: string;
  original_amount: number;
  failed_reason?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
  complaint_id?: number | string | null;
  complaintId?: string | number | null;
}

export interface Payment {
  payment_id: string;
  order_id: string;
  payment_method: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

export const refundStatusConfig: Record<RefundStatus, { label: string; bg: string; text: string; dot: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  PROCESSING: { label: 'Processing', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500 animate-pulse' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  FAILED: { label: 'Failed', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

export const mockRefunds: Refund[] = [
  {
    id: 'RFD-48231',
    payment_id: 'PAY-48231',
    order_id: 'ORD48231',
    order_short_id: 'ORD48231',
    customer_name: 'Priya Patel',
    customer_phone: '+91 98765 11001',
    amount: 150,
    reason: 'Missing item',
    reason_note: 'Customer reported 1 missing garlic naan from the delivered packet.',
    refund_type: 'PARTIAL',
    items_refunded: [{ name: 'Garlic Naan', quantity: 1, price: 50 }, { name: 'Item Compensation Credit', quantity: 1, price: 100 }],
    status: 'COMPLETED',
    refund_reference: 'HDFC_RF_9812401',
    payment_method: 'UPI (Google Pay)',
    original_amount: 620,
    created_at: '2026-09-05T15:00:00Z',
    completed_at: '2026-09-05T15:15:00Z',
  },
  {
    id: 'RFD-48198',
    payment_id: 'PAY-48198',
    order_id: 'ORD48198',
    order_short_id: 'ORD48198',
    customer_name: 'Amit Kumar',
    customer_phone: '+91 98765 11002',
    amount: 450,
    reason: 'Temperature issue',
    reason_note: 'Food arrived cold due to traffic hold-up during transit.',
    refund_type: 'FULL',
    items_refunded: [{ name: 'Chicken Biryani', quantity: 1, price: 320 }, { name: 'Cold Coffee', quantity: 1, price: 130 }],
    status: 'PROCESSING',
    refund_reference: 'RAZORPAY_RF_872134',
    payment_method: 'Credit Card (HDFC)',
    original_amount: 450,
    created_at: '2026-09-05T13:00:00Z',
    completed_at: null,
  },
  {
    id: 'RFD-47902',
    payment_id: 'PAY-47902',
    order_id: 'ORD47902',
    order_short_id: 'ORD47902',
    customer_name: 'Sneha Reddy',
    customer_phone: '+91 98765 11003',
    amount: 120,
    reason: 'Damaged packaging',
    reason_note: 'Chutney container leaked inside paper bag during transit.',
    refund_type: 'PARTIAL',
    items_refunded: [{ name: 'Packaging Damage Waiver', quantity: 1, price: 120 }],
    status: 'COMPLETED',
    refund_reference: 'PAYTM_RF_349812',
    payment_method: 'Paytm UPI',
    original_amount: 380,
    created_at: '2026-09-04T20:15:00Z',
    completed_at: '2026-09-04T20:30:00Z',
  },
  {
    id: 'RFD-47855',
    payment_id: 'PAY-47855',
    order_id: 'ORD47855',
    order_short_id: 'ORD47855',
    customer_name: 'Vikram Singh',
    customer_phone: '+91 98765 11004',
    amount: 320,
    reason: 'Food quality issue',
    reason_note: 'Paneer was rubbery and gravy excessively salty.',
    refund_type: 'FULL',
    items_refunded: [{ name: 'Paneer Butter Masala', quantity: 1, price: 240 }, { name: 'Garlic Naan', quantity: 1, price: 50 }, { name: 'Packaging', quantity: 1, price: 30 }],
    status: 'FAILED',
    refund_reference: 'SBI_RF_092144',
    payment_method: 'Net Banking (SBI)',
    original_amount: 320,
    failed_reason: 'Bank gateway timeout during reversal settlement. Retry required.',
    created_at: '2026-09-04T14:00:00Z',
    completed_at: null,
  },
  {
    id: 'RFD-47610',
    payment_id: 'PAY-47610',
    order_id: 'ORD47610',
    order_short_id: 'ORD47610',
    customer_name: 'Anjali Gupta',
    customer_phone: '+91 98765 11005',
    amount: 120,
    reason: 'Wrong item',
    reason_note: 'Ordered chocolate brownie but received gulab jamun.',
    refund_type: 'PARTIAL',
    items_refunded: [{ name: 'Chocolate Brownie', quantity: 1, price: 120 }],
    status: 'PENDING',
    refund_reference: 'ICICI_RF_561289',
    payment_method: 'UPI (PhonePe)',
    original_amount: 490,
    created_at: '2026-09-03T21:30:00Z',
    completed_at: null,
  },
  {
    id: 'RFD-47188',
    payment_id: 'PAY-47188',
    order_id: 'ORD47188',
    order_short_id: 'ORD47188',
    customer_name: 'Karan Mehta',
    customer_phone: '+91 98765 11006',
    amount: 50,
    reason: 'Late delivery',
    reason_note: 'Delivery fee refunded due to 45 min delay at wrong address.',
    refund_type: 'PARTIAL',
    items_refunded: [{ name: 'Delivery Charge Refund', quantity: 1, price: 50 }],
    status: 'COMPLETED',
    refund_reference: 'AXIS_RF_782390',
    payment_method: 'Debit Card',
    original_amount: 540,
    created_at: '2026-09-02T13:45:00Z',
    completed_at: '2026-09-02T14:00:00Z',
  },
];

export const mockPayments: Payment[] = [
  { payment_id: 'PAY-48231', order_id: 'ORD48231', payment_method: 'UPI (Google Pay)', amount: 620, status: 'PARTIALLY_REFUNDED', created_at: '2026-09-05T14:10:00Z' },
  { payment_id: 'PAY-48198', order_id: 'ORD48198', payment_method: 'Credit Card (HDFC)', amount: 450, status: 'REFUND_PENDING', created_at: '2026-09-05T11:45:00Z' },
  { payment_id: 'PAY-47902', order_id: 'ORD47902', payment_method: 'Paytm UPI', amount: 380, status: 'PARTIALLY_REFUNDED', created_at: '2026-09-04T19:15:00Z' },
  { payment_id: 'PAY-47855', order_id: 'ORD47855', payment_method: 'Net Banking (SBI)', amount: 320, status: 'PAID', created_at: '2026-09-04T12:45:00Z' },
  { payment_id: 'PAY-47610', order_id: 'ORD47610', payment_method: 'UPI (PhonePe)', amount: 490, status: 'REFUND_PENDING', created_at: '2026-09-03T20:20:00Z' },
  { payment_id: 'PAY-47301', order_id: 'ORD47301', payment_method: 'UPI (Paytm)', amount: 330, status: 'PAID', created_at: '2026-09-02T19:40:00Z' },
  { payment_id: 'PAY-47188', order_id: 'ORD47188', payment_method: 'Debit Card', amount: 540, status: 'PARTIALLY_REFUNDED', created_at: '2026-09-02T12:20:00Z' },
  { payment_id: 'PAY-46902', order_id: 'ORD46902', payment_method: 'Credit Card (Axis)', amount: 360, status: 'PAID', created_at: '2026-09-01T13:15:00Z' },
  { payment_id: 'PAY-48235', order_id: 'ORD48235', payment_method: 'UPI', amount: 620, status: 'PAID', created_at: '2026-09-06T14:30:00Z' },
  { payment_id: 'PAY-48236', order_id: 'ORD48236', payment_method: 'Credit Card', amount: 444, status: 'PAID', created_at: '2026-09-06T14:15:00Z' },
];

// ===== Offers mock data =====

export type OfferType = 'PERCENTAGE' | 'FLAT' | 'MIN_ORDER' | 'ITEM' | 'COMBO' | 'BUY_X_GET_Y';
export type OfferStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED';

export interface Offer {
  id: string;
  name: string;
  offerType: OfferType;
  discountValue: number;
  maxDiscountAmount: number;
  minimumOrderAmount: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  applicableItems: string[];
  applicableCategories: string[];
  usageCount: number;
  totalDiscountGiven: number;
  status?: OfferStatus;
  offerCode?: string | null;
}

export const offerTypeConfig: Record<OfferType, { label: string; bg: string; text: string }> = {
  PERCENTAGE: { label: 'Percentage', bg: 'bg-brand-50 dark:bg-brand-500/10', text: 'text-brand-700 dark:text-brand-400' },
  FLAT: { label: 'Flat', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' },
  MIN_ORDER: { label: 'Min Order', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400' },
  ITEM: { label: 'Item', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
  COMBO: { label: 'Combo', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  BUY_X_GET_Y: { label: 'Buy X Get Y', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400' },
};

export const mockOffers: Offer[] = [
  { id: 'o1', name: 'Weekend Special 20% Off', offerType: 'PERCENTAGE', discountValue: 20, maxDiscountAmount: 100, minimumOrderAmount: 300, startAt: '2026-09-05T00:00:00', endAt: '2026-09-08T23:59:59', isActive: true, applicableItems: [], applicableCategories: ['Main Course', 'Starters'], usageCount: 47, totalDiscountGiven: 3200 },
  { id: 'o2', name: 'Flat ₹50 Off on Orders ₹400+', offerType: 'FLAT', discountValue: 50, maxDiscountAmount: 50, minimumOrderAmount: 400, startAt: '2026-09-01T00:00:00', endAt: '2026-09-30T23:59:59', isActive: true, applicableItems: [], applicableCategories: [], usageCount: 89, totalDiscountGiven: 4450 },
  { id: 'o3', name: 'Free Dessert with Biryani', offerType: 'ITEM', discountValue: 80, maxDiscountAmount: 80, minimumOrderAmount: 200, startAt: '2026-09-03T00:00:00', endAt: '2026-09-10T23:59:59', isActive: true, applicableItems: ['Chicken Biryani', 'Veg Biryani'], applicableCategories: ['Desserts'], usageCount: 34, totalDiscountGiven: 2720 },
  { id: 'o4', name: 'Combo Deal: Meal for 2', offerType: 'COMBO', discountValue: 15, maxDiscountAmount: 150, minimumOrderAmount: 600, startAt: '2026-09-10T00:00:00', endAt: '2026-09-15T23:59:59', isActive: false, applicableItems: [], applicableCategories: ['Main Course', 'Breads', 'Beverages'], usageCount: 0, totalDiscountGiven: 0 },
  { id: 'o5', name: 'Buy 1 Get 1 on Pizzas', offerType: 'BUY_X_GET_Y', discountValue: 100, maxDiscountAmount: 380, minimumOrderAmount: 0, startAt: '2026-09-12T00:00:00', endAt: '2026-09-14T23:59:59', isActive: false, applicableItems: ['Margherita Pizza'], applicableCategories: ['Pizza'], usageCount: 0, totalDiscountGiven: 0 },
  { id: 'o6', name: 'Summer Feast 25% Off', offerType: 'PERCENTAGE', discountValue: 25, maxDiscountAmount: 120, minimumOrderAmount: 350, startAt: '2026-08-01T00:00:00', endAt: '2026-08-31T23:59:59', isActive: false, applicableItems: [], applicableCategories: [], usageCount: 156, totalDiscountGiven: 14280 },
  { id: 'o7', name: 'Flat ₹30 Off First Order', offerType: 'FLAT', discountValue: 30, maxDiscountAmount: 30, minimumOrderAmount: 150, startAt: '2026-08-15T00:00:00', endAt: '2026-08-30T23:59:59', isActive: false, applicableItems: [], applicableCategories: [], usageCount: 203, totalDiscountGiven: 6090 },
];

// ===== Analytics mock data =====

export type AnalyticsRange = 'today' | 'weekly' | 'monthly' | 'custom';

export interface AnalyticsKpiSummary {
  acceptanceRate: number;
  cancellationRate: number;
  avgOrderValue: number;
  avgPrepTime: number;
  onTimePrepRate: number;
  orderAccuracy: number;
  avgRating: number;
  totalOrders: number;
  totalRevenue: number;
  grossSales?: number;
  netRevenue?: number;
}

export const analyticsData: Record<AnalyticsRange, AnalyticsKpiSummary> = {
  today: {
    acceptanceRate: 94.8,
    cancellationRate: 3.2,
    avgOrderValue: 554,
    avgPrepTime: 21,
    onTimePrepRate: 92.5,
    orderAccuracy: 98.4,
    avgRating: 4.6,
    totalOrders: 87,
    totalRevenue: 48230,
    grossSales: 48230,
    netRevenue: 43890,
  },
  weekly: {
    acceptanceRate: 93.4,
    cancellationRate: 4.1,
    avgOrderValue: 528,
    avgPrepTime: 23,
    onTimePrepRate: 90.2,
    orderAccuracy: 97.6,
    avgRating: 4.5,
    totalOrders: 612,
    totalRevenue: 323136,
    grossSales: 323136,
    netRevenue: 294050,
  },
  monthly: {
    acceptanceRate: 91.8,
    cancellationRate: 5.2,
    avgOrderValue: 516,
    avgPrepTime: 24,
    onTimePrepRate: 88.7,
    orderAccuracy: 96.8,
    avgRating: 4.4,
    totalOrders: 2480,
    totalRevenue: 1279680,
    grossSales: 1279680,
    netRevenue: 1164500,
  },
  custom: {
    acceptanceRate: 92.9,
    cancellationRate: 4.6,
    avgOrderValue: 535,
    avgPrepTime: 22,
    onTimePrepRate: 91.0,
    orderAccuracy: 97.2,
    avgRating: 4.5,
    totalOrders: 1420,
    totalRevenue: 759700,
    grossSales: 759700,
    netRevenue: 691320,
  },
};

export interface AnalyticsTrendPoint {
  label: string;
  periodName?: string;
  orders: number;
  revenue: number;
}

export const analyticsSalesTrend: Record<AnalyticsRange, AnalyticsTrendPoint[]> = {
  today: [
    { label: '9 AM', periodName: '9:00 AM - 10:00 AM', orders: 4, revenue: 2200 },
    { label: '10 AM', periodName: '10:00 AM - 11:00 AM', orders: 7, revenue: 3850 },
    { label: '11 AM', periodName: '11:00 AM - 12:00 PM', orders: 9, revenue: 4950 },
    { label: '12 PM', periodName: '12:00 PM - 1:00 PM', orders: 16, revenue: 8960 },
    { label: '1 PM', periodName: '1:00 PM - 2:00 PM', orders: 18, revenue: 10080 },
    { label: '2 PM', periodName: '2:00 PM - 3:00 PM', orders: 11, revenue: 6050 },
    { label: '3 PM', periodName: '3:00 PM - 4:00 PM', orders: 5, revenue: 2750 },
    { label: '4 PM', periodName: '4:00 PM - 5:00 PM', orders: 4, revenue: 2180 },
    { label: '5 PM', periodName: '5:00 PM - 6:00 PM', orders: 6, revenue: 3300 },
    { label: '6 PM', periodName: '6:00 PM - 7:00 PM', orders: 10, revenue: 5600 },
    { label: '7 PM', periodName: '7:00 PM - 8:00 PM', orders: 19, revenue: 10640 },
    { label: '8 PM', periodName: '8:00 PM - 9:00 PM', orders: 21, revenue: 11760 },
    { label: '9 PM', periodName: '9:00 PM - 10:00 PM', orders: 14, revenue: 7700 },
    { label: '10 PM', periodName: '10:00 PM - 11:00 PM', orders: 8, revenue: 4400 },
  ],
  weekly: [
    { label: 'Mon', periodName: 'Monday', orders: 76, revenue: 40280 },
    { label: 'Tue', periodName: 'Tuesday', orders: 82, revenue: 43460 },
    { label: 'Wed', periodName: 'Wednesday', orders: 89, revenue: 47170 },
    { label: 'Thu', periodName: 'Thursday', orders: 84, revenue: 44520 },
    { label: 'Fri', periodName: 'Friday', orders: 108, revenue: 57240 },
    { label: 'Sat', periodName: 'Saturday', orders: 121, revenue: 64130 },
    { label: 'Sun', periodName: 'Sunday', orders: 52, revenue: 26336 },
  ],
  monthly: [
    { label: 'Week 1', periodName: 'Week 1 (Days 1-7)', orders: 590, revenue: 304440 },
    { label: 'Week 2', periodName: 'Week 2 (Days 8-14)', orders: 640, revenue: 330240 },
    { label: 'Week 3', periodName: 'Week 3 (Days 15-21)', orders: 615, revenue: 317340 },
    { label: 'Week 4', periodName: 'Week 4 (Days 22-30)', orders: 635, revenue: 327660 },
  ],
  custom: [
    { label: 'Day 1-2', periodName: 'Oct 01 - Oct 02', orders: 168, revenue: 89880 },
    { label: 'Day 3-4', periodName: 'Oct 03 - Oct 04', orders: 182, revenue: 97370 },
    { label: 'Day 5-6', periodName: 'Oct 05 - Oct 06', orders: 195, revenue: 104325 },
    { label: 'Day 7-8', periodName: 'Oct 07 - Oct 08', orders: 174, revenue: 93090 },
    { label: 'Day 9-10', periodName: 'Oct 09 - Oct 10', orders: 210, revenue: 112350 },
    { label: 'Day 11-12', periodName: 'Oct 11 - Oct 12', orders: 228, revenue: 121980 },
    { label: 'Day 13-14', periodName: 'Oct 13 - Oct 14', orders: 165, revenue: 88275 },
    { label: 'Day 15', periodName: 'Oct 15', orders: 98, revenue: 52430 },
  ],
};

export interface AnalyticsItemPerformance {
  id: string;
  name: string;
  category: string;
  price: number;
  orders: number;
  revenue: number;
  image: string;
  rating: number;
  prepTimeMinutes: number;
  orderAccuracyRate: number;
  performanceTag: 'Bestseller' | 'High Margin' | 'Trending' | 'Popular' | 'Steady';
}

export const analyticsTopItems: AnalyticsItemPerformance[] = [
  { id: 'm2', name: 'Chicken Biryani', category: 'Main Course', price: 320, orders: 521, revenue: 166720, image: 'biryani', rating: 4.8, prepTimeMinutes: 28, orderAccuracyRate: 99.1, performanceTag: 'Bestseller' },
  { id: 'm1', name: 'Paneer Butter Masala', category: 'Main Course', price: 240, orders: 342, revenue: 82080, image: 'paneer', rating: 4.6, prepTimeMinutes: 20, orderAccuracyRate: 98.5, performanceTag: 'High Margin' },
  { id: 'm3', name: 'Margherita Pizza', category: 'Pizza', price: 280, orders: 289, revenue: 80920, image: 'pizza', rating: 4.4, prepTimeMinutes: 25, orderAccuracyRate: 97.8, performanceTag: 'Popular' },
  { id: 'm6', name: 'Chicken Tikka', category: 'Starters', price: 290, orders: 268, revenue: 77720, image: 'tikka', rating: 4.7, prepTimeMinutes: 22, orderAccuracyRate: 98.9, performanceTag: 'Trending' },
  { id: 'm16', name: 'Veg Fried Rice', category: 'Chinese', price: 190, orders: 312, revenue: 59280, image: 'rice', rating: 4.3, prepTimeMinutes: 18, orderAccuracyRate: 97.2, performanceTag: 'Steady' },
  { id: 'm14', name: 'Cold Coffee', category: 'Beverages', price: 130, orders: 421, revenue: 54730, image: 'coffee', rating: 4.6, prepTimeMinutes: 6, orderAccuracyRate: 99.4, performanceTag: 'Popular' },
  { id: 'm5', name: 'Masala Dosa', category: 'South Indian', price: 120, orders: 412, revenue: 49440, image: 'dosa', rating: 4.7, prepTimeMinutes: 12, orderAccuracyRate: 98.2, performanceTag: 'Popular' },
  { id: 'm12', name: 'Chocolate Brownie', category: 'Desserts', price: 120, orders: 378, revenue: 45360, image: 'brownie', rating: 4.9, prepTimeMinutes: 8, orderAccuracyRate: 99.8, performanceTag: 'Bestseller' },
  { id: 'm8', name: 'Pasta Alfredo', category: 'Continental', price: 260, orders: 165, revenue: 42900, image: 'pasta', rating: 4.4, prepTimeMinutes: 20, orderAccuracyRate: 97.5, performanceTag: 'Steady' },
  { id: 'm9', name: 'Garlic Naan', category: 'Breads', price: 50, orders: 503, revenue: 25150, image: 'naan', rating: 4.6, prepTimeMinutes: 8, orderAccuracyRate: 99.2, performanceTag: 'Steady' },
  { id: 'm11', name: 'Fish Curry', category: 'Main Course', price: 340, orders: 114, revenue: 38760, image: 'fish', rating: 4.5, prepTimeMinutes: 26, orderAccuracyRate: 97.0, performanceTag: 'High Margin' },
  { id: 'm4', name: 'Veg Burger', category: 'Fast Food', price: 150, orders: 198, revenue: 29700, image: 'burger', rating: 4.2, prepTimeMinutes: 15, orderAccuracyRate: 96.5, performanceTag: 'Popular' },
  { id: 'm13', name: 'Gulab Jamun', category: 'Desserts', price: 80, orders: 295, revenue: 23600, image: 'gulab', rating: 4.8, prepTimeMinutes: 5, orderAccuracyRate: 99.5, performanceTag: 'Bestseller' },
  { id: 'm15', name: 'Fresh Lime Soda', category: 'Beverages', price: 60, orders: 256, revenue: 15360, image: 'lime', rating: 4.4, prepTimeMinutes: 4, orderAccuracyRate: 98.8, performanceTag: 'Steady' },
  { id: 'm10', name: 'Spring Rolls', category: 'Starters', price: 140, orders: 142, revenue: 19880, image: 'rolls', rating: 4.3, prepTimeMinutes: 15, orderAccuracyRate: 96.9, performanceTag: 'Steady' },
  { id: 'm7', name: 'Caesar Salad', category: 'Salads', price: 180, orders: 95, revenue: 17100, image: 'salad', rating: 4.1, prepTimeMinutes: 10, orderAccuracyRate: 98.0, performanceTag: 'Steady' },
];

export interface CustomerBreakdownData {
  new: number;
  returning: number;
  total: number;
  newPct: number;
  returningPct: number;
  returningAovMultiplier: number;
}

export const analyticsCustomerBreakdownByRange: Record<AnalyticsRange, CustomerBreakdownData> = {
  today: { new: 51, returning: 36, total: 87, newPct: 59, returningPct: 41, returningAovMultiplier: 1.22 },
  weekly: { new: 355, returning: 257, total: 612, newPct: 58, returningPct: 42, returningAovMultiplier: 1.25 },
  monthly: { new: 1414, returning: 1066, total: 2480, newPct: 57, returningPct: 43, returningAovMultiplier: 1.28 },
  custom: { new: 824, returning: 596, total: 1420, newPct: 58, returningPct: 42, returningAovMultiplier: 1.26 },
};

export const analyticsCustomerBreakdown = analyticsCustomerBreakdownByRange.today;

// ===== Notifications mock data =====

export type NotificationType = 'NEW_ORDER' | 'PICKUP_ALERT' | 'SETTLEMENT' | 'COMPLAINT' | 'PLATFORM_ANNOUNCEMENT' | 'REVIEW' | 'REFUND';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationTypeConfig: Record<NotificationType, { icon: string; bg: string; text: string }> = {
  NEW_ORDER: { icon: 'ShoppingBag', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  PICKUP_ALERT: { icon: 'Bike', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
  SETTLEMENT: { icon: 'Wallet', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  COMPLAINT: { icon: 'AlertCircle', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  PLATFORM_ANNOUNCEMENT: { icon: 'Megaphone', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  REVIEW: { icon: 'Star', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  REFUND: { icon: 'RotateCcw', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
};

export const mockNotifications: NotificationItem[] = [];

