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

export type OrderTab = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type ItemAvailability = 'AVAILABLE' | 'OUT_OF_STOCK' | 'TEMP_UNAVAILABLE';

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
  customerPhone: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  taxes: number;
  deliveryFee: number;
  packagingFee: number;
  discount: number;
  total: number;
  paymentStatus: 'PAID' | 'COD' | 'PENDING';
  paymentMethod: string;
  placedAt: string;
  prepTime: number;
  deliveryPartner?: {
    name: string;
    phone: string;
    vehicle: string;
  };
  deliveryAddress: string;
  rating?: number;
  otp?: string;
  timeline: { status: OrderStatus; timestamp: string; label: string }[];
}

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

// ===== Delivery mock data =====

export type DeliveryStage =
  | 'WAITING_FOR_PARTNER'
  | 'ASSIGNED'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'PICKUP_VERIFICATION'
  | 'HANDOVER'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED';

export const deliveryStageOrder: DeliveryStage[] = [
  'WAITING_FOR_PARTNER', 'ASSIGNED', 'ARRIVING', 'ARRIVED', 'PICKUP_VERIFICATION', 'HANDOVER', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED',
];

export const deliveryStageConfig: Record<DeliveryStage, { label: string; bg: string; text: string; dot: string }> = {
  WAITING_FOR_PARTNER: { label: 'Waiting for Partner', bg: 'bg-gray-100 dark:bg-gray-700/40', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-500' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  ARRIVING: { label: 'Arriving', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  ARRIVED: { label: 'Arrived', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500' },
  PICKUP_VERIFICATION: { label: 'Pickup Verification', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  HANDOVER: { label: 'Handover', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  PICKED_UP: { label: 'Picked Up', bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  IN_TRANSIT: { label: 'In Transit', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

export interface DeliveryPartner {
  name: string;
  phone: string;
  vehicle: string;
  vehicleType: string;
  rating: number;
  photo: string;
}

export interface Delivery {
  id: string;
  shortId: string;
  orderId?: number;
  assignmentId?: number;
  orderShortId: string;
  customerName: string;
  customerPhone?: string;
  stage: DeliveryStage;
  etaMinutes: number;
  partner?: DeliveryPartner;
  address: string;
  distance: number;
  otp?: string;
  timeline: { stage: DeliveryStage; timestamp: string; label: string }[];
  order?: Order;
  assignmentStatus?: string;
}

const partnerNames = ['Ramesh K', 'Suresh P', 'Mahesh B', 'Ganesh S', 'Lokesh M', 'Deepak R', 'Naveen J', 'Prakash T'];
const vehicleTypes = ['Bike', 'Scooter', 'Bicycle'];
const vehicleNumbers = ['KA01 AB 1234', 'KA02 CD 5678', 'KA03 EF 9012', 'KA04 GH 3456', 'KA05 IJ 7890'];

export function generateDelivery(stage?: DeliveryStage): Delivery {
  return {
    id: '',
    shortId: '',
    orderId: 0,
    orderShortId: '',
    customerName: '',
    stage: stage || 'WAITING_FOR_PARTNER',
    etaMinutes: 0,
    address: '',
    distance: 0,
    timeline: [],
  };
}

export function generateDeliveries(count: number): Delivery[] {
  return [];
}

export type DeliveryExceptionType = 'PARTNER_CANCEL' | 'REASSIGNMENT' | 'DELAYED_PICKUP' | 'ADDRESS_ISSUE' | 'DELIVERY_FAILURE';

export const deliveryExceptionConfig: Record<DeliveryExceptionType, { label: string; bg: string; text: string }> = {
  PARTNER_CANCEL: { label: 'Partner Cancelled', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' },
  REASSIGNMENT: { label: 'Reassignment Needed', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400' },
  DELAYED_PICKUP: { label: 'Delayed Pickup', bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400' },
  ADDRESS_ISSUE: { label: 'Address Issue', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400' },
  DELIVERY_FAILURE: { label: 'Delivery Failure', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400' },
};

export interface DeliveryException {
  id: string;
  type: DeliveryExceptionType;
  deliveryShortId: string;
  customerName: string;
  note: string;
  actionLabel: string;
  time: string;
}

export const mockDeliveryExceptions: DeliveryException[] = [];

// ===== Earnings mock data =====

export type EarningsRange = 'today' | 'weekly' | 'monthly';

export interface EarningsSummary {
  grossSales: number;
  netEarnings: number;
  commission: number;
  taxes: number;
  discounts: number;
  refunds: number;
}

export const earningsData: Record<EarningsRange, EarningsSummary> = {
  today: { grossSales: 48230, netEarnings: 43890, commission: 2894, taxes: 2412, discounts: 1240, refunds: 0 },
  weekly: { grossSales: 312450, netEarnings: 284120, commission: 18747, taxes: 15623, discounts: 8960, refunds: 1200 },
  monthly: { grossSales: 1248900, netEarnings: 1136200, commission: 74934, taxes: 62445, discounts: 35800, refunds: 5400 },
};

export interface WaterfallStep {
  label: string;
  value: number;
  type: 'start' | 'subtract' | 'add' | 'end';
}

export function getWaterfallData(range: EarningsRange): WaterfallStep[] {
  const d = earningsData[range];
  return [
    { label: 'Gross Sales', value: d.grossSales, type: 'start' },
    { label: 'Commission', value: -d.commission, type: 'subtract' },
    { label: 'Taxes/Fees', value: -d.taxes, type: 'subtract' },
    { label: 'Discounts', value: -d.discounts, type: 'subtract' },
    { label: 'Refunds', value: -d.refunds, type: 'subtract' },
    { label: 'Net Earnings', value: d.netEarnings, type: 'end' },
  ];
}

export interface SettlementRecord {
  id: string;
  date: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'PROCESSING';
  orders: number;
  period: string;
}

export const mockSettlements: SettlementRecord[] = [
  { id: 's1', date: '2026-09-04', amount: 42180, status: 'PAID', orders: 82, period: 'Sep 4' },
  { id: 's2', date: '2026-09-03', amount: 38940, status: 'PAID', orders: 76, period: 'Sep 3' },
  { id: 's3', date: '2026-09-02', amount: 45210, status: 'PAID', orders: 89, period: 'Sep 2' },
  { id: 's4', date: '2026-09-01', amount: 41030, status: 'PAID', orders: 80, period: 'Sep 1' },
  { id: 's5', date: '2026-08-31', amount: 39870, status: 'PAID', orders: 78, period: 'Aug 31' },
  { id: 's6', date: '2026-09-05', amount: 48230, status: 'PROCESSING', orders: 87, period: 'Sep 5 (Today)' },
  { id: 's7', date: '2026-09-05', amount: 0, status: 'PENDING', orders: 0, period: 'Sep 5 (Upcoming)' },
];

export const payoutDetails = {
  bankName: 'HDFC Bank',
  accountNumber: '5010XXXXXXXXXX4823',
  ifsc: 'HDFC0001234',
  accountHolder: 'NARAYANI Restaurant',
  upiId: 'narayani@hdfc',
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
  name: 'Narayani Kitchen',
  description: 'Authentic North Indian and South Indian cuisine served fresh daily. Known for our biryani and dosa.',
  phone: '+91 80 2345 6789',
  email: 'contact@narayanikitchen.com',
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
  email: 'rahul@narayanikitchen.com',
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

export const mockComplaints: Complaint[] = [
  { id: 'c1', orderShortId: 'ORD48231', customerName: 'Priya Patel', type: 'MISSING_ITEM', description: 'Ordered 2 garlic naan but only received 1. The rest of the order was correct.', status: 'OPEN', createdAt: '2026-09-05T14:45:00', resolution: null, resolvedAt: null },
  { id: 'c2', orderShortId: 'ORD48198', customerName: 'Amit Kumar', type: 'TEMPERATURE', description: 'The biryani arrived cold. It seems it was sitting for a while before pickup.', status: 'UNDER_REVIEW', createdAt: '2026-09-05T12:30:00', resolution: null, resolvedAt: null },
  { id: 'c3', orderShortId: 'ORD47902', customerName: 'Sneha Reddy', type: 'PACKAGING', description: 'The chutney container leaked and made a mess in the bag. Food was fine otherwise.', status: 'RESOLVED', createdAt: '2026-09-04T20:00:00', resolution: 'Apologized to customer and issued a ₹50 discount on next order. Packaging team notified.', resolvedAt: '2026-09-04T20:30:00' },
  { id: 'c4', orderShortId: 'ORD47855', customerName: 'Vikram Singh', type: 'FOOD_QUALITY', description: 'The paneer was rubbery and the gravy was too salty. Not up to the usual standard.', status: 'OPEN', createdAt: '2026-09-04T13:30:00', resolution: null, resolvedAt: null },
  { id: 'c5', orderShortId: 'ORD47610', customerName: 'Anjali Gupta', type: 'WRONG_ITEM', description: 'Ordered chocolate brownie but received gulab jamun instead. Still tasty but not what I ordered.', status: 'RESOLVED', createdAt: '2026-09-03T21:15:00', resolution: 'Acknowledged the mix-up. Sent a complimentary brownie on the next order.', resolvedAt: '2026-09-03T21:45:00' },
  { id: 'c6', orderShortId: 'ORD47301', customerName: 'Deepika Joshi', type: 'FOOD_QUALITY', description: 'Cold coffee was watery and spring rolls were soggy. Quality was below expectations.', status: 'UNDER_REVIEW', createdAt: '2026-09-02T20:30:00', resolution: null, resolvedAt: null },
  { id: 'c7', orderShortId: 'ORD47188', customerName: 'Karan Mehta', type: 'DELIVERY', description: 'Delivery partner went to the wrong address. Took 45 minutes extra to get the food.', status: 'RESOLVED', createdAt: '2026-09-02T13:15:00', resolution: 'Reported to delivery partner management. Customer received full refund for delivery fee.', resolvedAt: '2026-09-02T14:00:00' },
  { id: 'c8', orderShortId: 'ORD46902', customerName: 'Sanjay Verma', type: 'OTHER', description: 'The bill showed a different total than what was displayed on the app. Discrepancy of ₹20.', status: 'REJECTED', createdAt: '2026-09-01T14:15:00', resolution: 'Reviewed the order. The ₹20 was the packaging fee which is displayed separately. No discrepancy found.', resolvedAt: '2026-09-01T16:00:00' },
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

export type AnalyticsRange = 'today' | 'weekly' | 'monthly';

export const analyticsData: Record<AnalyticsRange, {
  acceptanceRate: number;
  cancellationRate: number;
  avgOrderValue: number;
  avgPrepTime: number;
  onTimePrepRate: number;
  orderAccuracy: number;
  avgRating: number;
  totalOrders: number;
  totalRevenue: number;
}> = {
  today: { acceptanceRate: 94, cancellationRate: 6, avgOrderValue: 554, avgPrepTime: 24, onTimePrepRate: 87, orderAccuracy: 96, avgRating: 4.4, totalOrders: 87, totalRevenue: 48230 },
  weekly: { acceptanceRate: 91, cancellationRate: 9, avgOrderValue: 512, avgPrepTime: 26, onTimePrepRate: 84, orderAccuracy: 94, avgRating: 4.3, totalOrders: 612, totalRevenue: 312450 },
  monthly: { acceptanceRate: 89, cancellationRate: 11, avgOrderValue: 498, avgPrepTime: 28, onTimePrepRate: 82, orderAccuracy: 93, avgRating: 4.2, totalOrders: 2480, totalRevenue: 1248900 },
};

export const analyticsSalesTrend: Record<AnalyticsRange, { label: string; orders: number; revenue: number }[]> = {
  today: [
    { label: '9AM', orders: 4, revenue: 1200 }, { label: '10AM', orders: 8, revenue: 2400 }, { label: '11AM', orders: 10, revenue: 3100 }, { label: '12PM', orders: 18, revenue: 5800 }, { label: '1PM', orders: 20, revenue: 6200 }, { label: '2PM', orders: 14, revenue: 4100 }, { label: '3PM', orders: 9, revenue: 2800 }, { label: '4PM', orders: 6, revenue: 1900 }, { label: '5PM', orders: 7, revenue: 2200 }, { label: '6PM', orders: 11, revenue: 3400 }, { label: '7PM', orders: 22, revenue: 6800 }, { label: '8PM', orders: 24, revenue: 7200 }, { label: '9PM', orders: 18, revenue: 5400 }, { label: '10PM', orders: 10, revenue: 3200 },
  ],
  weekly: [
    { label: 'Mon', orders: 78, revenue: 42100 }, { label: 'Tue', orders: 85, revenue: 45200 }, { label: 'Wed', orders: 92, revenue: 48900 }, { label: 'Thu', orders: 81, revenue: 43800 }, { label: 'Fri', orders: 105, revenue: 58300 }, { label: 'Sat', orders: 118, revenue: 64100 }, { label: 'Sun', orders: 53, revenue: 9820 },
  ],
  monthly: [
    { label: 'W1', orders: 610, revenue: 312400 }, { label: 'W2', orders: 645, revenue: 335200 }, { label: 'W3', orders: 580, revenue: 298700 }, { label: 'W4', orders: 645, revenue: 302600 },
  ],
};

export const analyticsTopItems = [
  { name: 'Chicken Biryani', orders: 521, revenue: 166720, image: 'biryani', rating: 4.7 },
  { name: 'Garlic Naan', orders: 503, revenue: 25150, image: 'naan', rating: 4.5 },
  { name: 'Cold Coffee', orders: 421, revenue: 54730, image: 'coffee', rating: 4.5 },
  { name: 'Masala Dosa', orders: 412, revenue: 49440, image: 'dosa', rating: 4.6 },
  { name: 'Paneer Butter Masala', orders: 342, revenue: 82080, image: 'paneer', rating: 4.5 },
  { name: 'Chocolate Brownie', orders: 378, revenue: 45360, image: 'brownie', rating: 4.9 },
  { name: 'Margherita Pizza', orders: 289, revenue: 80920, image: 'pizza', rating: 4.3 },
  { name: 'Veg Fried Rice', orders: 312, revenue: 59280, image: 'rice', rating: 4.2 },
];

export const analyticsCustomerBreakdown = {
  new: 142,
  returning: 106,
  total: 248,
  newPct: 57,
  returningPct: 43,
};

// ===== Notifications mock data =====

export type NotificationType = 'NEW_ORDER' | 'PICKUP_ALERT' | 'SETTLEMENT' | 'COMPLAINT' | 'PLATFORM_ANNOUNCEMENT' | 'REVIEW';

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
};

export const mockNotifications: NotificationItem[] = [
  { id: 'n1', type: 'NEW_ORDER', title: 'New Order Received', message: 'Order ORD48235 from Priya Patel — 3 items, ₹620. Accept within 5 minutes.', isRead: false, createdAt: '2026-09-06T14:32:00' },
  { id: 'n2', type: 'PICKUP_ALERT', title: 'Delivery Partner Arriving', message: 'Partner Ramesh K is arriving for order ORD48231. ETA 3 minutes.', isRead: false, createdAt: '2026-09-06T14:25:00' },
  { id: 'n3', type: 'SETTLEMENT', title: 'Settlement Processed', message: '₹42,180 has been credited to your HDFC Bank account for Sep 4 settlements.', isRead: false, createdAt: '2026-09-06T10:00:00' },
  { id: 'n4', type: 'COMPLAINT', title: 'New Complaint Filed', message: 'Customer Amit Kumar filed a complaint about order ORD48198 — Temperature issue.', isRead: false, createdAt: '2026-09-06T09:15:00' },
  { id: 'n5', type: 'PLATFORM_ANNOUNCEMENT', title: 'Platform Maintenance', message: 'Scheduled maintenance on Sep 8, 2AM-4AM. Order processing may be briefly unavailable.', isRead: true, createdAt: '2026-09-05T18:00:00' },
  { id: 'n6', type: 'REVIEW', title: 'New 5-Star Review', message: 'Priya Patel left a 5-star review: "Absolutely loved the biryani! Will order again."', isRead: true, createdAt: '2026-09-05T14:35:00' },
  { id: 'n7', type: 'NEW_ORDER', title: 'New Order Received', message: 'Order ORD48198 from Amit Kumar — 2 items, ₹450. Accept within 5 minutes.', isRead: true, createdAt: '2026-09-05T12:18:00' },
  { id: 'n8', type: 'SETTLEMENT', title: 'Settlement Processed', message: '₹38,940 has been credited to your HDFC Bank account for Sep 3 settlements.', isRead: true, createdAt: '2026-09-05T10:00:00' },
  { id: 'n9', type: 'PICKUP_ALERT', title: 'Pickup Verification', message: 'Order ORD47902 is ready for pickup. OTP: 4521. Verify with the delivery partner.', isRead: true, createdAt: '2026-09-04T19:50:00' },
  { id: 'n10', type: 'PLATFORM_ANNOUNCEMENT', title: 'New Feature: Analytics Dashboard', message: 'Track your restaurant performance with our new analytics tools. Now available in your dashboard.', isRead: true, createdAt: '2026-09-04T15:00:00' },
];
