// Real API client connecting to FastAPI backend

import type { Offer, OfferType, OfferStatus } from '@/data/mockData';
import type { Order, OrderStatus } from '@/types/order';
import type { Delivery, DeliveryStage, DeliveryPartner } from '@/types/delivery';

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  (typeof window !== 'undefined' ? '' : (process.env.BACKEND_URL || 'http://127.0.0.1:8000'));

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('nfd_access_token', token);
    } else {
      sessionStorage.removeItem('nfd_access_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    inMemoryToken = sessionStorage.getItem('nfd_access_token');
  }
  return inMemoryToken;
}

export interface OwnerRegisterRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface OwnerRegisterResponse {
  message: string;
  owner_id: string;
  access_token?: string;
}

export interface OwnerLoginRequest {
  email: string;
  password: string;
}

export interface OwnerLoginResponse {
  message: string;
  owner_id: string;
  access_token?: string;
}

export interface OwnerProfileResponse {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  profile_image_url?: string | null;
  is_verified: boolean;
  is_active: boolean;
}

export interface OwnerProfileUpdatePayload {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CuisineOption {
  id: string;
  name: string;
  description?: string;
}

export interface RestaurantCreateRequest {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
}

export interface BusinessDetailsCreateRequest {
  fssai_license_no: string;
  gst_number?: string;
  pan_number: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id?: string;
}

export interface RestaurantDocumentCreateRequest {
  document_type: 'FSSAI_CERTIFICATE' | 'PAN_CARD' | 'BANK_PROOF' | 'RESTAURANT_PHOTO';
  file_url: string;
  file_name?: string;
  mime_type?: string;
}

export interface RegistrationSubmitRequest {
  restaurant: RestaurantCreateRequest;
  business_details: BusinessDetailsCreateRequest;
  cuisine_ids: string[];
  documents: RestaurantDocumentCreateRequest[];
}

export interface RegistrationSubmitResponse {
  message: string;
  restaurant_id: string;
  application_id: string;
  status: 'SUBMITTED';
}

export type RegistrationStatus = 'APPROVED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'REJECTED' | 'NOT_STARTED';

export interface RegistrationStatusResponse {
  status: RegistrationStatus;
  application_id?: string;
  restaurant_id?: string;
  restaurant_name?: string;
  rejection_reason?: string;
  submitted_at?: string;
  reviewed_at?: string;
  message?: string;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Standard fetch helper with credentials included for HttpOnly cookie authentication,
 * Authorization header support, and automatic 401 token refresh retry.
 */
async function request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes access_token & refresh_token HttpOnly cookies
  });

  // If 401 Unauthorized and not an auth endpoint or already retrying, attempt silent refresh
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/register-owner') &&
    !endpoint.includes('/auth/otp/')
  ) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            if (refreshRes.ok) {
              const data = await refreshRes.json();
              if (data?.access_token) {
                setAuthToken(data.access_token);
                return data.access_token;
              }
            }
            return null;
          } catch {
            return null;
          } finally {
            isRefreshing = false;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (newToken) {
        return request<T>(endpoint, options, true);
      } else {
        // Refresh failed (refresh token expired or invalid)
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('nfd_access_token');
          sessionStorage.removeItem('nfd_dashboard_entered');
          window.dispatchEvent(new CustomEvent('auth:session_expired'));
        }
      }
    } catch {
      // ignore and let original error throw
    }
  } else if (
    response.status === 401 &&
    (isRetry || endpoint.includes('/auth/refresh'))
  ) {
    // If it's still 401 after retry or refresh endpoint returned 401
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nfd_access_token');
      sessionStorage.removeItem('nfd_dashboard_entered');
      window.dispatchEvent(new CustomEvent('auth:session_expired'));
    }
  }

  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) {
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
        } else {
          errorMsg = JSON.stringify(data.detail);
        }
      } else if (data?.message) {
        errorMsg = data.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

/**
 * POST /api/v1/auth/register-owner
 * Creates new owner and sets access_token + refresh_token cookies
 */
export async function apiRegisterOwner(payload: OwnerRegisterRequest): Promise<OwnerRegisterResponse> {
  const res = await request<OwnerRegisterResponse>('/api/v1/auth/register-owner', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res?.access_token) {
    setAuthToken(res.access_token);
  }
  return res;
}

/**
 * POST /api/v1/auth/login
 * Verifies email/password and sets access_token + refresh_token cookies
 */
export async function apiLogin(payload: OwnerLoginRequest): Promise<OwnerLoginResponse> {
  const res = await request<OwnerLoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res?.access_token) {
    setAuthToken(res.access_token);
  }
  return res;
}

// ===== OTP login helpers =====

export interface OwnerOtpRequestPayload {
  phone: string;
  language: 'en' | 'hi' | 'te';
}

export interface OwnerOtpRequestResponse {
  message: string;
  request_id: string;
}

export interface OwnerOtpVerifyPayload {
  request_id: string;
  phone: string;
  otp: string;
}

export interface OwnerOtpVerifyResponse {
  message: string;
  owner_id: string;
  access_token: string;
}

/**
 * POST /api/v1/auth/otp/request
 * Sends an OTP SMS to the owner's registered phone number.
 * Never returns the OTP itself — it is delivered via SMS.
 */
export async function apiRequestOtp(
  payload: OwnerOtpRequestPayload,
): Promise<OwnerOtpRequestResponse> {
  return request<OwnerOtpRequestResponse>('/api/v1/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/v1/auth/otp/verify
 * Verifies the six-digit OTP and sets access_token + refresh_token cookies on success.
 */
export async function apiVerifyOtp(
  payload: OwnerOtpVerifyPayload,
): Promise<OwnerOtpVerifyResponse> {
  const res = await request<OwnerOtpVerifyResponse>('/api/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res?.access_token) {
    setAuthToken(res.access_token);
  }
  return res;
}

/**
 * GET /api/v1/auth/me
 * Retrieves the currently authenticated owner profile from the session
 */
export async function apiGetMe(): Promise<OwnerProfileResponse> {
  return request<OwnerProfileResponse>('/api/v1/auth/me', {
    method: 'GET',
  });
}

/**
 * POST /api/v1/auth/refresh
 * Performs token rotation via refresh_token cookie
 */
export async function apiRefreshToken(): Promise<{ message: string; access_token?: string }> {
  const res = await request<{ message: string; access_token?: string }>('/api/v1/auth/refresh', {
    method: 'POST',
  });
  if (res?.access_token) {
    setAuthToken(res.access_token);
  }
  return res;
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    // Buffer of 30 seconds before actual exp
    return (payload.exp * 1000) < (Date.now() + 30000);
  } catch {
    return true;
  }
}

export async function getValidAuthToken(): Promise<string | null> {
  let token = getAuthToken();
  if (!token || isTokenExpired(token)) {
    try {
      const res = await apiRefreshToken();
      if (res?.access_token) {
        token = res.access_token;
      }
    } catch {
      return null;
    }
  }
  return token;
}

/**
 * POST /api/v1/auth/logout
 * Revokes refresh session and clears auth cookies
 */
export async function apiLogout(): Promise<{ message: string }> {
  try {
    return await request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    });
  } finally {
    setAuthToken(null);
  }
}

