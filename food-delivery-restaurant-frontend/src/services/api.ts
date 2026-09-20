// Real API client connecting to FastAPI backend

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8000');

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
  phone: string;
  is_active?: boolean;
  is_verified?: boolean;
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
    !endpoint.includes('/auth/register-owner')
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