/**
 * GET /api/v1/cuisines
 * Fetches available cuisines directly from PostgreSQL nfd_cuisine_types table
 */
export async function apiGetCuisines(): Promise<CuisineOption[]> {
  return request<CuisineOption[]>('/api/v1/cuisines', {
    method: 'GET',
  });
}

/**
 * POST /api/v1/restaurants/registration/submit
 * Submits the unified restaurant registration payload in a single atomic database transaction
 */
export async function apiSubmitRegistration(payload: RegistrationSubmitRequest): Promise<RegistrationSubmitResponse> {
  return request<RegistrationSubmitResponse>('/api/v1/restaurants/registration/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/v1/restaurants/registration/status
 * Fetches the current owner's restaurant registration application status from database
 */
export async function apiGetRegistrationStatus(): Promise<RegistrationStatusResponse> {
  return request<RegistrationStatusResponse>('/api/v1/restaurants/registration/status', {
    method: 'GET',
  });
}

export interface CategoryCreateRequest {
  name: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

/**
 * POST /api/v1/menu/categories
 * Sends ONLY { "name": "..." } from the frontend.
 * Backend derives the owner's restaurant from the session, checks duplicates, assigns display_order, and inserts into menu_categories.
 */
export async function apiCreateCategory(payload: CategoryCreateRequest): Promise<CategoryResponse> {
  return request<CategoryResponse>('/api/v1/menu/categories', {
    method: 'POST',
    body: JSON.stringify({ name: payload.name }),
  });
}

/**
 * GET /api/v1/menu/categories
 * Retrieves all categories for the authenticated owner's restaurant
 */
export async function apiGetCategories(): Promise<CategoryResponse[]> {
  return request<CategoryResponse[]>('/api/v1/menu/categories', {
    method: 'GET',
  });
}

export interface MenuItemCreateRequest {
  category_id?: string;
  category_name?: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  base_price: number;
  food_type: 'VEG' | 'NON_VEG' | 'EGG';
  preparation_time_minutes: number;
}

export interface MenuItemResponse {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  base_price: number;
  food_type: string;
  preparation_time_minutes: number;
  availability_status: string;
  display_order: number;
  is_active: boolean;
}

export type MenuItemAvailability = 'AVAILABLE' | 'TEMP_UNAVAILABLE' | 'OUT_OF_STOCK';

/**
 * POST /api/v1/menu/items
 * Creates a new menu item in nfd_menu_items table in the database
 */
export async function apiCreateMenuItem(payload: MenuItemCreateRequest): Promise<MenuItemResponse> {
  return request<MenuItemResponse>('/api/v1/menu/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/v1/menu/items
 * Retrieves menu items for the authenticated owner's restaurant
 */
export async function apiGetMenuItems(): Promise<MenuItemResponse[]> {
  return request<MenuItemResponse[]>('/api/v1/menu/items', {
    method: 'GET',
  });
}

/** PATCH /api/v1/menu/items/{item_id}/availability */
export async function apiUpdateMenuItemAvailability(
  itemId: string,
  availability_status: MenuItemAvailability,
): Promise<MenuItemResponse> {
  return request<MenuItemResponse>(`/api/v1/menu/items/${encodeURIComponent(itemId)}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ availability_status }),
  });
}

export interface BackendOrderItem {
  order_item_id: number;
  menu_item_id: string;
  name?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface BackendOrder {
  order_id: number;
  customer_id: number;
  restaurant_id?: string | null;
  rider_id?: number | null;
  order_status: string;
  subtotal: number;
  gst_amount: number;
  delivery_charge: number;
  discount_amount: number;
  total_amount: number;
  cancellation_status?: string | null;
  delivery_eta?: string | null;
  created_at: string;
  updated_at?: string | null;
  items?: BackendOrderItem[];
}

export interface BackendOrderListResponse {
  orders: BackendOrder[];
  total: number;
}

export function mapBackendOrderToFrontend(
  bo: BackendOrder,
  delivery?: Pick<BackendDelivery, 'customer' | 'delivery_partner'>,
): Order {
  const rawStatus = (bo.order_status || 'PLACED').toUpperCase();
  let status: OrderStatus = 'PLACED';
  if (rawStatus === 'ORDERED' || rawStatus === 'PLACED') {
    status = 'PLACED';
  } else if (rawStatus === 'ACCEPTED') {
    status = 'ACCEPTED';
  } else if (rawStatus === 'PREPARING') {
    status = 'PREPARING';
  } else if (rawStatus === 'READY_FOR_PICKUP' || rawStatus === 'READY') {
    status = 'READY_FOR_PICKUP';
  } else if (rawStatus === 'PICKED_UP') {
    status = 'PICKED_UP';
  } else if (rawStatus === 'DELIVERED') {
    status = 'DELIVERED';
  } else if (rawStatus === 'COMPLETED') {
    status = 'COMPLETED';
  } else if (rawStatus === 'REJECTED') {
    status = 'REJECTED';
  } else if (rawStatus === 'CANCELLED' || rawStatus === 'FAILED' || rawStatus === 'REFUNDED') {
    status = 'CANCELLED';
  }

  const items = (bo.items && bo.items.length > 0)
    ? bo.items.map((it) => ({
        id: String(it.order_item_id),
        name: it.name || `Item #${it.order_item_id}`,
        quantity: it.quantity,
        price: Number(it.unit_price) || 0,
      }))
    : [];

  const orderIdStr = String(bo.order_id);
  const shortId = `#ORD-${orderIdStr.padStart(4, '0')}`;

  return {
    id: orderIdStr,
    shortId,
    customerName: delivery?.customer?.name || `Customer #${bo.customer_id}`,
    customerPhone: delivery?.customer?.phone ?? undefined,
    status,
    items,
    subtotal: Number(bo.subtotal) || 0,
    taxes: Number(bo.gst_amount) || 0,
    deliveryFee: Number(bo.delivery_charge) || 0,
    packagingFee: 0,
    discount: Number(bo.discount_amount) || 0,
    total: Number(bo.total_amount) || 0,
    paymentStatus: 'PENDING',
    paymentMethod: 'Payment details unavailable',
    placedAt: bo.created_at || new Date().toISOString(),
    prepTime: undefined,
    deliveryAddress: delivery?.customer?.address ?? undefined,
    deliveryPartner: delivery?.delivery_partner
      ? {
          name: delivery.delivery_partner.name,
          phone: delivery.delivery_partner.phone ?? undefined,
          vehicle: [delivery.delivery_partner.vehicle_type, delivery.delivery_partner.vehicle_number]
            .filter(Boolean)
            .join(' ') || undefined,
        }
      : undefined,
    timeline: [
      {
        status,
        timestamp: bo.created_at || new Date().toISOString(),
        label: status === 'PLACED' ? 'Order Placed' : status,
      },
    ],
  };
}

/** GET /api/v1/orders */
export async function apiGetOrders(): Promise<BackendOrderListResponse> {
  return request<BackendOrderListResponse>('/api/v1/orders', {
    method: 'GET',
  });
}

/** GET /api/v1/orders/{order_id} */
export async function apiGetOrder(orderId: string | number): Promise<BackendOrder> {
  return request<BackendOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
  });
}

/** PATCH /api/v1/orders/{order_id}/accept */
export async function apiAcceptOrder(orderId: string | number): Promise<BackendOrder> {
  return request<BackendOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}/accept`, {
    method: 'PATCH',
  });
}

/** PATCH /api/v1/orders/{order_id}/reject */
export async function apiRejectOrder(orderId: string | number): Promise<BackendOrder> {
  return request<BackendOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}/reject`, {
    method: 'PATCH',
  });
}

/** PATCH /api/v1/orders/{order_id}/preparing */
export async function apiPreparingOrder(orderId: string | number): Promise<BackendOrder> {
  return request<BackendOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}/preparing`, {
    method: 'PATCH',
  });
}

/** PATCH /api/v1/orders/{order_id}/ready */
export async function apiReadyOrder(orderId: string | number): Promise<BackendOrder> {
  return request<BackendOrder>(`/api/v1/orders/${encodeURIComponent(orderId)}/ready`, {
    method: 'PATCH',
  });
}

export interface BackendDeliveryPartner {
  partner_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  rating?: number;
  photo?: string | null;
}

export interface BackendCustomer {
  customer_id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
}

export interface BackendAssignment {
  assignment_id?: number | null;
  partner_id?: number | null;
  order_id: number;
  assignment_status?: string | null;
  assigned_at?: string | null;
  accepted_at?: string | null;
  arrived_at_restaurant?: string | null;
  picked_up_at?: string | null;
  arrived_at_customer?: string | null;
  delivered_at?: string | null;
}

export interface BackendDelivery {
  id: string;
  short_id: string;
  order_id: number;
  order_short_id: string;
  stage: string;
  order: BackendOrder;
  customer: BackendCustomer;
  delivery_partner?: BackendDeliveryPartner | null;
  assignment?: BackendAssignment | null;
  delivery_status: string;
}

export interface BackendDeliveryListResponse {
  deliveries: BackendDelivery[];
  total: number;
}

export function mapBackendDeliveryToFrontend(bd: BackendDelivery): Delivery {
  const stage = bd.stage as DeliveryStage;

  const partner: DeliveryPartner | undefined = bd.delivery_partner
    ? {
        name: bd.delivery_partner.name,
        phone: bd.delivery_partner.phone ?? undefined,
        vehicleType: bd.delivery_partner.vehicle_type ?? undefined,
        vehicleNumber: bd.delivery_partner.vehicle_number ?? undefined,
        rating: bd.delivery_partner.rating ?? undefined,
      }
    : undefined;

  const timeline: Delivery['timeline'] = [];
  if (bd.order.created_at) {
    timeline.push({
      stage: 'WAITING_FOR_PARTNER',
      timestamp: bd.order.created_at,
      label: 'Order ready for partner assignment',
    });
  }

  if (bd.assignment?.assigned_at) {
    timeline.push({
      stage: 'ASSIGNED',
      timestamp: bd.assignment.assigned_at,
      label: 'Partner Assigned',
    });
  }
  if (bd.assignment?.accepted_at) {
    timeline.push({
      stage: 'ARRIVING',
      timestamp: bd.assignment.accepted_at,
      label: 'Partner Heading to Restaurant',
    });
  }
  if (bd.assignment?.arrived_at_restaurant) {
    timeline.push({
      stage: 'ARRIVED',
      timestamp: bd.assignment.arrived_at_restaurant,
      label: 'Partner Arrived at Restaurant',
    });
  }
  if (bd.assignment?.picked_up_at) {
    timeline.push({
      stage: 'PICKED_UP',
      timestamp: bd.assignment.picked_up_at,
      label: 'Order Picked Up',
    });
  }
  if (bd.assignment?.arrived_at_customer) {
    timeline.push({
      stage: 'IN_TRANSIT',
      timestamp: bd.assignment.arrived_at_customer,
      label: 'Arrived at Customer Location',
    });
  }
  if (bd.assignment?.delivered_at) {
    timeline.push({
      stage: 'DELIVERED',
      timestamp: bd.assignment.delivered_at,
      label: 'Order Delivered',
    });
  }

  const etaTimestamp = bd.order.delivery_eta ? new Date(bd.order.delivery_eta).getTime() : NaN;
  const etaMinutes = Number.isFinite(etaTimestamp)
    ? Math.max(0, Math.ceil((etaTimestamp - Date.now()) / 60_000))
    : undefined;

  return {
    id: bd.id,
    shortId: bd.short_id,
    orderId: bd.order_id,
    assignmentId: bd.assignment?.assignment_id || undefined,
    orderShortId: bd.order_short_id,
    customerName: bd.customer?.name ?? undefined,
    customerPhone: bd.customer?.phone ?? undefined,
    stage,
    etaMinutes,
    partner,
    address: bd.customer?.address ?? undefined,
    timeline,
    order: {
      total: Number(bd.order.total_amount),
      items: (bd.order.items ?? []).map((item) => ({
        id: String(item.order_item_id),
        name: item.name ?? undefined,
        quantity: item.quantity,
        price: Number(item.unit_price),
      })),
    },
    assignmentStatus: bd.delivery_status ?? bd.assignment?.assignment_status ?? undefined,
  };
}

/** GET /api/v1/deliveries */
export async function apiGetDeliveries(): Promise<BackendDeliveryListResponse> {
  return request<BackendDeliveryListResponse>('/api/v1/deliveries', {
    method: 'GET',
  });
}

/** GET /api/v1/deliveries/{order_id} */
export async function apiGetDelivery(orderId: string | number): Promise<BackendDelivery> {
  return request<BackendDelivery>(`/api/v1/deliveries/${encodeURIComponent(orderId)}`, {
    method: 'GET',
  });
}

// ===== Offers API =====

export interface BackendOffer {
  offer_id: number;
  offer_code: string | null;
  offer_name: string;
  discount_type: string;
  discount_value: number | string;
  min_order_amount: number | string;
  max_discount_amount: number | string | null;
  valid_from: string;
  valid_to: string;
  status: string;
  is_active: boolean;
  category_ids: string[];
  menu_item_ids: string[];
  times_used: number;
  discount_given: number | string;
}

export interface BackendOfferListResponse {
  offers: BackendOffer[];
  total: number;
}

export function mapBackendOfferToFrontend(
  bo: BackendOffer,
  categoryNameMap?: Record<string, string>,
  itemNameMap?: Record<string, string>
): Offer {
  const rawType = (bo.discount_type || '').toUpperCase();
  const validTypes: OfferType[] = ['PERCENTAGE', 'FLAT', 'MIN_ORDER', 'ITEM', 'COMBO', 'BUY_X_GET_Y'];
  const offerType: OfferType = validTypes.includes(rawType as OfferType)
    ? (rawType as OfferType)
    : 'PERCENTAGE';

  const rawStatus = (bo.status || '').toUpperCase();
  const validStatuses: OfferStatus[] = ['ACTIVE', 'SCHEDULED', 'EXPIRED'];
  const status: OfferStatus | undefined = validStatuses.includes(rawStatus as OfferStatus)
    ? (rawStatus as OfferStatus)
    : undefined;

  return {
    id: String(bo.offer_id),
    name: bo.offer_name,
    offerType,
    discountValue: Number(bo.discount_value) || 0,
    maxDiscountAmount: bo.max_discount_amount != null ? Number(bo.max_discount_amount) : 0,
    minimumOrderAmount: Number(bo.min_order_amount) || 0,
    startAt: bo.valid_from,
    endAt: bo.valid_to,
    isActive: Boolean(bo.is_active),
    applicableCategories: Array.isArray(bo.category_ids)
      ? bo.category_ids.map((id) => (categoryNameMap && categoryNameMap[String(id)]) || String(id))
      : [],
    applicableItems: Array.isArray(bo.menu_item_ids)
      ? bo.menu_item_ids.map((id) => (itemNameMap && itemNameMap[String(id)]) || String(id))
      : [],
    usageCount: bo.times_used ?? 0,
    totalDiscountGiven: Number(bo.discount_given) || 0,
    status,
    offerCode: bo.offer_code || undefined,
  };
}

/**
 * GET /api/v1/offers
 * Fetches all offers for the restaurant, optionally filtered by status ('ACTIVE' | 'SCHEDULED' | 'EXPIRED')
 */
export async function apiGetOffers(statusFilter?: string): Promise<BackendOfferListResponse> {
  const params = new URLSearchParams();
  if (statusFilter) {
    params.append('status', statusFilter.toUpperCase());
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<BackendOfferListResponse>(`/api/v1/offers${query}`, {
    method: 'GET',
  });
}

export interface CreateOfferPayload {
  offer_code?: string | null;
  offer_name: string;
  discount_type: string;
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  valid_from: string;
  valid_to: string;
  category_ids?: string[];
  menu_item_ids?: string[];
}

/**
 * POST /api/v1/offers
 * Creates a new offer for the restaurant
 */
export async function apiCreateOffer(payload: CreateOfferPayload): Promise<BackendOffer> {
  return request<BackendOffer>('/api/v1/offers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface UpdateOfferPayload {
  offer_code?: string | null;
  offer_name?: string;
  discount_type?: string;
  discount_value?: number;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  valid_from?: string;
  valid_to?: string;
  category_ids?: string[];
  menu_item_ids?: string[];
}

/**
 * PATCH /api/v1/offers/{offer_id}
 * Updates an existing offer for the restaurant
 */
export async function apiUpdateOffer(
  offerId: string | number,
  payload: UpdateOfferPayload
): Promise<BackendOffer> {
  return request<BackendOffer>(`/api/v1/offers/${offerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export interface ToggleOfferPayload {
  is_active: boolean;
}

/**
 * PATCH /api/v1/offers/{offer_id}/toggle
 * Toggles an existing offer's active status
 */
export async function apiToggleOffer(
  offerId: string | number,
  isActive: boolean
): Promise<BackendOffer> {
  return request<BackendOffer>(`/api/v1/offers/${offerId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

/**
 * DELETE /api/v1/offers/{offer_id}
 * Soft deletes an existing offer for the restaurant
 */
export async function apiDeleteOffer(offerId: string | number): Promise<void> {
  await request<void>(`/api/v1/offers/${offerId}`, {
    method: 'DELETE',
  });
}

export interface RestaurantProfileUpdatePayload {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
}

export interface RestaurantImagesResponse {
  logo_url?: string | null;
  cover_image_url?: string | null;
}

export interface RestaurantRatingResponse {
  average: number;
  total_reviews: number;
}

export interface RestaurantProfileResponse {
  id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  images?: RestaurantImagesResponse;
  address?: RestaurantAddressResponse;
  rating?: RestaurantRatingResponse | number;
  owner_id?: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  address_line1?: string;
  address_line2?: string | null;
  city?: string;
  state?: string | null;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  total_ratings?: number;
  is_active?: boolean;
  is_verified?: boolean;
}

/**
 * GET /api/v1/restaurants/me/profile
 * Retrieves current profile details for the authenticated restaurant
 */
export async function apiGetRestaurantProfile(): Promise<RestaurantProfileResponse> {
  return request<RestaurantProfileResponse>('/api/v1/restaurants/me/profile', {
    method: 'GET',
  });
}

/**
 * PATCH /api/v1/restaurants/me/profile
 * Updates basic profile details for the authenticated restaurant
 */
export async function apiUpdateRestaurantProfile(
  payload: RestaurantProfileUpdatePayload
): Promise<RestaurantProfileResponse> {
  return request<RestaurantProfileResponse>('/api/v1/restaurants/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export interface RestaurantAddressResponse {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

export interface RestaurantAddressUpdatePayload {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
}

/**
 * GET /api/v1/restaurants/me/address
 * Retrieves current address details for the authenticated restaurant
 */
export async function apiGetRestaurantAddress(): Promise<RestaurantAddressResponse> {
  return request<RestaurantAddressResponse>('/api/v1/restaurants/me/address', {
    method: 'GET',
  });
}

/**
 * PATCH /api/v1/restaurants/me/address
 * Updates address details for the authenticated restaurant
 */
export async function apiUpdateRestaurantAddress(
  payload: RestaurantAddressUpdatePayload
): Promise<RestaurantAddressResponse> {
  return request<RestaurantAddressResponse>('/api/v1/restaurants/me/address', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/v1/owners/me
 * Retrieves current owner details
 */
export async function apiGetOwnerMe(): Promise<OwnerProfileResponse> {
  return request<OwnerProfileResponse>('/api/v1/owners/me', {
    method: 'GET',
  });
}

/**
 * GET /api/v1/owners/me/profile
 * Retrieves owner profile details for the authenticated owner
 */
export async function apiGetOwnerProfile(): Promise<OwnerProfileResponse> {
  return request<OwnerProfileResponse>('/api/v1/owners/me/profile', {
    method: 'GET',
  });
}

/**
 * PATCH /api/v1/owners/me/profile
 * Updates owner profile details (name, email, phone)
 */
export async function apiUpdateOwnerProfile(
  payload: OwnerProfileUpdatePayload
): Promise<OwnerProfileResponse> {
  return request<OwnerProfileResponse>('/api/v1/owners/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}



// ============================================================
// Dashboard
// ============================================================

export interface DashboardSummary {
  today_orders: number;
  gross_revenue: number;
  net_revenue: number;
  average_order_value: number;
  rating: number;
  average_preparation_time: number | null;
  acceptance_rate: number;
  cancellation_rate: number;
}

export interface SalesTrendPoint {
  hour: string;
  revenue: number;
}

export interface SalesTrend {
  today_revenue: number;
  yesterday_revenue: number;
  change_percentage: number | null;
  hourly: SalesTrendPoint[];
}

export interface OrderPipeline {
  new: number;
  preparing: number;
  ready: number;
  completed: number;
  rejected: number;
}

export interface TopSellingItem {
  item_id: string;
  item_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  sales_trend: SalesTrend;
  order_pipeline: OrderPipeline;
  top_selling_items: TopSellingItem[];
}

/**
 * GET /api/v1/restaurants/dashboard
 * Retrieves live dashboard data for the authenticated restaurant owner.
 */
export async function apiGetDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>('/api/v1/restaurants/dashboard', {
    method: 'GET',
  });
}

export interface EarningsSummary {
  currency: string;
  gross_sales: number;
  restaurant_discounts: number;
  commission: number;
  commission_tax: number;
  other_fees: number;
  refunds: number;
  adjustments: number;
  net_earnings: number;
  delivered_orders: number;
  unfinalized_delivered_orders: number;
}

export interface EarningsResponse {
  period: string;
  start_date: string;
  end_date: string;
  summary: EarningsSummary;
}

export interface EarningsParams {
  period?: 'today' | 'week' | 'month' | 'custom';
  start_date?: string;
  end_date?: string;
}

/**
 * GET /api/v1/restaurants/earnings
 * Retrieves earnings reporting data for the authenticated restaurant.
 */
export async function apiGetEarnings(params?: EarningsParams): Promise<EarningsResponse> {
  const query = new URLSearchParams();
  if (params?.start_date && params?.end_date) {
    query.set('start_date', params.start_date);
    query.set('end_date', params.end_date);
    if (params.period) {
      query.set('period', params.period);
    }
  } else if (params?.period) {
    query.set('period', params.period);
  }

  const qs = query.toString();
  const endpoint = `/api/v1/restaurants/earnings${qs ? `?${qs}` : ''}`;
  return request<EarningsResponse>(endpoint, {
    method: 'GET',
  });
}

export interface CurrentSettlementPeriod {
  period_start: string | null;
  period_end: string | null;
  settlement_date: string;
  net_amount: string;
  status: string | null;
  is_simulated: boolean;
}

export async function apiGetCurrentSettlementPeriod(): Promise<CurrentSettlementPeriod> {
  return request<CurrentSettlementPeriod>(
    "/api/v1/restaurants/settlements/current-period",
    { method: "GET" }
  );
}

export interface SettlementHistoryItem {
  batch_id: number;
  period_start: string;
  period_end: string;
  settlement_date: string;
  orders: number;
  total_orders?: number;
  amount: number;
  net_amount?: number;
  status: 'PAID' | 'PENDING' | 'PROCESSING' | 'FAILED' | string;
  is_simulated: boolean;
  payout_reference?: string | null;
  paid_at?: string | null;
}

export interface SettlementHistoryResponse {
  settlements: SettlementHistoryItem[];
  total: number;
}

export interface SettlementHistoryParams {
  limit?: number;
  offset?: number;
}

/**
 * GET /api/v1/restaurants/settlements
 * Retrieves settlement batch history for the authenticated restaurant.
 */
export async function apiGetSettlements(
  params?: SettlementHistoryParams
): Promise<SettlementHistoryResponse> {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  const qs = query.toString();
  const endpoint = `/api/v1/restaurants/settlements${qs ? `?${qs}` : ''}`;
  return request<SettlementHistoryResponse>(endpoint, {
    method: 'GET',
  });
}

export interface AnalyticsMetric {
  value: number | null;
  previous_value: number | null;
  change_percent: number | null;
}

export interface AnalyticsOverviewResponse {
  period: string;
  start_date: string;
  end_date: string;
  currency: string;
  acceptance_rate: AnalyticsMetric;
  cancellation_rate: AnalyticsMetric;
  average_order_value: AnalyticsMetric;
  average_preparation_time: AnalyticsMetric;
  on_time_preparation_rate: AnalyticsMetric;
  order_accuracy: AnalyticsMetric;
  customer_rating: AnalyticsMetric;
  gross_revenue: AnalyticsMetric;
}

export interface AnalyticsOverviewParams {
  period?: 'today' | 'week' | 'weekly' | 'month' | 'monthly' | 'custom' | string;
  start_date?: string;
  end_date?: string;
}

/**
 * GET /api/v1/analytics/overview
 * Retrieves overview analytics metrics for the authenticated restaurant.
 */
export async function apiGetAnalyticsOverview(
  params?: AnalyticsOverviewParams
): Promise<AnalyticsOverviewResponse> {
  const query = new URLSearchParams();
  if (params?.period) {
    let normalized = params.period;
    if (normalized === 'weekly') normalized = 'week';
    if (normalized === 'monthly') normalized = 'month';
    query.set('period', normalized);
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  const qs = query.toString();
  const endpoint = `/api/v1/analytics/overview${qs ? `?${qs}` : ''}`;
  return request<AnalyticsOverviewResponse>(endpoint, {
    method: 'GET',
  });
}

export interface SalesTrendPoint {
  bucket_start: string;
  gross_revenue: number;
  orders: number;
}

export interface SalesTrendResponse {
  period: string;
  start_date: string;
  end_date: string;
  currency: string;
  points: SalesTrendPoint[];
}

export interface SalesTrendParams {
  period?: 'today' | 'week' | 'weekly' | 'month' | 'monthly' | 'custom' | string;
  start_date?: string;
  end_date?: string;
}

/**
 * GET /api/v1/analytics/sales-trend
 * Retrieves sales & order trend datapoints for the authenticated restaurant.
 */
export async function apiGetSalesTrend(
  params?: SalesTrendParams
): Promise<SalesTrendResponse> {
  const query = new URLSearchParams();
  if (params?.period) {
    let normalized = params.period;
    if (normalized === 'weekly') normalized = 'week';
    if (normalized === 'monthly') normalized = 'month';
    query.set('period', normalized);
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  const qs = query.toString();
  const endpoint = `/api/v1/analytics/sales-trend${qs ? `?${qs}` : ''}`;
  return request<SalesTrendResponse>(endpoint, {
    method: 'GET',
  });
}

export interface CustomerBreakdownResponse {
  period: string;
  start_date: string;
  end_date: string;
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  new_customer_percent: number;
  returning_customer_percent: number;
}

export interface CustomerBreakdownParams {
  period?: 'today' | 'week' | 'weekly' | 'month' | 'monthly' | 'custom' | string;
  start_date?: string;
  end_date?: string;
}

/**
 * GET /api/v1/analytics/customer-breakdown
 * Retrieves new vs returning customer patronage breakdown for the authenticated restaurant.
 */
export async function apiGetCustomerBreakdown(
  params?: CustomerBreakdownParams
): Promise<CustomerBreakdownResponse> {
  const query = new URLSearchParams();
  if (params?.period) {
    let normalized = params.period;
    if (normalized === 'weekly') normalized = 'week';
    if (normalized === 'monthly') normalized = 'month';
    query.set('period', normalized);
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  const qs = query.toString();
  const endpoint = `/api/v1/analytics/customer-breakdown${qs ? `?${qs}` : ''}`;
  return request<CustomerBreakdownResponse>(endpoint, {
    method: 'GET',
  });
}

export interface TopSellingItem {
  menu_item_id: string;
  name: string;
  image_url?: string | null;
  category_name?: string | null;
  quantity_sold: number;
  order_count: number;
  gross_revenue: number | string;
}

export interface TopSellingItemsResponse {
  period: string;
  start_date: string;
  end_date: string;
  items: TopSellingItem[];
}

export interface TopSellingItemsParams {
  period?: 'today' | 'week' | 'weekly' | 'month' | 'monthly' | 'custom' | string;
  start_date?: string;
  end_date?: string;
}

/**
 * GET /api/v1/analytics/top-selling-items
 * Retrieves top selling items by volume for the authenticated restaurant.
 */
export async function apiGetTopSellingItems(
  params?: TopSellingItemsParams
): Promise<TopSellingItemsResponse> {
  const query = new URLSearchParams();
  if (params?.period) {
    let normalized = params.period;
    if (normalized === 'weekly') normalized = 'week';
    if (normalized === 'monthly') normalized = 'month';
    query.set('period', normalized);
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  const qs = query.toString();
  const endpoint = `/api/v1/analytics/top-selling-items${qs ? `?${qs}` : ''}`;
  return request<TopSellingItemsResponse>(endpoint, {
    method: 'GET',
  });
}

export type HighestRevenueItemsResponse = TopSellingItemsResponse;
export type HighestRevenueItem = TopSellingItem;
export type HighestRevenueItemsParams = TopSellingItemsParams;

/**
 * GET /api/v1/analytics/highest-revenue-items
 * Retrieves highest revenue items by gross revenue for the authenticated restaurant.
 */
export async function apiGetHighestRevenueItems(
  params?: HighestRevenueItemsParams
): Promise<HighestRevenueItemsResponse> {
  const query = new URLSearchParams();
  if (params?.period) {
    let normalized = params.period;
    if (normalized === 'weekly') normalized = 'week';
    if (normalized === 'monthly') normalized = 'month';
    query.set('period', normalized);
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  const qs = query.toString();
  const endpoint = `/api/v1/analytics/highest-revenue-items${qs ? `?${qs}` : ''}`;
  return request<HighestRevenueItemsResponse>(endpoint, {
    method: 'GET',
  });
}

export interface MenuPerformanceItem {
  menu_item_id: string;
  name: string;
  category_name?: string | null;
  orders: number;
  gross_revenue: number | string;
  rating?: number | string | null;
  average_preparation_minutes?: number | string | null;
  performance_label?: string | null;
}

export interface MenuPerformanceResponse {
  period: string;
  start_date: string;
  end_date: string;
  items: MenuPerformanceItem[];
  total: number;
}

export interface MenuPerformanceParams {
  period?: 'today' | 'week' | 'weekly' | 'month' | 'monthly' | 'custom' | string;
  start_date?: string;
  end_date?: string;
}

/**
 * GET /api/v1/analytics/menu-performance
 * Retrieves overall menu performance aggregates for the authenticated restaurant.
 */
export async function apiGetMenuPerformance(
  params?: MenuPerformanceParams
): Promise<MenuPerformanceResponse> {
  const query = new URLSearchParams();
  if (params?.period) {
    let normalized = params.period;
    if (normalized === 'weekly') normalized = 'week';
    if (normalized === 'monthly') normalized = 'month';
    query.set('period', normalized);
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  const qs = query.toString();
  const endpoint = `/api/v1/analytics/menu-performance${qs ? `?${qs}` : ''}`;
  return request<MenuPerformanceResponse>(endpoint, {
    method: 'GET',
  });
}
export interface ExportAnalyticsParams {
  period?: 'today' | 'week' | 'weekly' | 'month' | 'monthly' | 'custom' | string;
  start_date?: string;
  end_date?: string;
}

/**
 * GET /api/v1/analytics/export
 * Downloads the menu item performance analytics CSV export for the selected period.
 */
export async function apiExportAnalytics(
  params?: ExportAnalyticsParams
): Promise<{ blob: Blob; filename: string }> {
  const query = new URLSearchParams();
  if (params?.period) {
    let normalized = params.period;
    if (normalized === 'weekly') normalized = 'week';
    if (normalized === 'monthly') normalized = 'month';
    query.set('period', normalized);
  }
  if (params?.start_date) {
    query.set('start_date', params.start_date);
  }
  if (params?.end_date) {
    query.set('end_date', params.end_date);
  }
  const qs = query.toString();
  const endpoint = `/api/v1/analytics/export${qs ? `?${qs}` : ''}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const token = getAuthToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMsg = `Export failed (${response.status})`;
    try {
      const data = await response.json();
      if (data?.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const disposition = response.headers.get('content-disposition') || '';
  let filename = 'menu_performance.csv';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  if (match && match[1]) {
    filename = match[1];
  }

  const blob = await response.blob();
  return { blob, filename };
}

/**
 * Initiates browser file download for a generated CSV Blob.
 */
export function triggerCsvDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export interface FeedbackItem {
  feedback_id: number;
  order_id: number;
  rating: number;
  comments?: string | null;
  created_at?: string | null;
}

export interface FeedbackListResponse {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
  reviews: FeedbackItem[];
}

/**
 * GET /api/v1/restaurants/me/feedback
 * Retrieves customer feedback, overall rating, and rating distribution for the authenticated restaurant.
 */
export async function apiGetRestaurantFeedback(): Promise<FeedbackListResponse> {
  return request<FeedbackListResponse>('/api/v1/restaurants/me/feedback', {
    method: 'GET',
  });
}

export type BackendComplaintCategory =
  | 'MISSING_ITEM'
  | 'WRONG_ITEM'
  | 'FOOD_QUALITY'
  | 'PACKAGING'
  | 'TEMPERATURE'
  | 'OTHER';

export type BackendComplaintStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED';

export type BackendComplaintPriority =
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT';

export interface BackendComplaint {
  complaint_id: number;
  order_id: number;
  customer_id: number;
  restaurant_id: string;
  category: BackendComplaintCategory;
  description: string;
  status: BackendComplaintStatus;
  priority: BackendComplaintPriority;
  resolution_note?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface BackendComplaintListResponse {
  items: BackendComplaint[];
  total: number;
  limit: number;
  offset: number;
}

export interface ComplaintQueryParams {
  status?: BackendComplaintStatus | string;
  category?: BackendComplaintCategory | string;
  limit?: number;
  offset?: number;
}

/**
 * GET /api/v1/complaints
 * Lists complaints for the authenticated owner's restaurant.
 */
export async function apiGetComplaints(
  params?: ComplaintQueryParams
): Promise<BackendComplaintListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));

  const qs = query.toString();
  const endpoint = `/api/v1/complaints${qs ? `?${qs}` : ''}`;
  return request<BackendComplaintListResponse>(endpoint, {
    method: 'GET',
  });
}

/**
 * GET /api/v1/complaints/{complaint_id}
 * Retrieves details for a specific complaint.
 */
export async function apiGetComplaint(
  complaintId: number | string
): Promise<BackendComplaint> {
  return request<BackendComplaint>(`/api/v1/complaints/${encodeURIComponent(complaintId)}`, {
    method: 'GET',
  });
}

/**
 * PATCH /api/v1/complaints/{complaint_id}/status
 * Updates status and creates an audit history entry.
 */
export async function apiUpdateComplaintStatus(
  complaintId: number | string,
  payload: { status: 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED'; note?: string }
): Promise<BackendComplaint> {
  return request<BackendComplaint>(`/api/v1/complaints/${encodeURIComponent(complaintId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export type RefundDestination =
  | 'ORIGINAL_PAYMENT_METHOD'
  | 'UPI'
  | 'BANK_ACCOUNT';

export type RefundStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface RefundCreatePayload {
  amount: number;
  reason: string;
  destination_method: RefundDestination;
  idempotency_key: string;
}

export interface BackendRefund {
  refund_id: number;
  order_id: number;
  complaint_id: number | null;
  initiated_by_owner_id: string | null;
  amount: string;
  status: RefundStatus;
  reason: string | null;
  destination_method: RefundDestination | null;
  execution_reference: string | null;
  failure_reason: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type RefundResponse = BackendRefund;

/**
 * POST /api/v1/complaints/{complaint_id}/refunds
 * Creates a pending refund record for a resolved complaint.
 */
export async function apiCreateComplaintRefund(
  complaintId: number | string,
  payload: RefundCreatePayload
): Promise<BackendRefund> {
  return request<BackendRefund>(
    `/api/v1/complaints/${encodeURIComponent(complaintId)}/refunds`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export interface BackendRefundListResponse {
  items: BackendRefund[];
  total: number;
}
export type RefundListResponse = BackendRefundListResponse;

export async function apiGetRefunds(params?: {
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  limit?: number;
  offset?: number;
}): Promise<RefundListResponse> {
  const query = new URLSearchParams();

  if (params?.status) query.set('status', params.status);
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set('offset', String(params.offset));
  }

  const qs = query.toString();

  return request<RefundListResponse>(
    `/api/v1/refunds${qs ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}


// ============================================================
// Restaurant Hours — Weekly Schedule, Special Dates, Order Settings
// ============================================================

export type SlotType = 'OPERATING' | 'ONLINE_ORDERING';

export interface HourSlotInput {
  slot_type: SlotType;
  start_time: string; // "HH:MM:SS"
  end_time: string;
}

export interface HourSlotResponse extends HourSlotInput {
  id: string;
}

export interface WeeklyDayInput {
  day_of_week: number; // 1=Mon … 7=Sun (ISO isoweekday)
  is_closed: boolean;
  slots: HourSlotInput[];
}

export interface WeeklyDayResponse {
  id: string;
  day_of_week: number;
  is_closed: boolean;
  slots: HourSlotResponse[];
}

export interface WeeklyScheduleResponse {
  days: WeeklyDayResponse[];
}

export interface SpecialHoursInput {
  special_date: string; // "YYYY-MM-DD"
  is_closed: boolean;
  note?: string | null;
  slots: HourSlotInput[];
}

export interface SpecialHoursResponse {
  id: string;
  special_date: string;
  is_closed: boolean;
  note: string | null;
  slots: HourSlotResponse[];
}

export interface OrderSettingsResponse {
  is_paused: boolean;
  pause_reason: string | null;
  paused_until: string | null; // ISO datetime string
}

export interface RestaurantAvailabilityResponse {
  is_operating_now: boolean;
  is_ordering_now: boolean;
  is_paused: boolean;
  is_accepting_orders: boolean;
  status: 'ONLINE' | 'PAUSED' | 'OFFLINE';
  reason:
    | 'NO_SCHEDULE'
    | 'CLOSED_TODAY'
    | 'OUTSIDE_OPERATING_HOURS'
    | 'OUTSIDE_ORDERING_HOURS'
    | 'TEMPORARILY_PAUSED'
    | 'ACCEPTING_ORDERS';
  paused_until?: string | null;
  next_change_at?: string | null;
}

export interface PauseOrdersInput {
  reason?: string | null;
  paused_until?: string | null; // ISO datetime string with timezone offset
}


/** GET /api/v1/restaurants/hours/weekly */
export async function apiGetWeeklySchedule(): Promise<WeeklyScheduleResponse> {
  return request<WeeklyScheduleResponse>('/api/v1/restaurants/hours/weekly', { method: 'GET' });
}

/** PUT /api/v1/restaurants/hours/weekly */
export async function apiPutWeeklySchedule(
  payload: { days: WeeklyDayInput[] }
): Promise<WeeklyScheduleResponse> {
  return request<WeeklyScheduleResponse>('/api/v1/restaurants/hours/weekly', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/restaurants/hours/special-dates */
export async function apiGetSpecialDates(): Promise<SpecialHoursResponse[]> {
  return request<SpecialHoursResponse[]>('/api/v1/restaurants/hours/special-dates', { method: 'GET' });
}

/** POST /api/v1/restaurants/hours/special-dates */
export async function apiCreateSpecialDate(
  payload: SpecialHoursInput
): Promise<{ id: string; message: string }> {
  return request<{ id: string; message: string }>('/api/v1/restaurants/hours/special-dates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PUT /api/v1/restaurants/hours/special-dates/{special_hours_id} */
export async function apiUpdateSpecialDate(
  specialHoursId: string,
  payload: SpecialHoursInput
): Promise<{ id: string; message: string }> {
  return request<{ id: string; message: string }>(
    `/api/v1/restaurants/hours/special-dates/${encodeURIComponent(specialHoursId)}`,
    { method: 'PUT', body: JSON.stringify(payload) }
  );
}

/** DELETE /api/v1/restaurants/hours/special-dates/{special_hours_id} */
export async function apiDeleteSpecialDate(specialHoursId: string): Promise<void> {
  await request<void>(
    `/api/v1/restaurants/hours/special-dates/${encodeURIComponent(specialHoursId)}`,
    { method: 'DELETE' }
  );
}

/** GET /api/v1/restaurants/hours/order-settings */
export async function apiGetOrderSettings(): Promise<OrderSettingsResponse> {
  return request<OrderSettingsResponse>('/api/v1/restaurants/hours/order-settings', { method: 'GET' });
}

/** PUT /api/v1/restaurants/hours/order-settings/pause */
export async function apiPauseOrders(payload: PauseOrdersInput): Promise<OrderSettingsResponse> {
  return request<OrderSettingsResponse>('/api/v1/restaurants/hours/order-settings/pause', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** PUT /api/v1/restaurants/hours/order-settings/resume */
export async function apiResumeOrders(): Promise<OrderSettingsResponse> {
  return request<OrderSettingsResponse>('/api/v1/restaurants/hours/order-settings/resume', {
    method: 'PUT',
  });
}

/** GET /api/v1/restaurants/hours/availability */
export async function apiGetRestaurantAvailability(): Promise<RestaurantAvailabilityResponse> {
  return request<RestaurantAvailabilityResponse>('/api/v1/restaurants/hours/availability', {
    method: 'GET',
  });
}

// ===== Restaurant Notifications Endpoints =====

export interface BackendNotification {
  notification_id: number;
  restaurant_id: string;
  notification_type: string;
  title: string;
  message: string;
  entity_type: 'ORDER' | 'COMPLAINT' | 'REFUND' | 'DELIVERY' | null;
  entity_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface BackendNotificationListResponse {
  items: BackendNotification[];
  total: number;
  unread_count: number;
  limit: number;
  offset: number;
}

export interface NotificationQueryParams {
  limit?: number;
  offset?: number;
}

export interface ReadNotificationResponse {
  message: string;
  notification_id: number;
  is_read: boolean;
}

export interface ReadAllNotificationsResponse {
  message: string;
  updated_count: number;
}

export interface UnreadNotificationCountResponse {
  unread_count: number;
}

/** GET /api/v1/notifications */
export async function apiGetNotifications(
  params: NotificationQueryParams = {}
): Promise<BackendNotificationListResponse> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const queryString = query.toString();
  return request<BackendNotificationListResponse>(
    `/api/v1/notifications${queryString ? `?${queryString}` : ''}`,
    { method: 'GET' }
  );
}

/** GET /api/v1/notifications/unread-count */
export async function apiGetUnreadNotificationCount(): Promise<UnreadNotificationCountResponse> {
  return request<UnreadNotificationCountResponse>(
    '/api/v1/notifications/unread-count',
    { method: 'GET' }
  );
}

/** PATCH /api/v1/notifications/{notification_id}/read */
export async function apiMarkNotificationRead(
  notificationId: number | string
): Promise<ReadNotificationResponse> {
  return request<ReadNotificationResponse>(
    `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'PATCH' }
  );
}

/** PATCH /api/v1/notifications/read-all */
export async function apiMarkAllNotificationsRead(): Promise<ReadAllNotificationsResponse> {
  return request<ReadAllNotificationsResponse>(
    '/api/v1/notifications/read-all',
    { method: 'PATCH' }
  );
}


