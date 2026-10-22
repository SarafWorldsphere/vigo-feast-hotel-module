'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  MenuItem, Category, ItemAvailability,
  Refund, Complaint, ComplaintType, ComplaintStatus,
} from '@/data/mockData';
import type { Order } from '@/types/order';
import { Delivery, DeliveryStage } from '@/types/delivery';
import {
  RegistrationStatus,
  RegistrationStatusResponse,
  OwnerRegisterRequest,
  RegistrationSubmitRequest,
  apiRegisterOwner,
  apiLogin,
  apiLogout,
  apiRefreshToken,
  apiGetMe,
  apiSubmitRegistration,
  apiGetRegistrationStatus,
  apiCreateCategory,
  apiGetCategories,
  CategoryResponse,
  MenuItemCreateRequest,
  apiCreateMenuItem,
  apiGetMenuItems,
  apiUpdateMenuItemAvailability,
  MenuItemAvailability,
  MenuItemResponse,
  API_BASE_URL,
  getAuthToken,
  getValidAuthToken,
  apiGetOrder,
  apiGetOrders,
  apiGetDelivery,
  apiAcceptOrder,
  apiRejectOrder,
  apiPreparingOrder,
  apiReadyOrder,
  mapBackendOrderToFrontend,
  apiGetDeliveries,
  BackendDelivery,
  mapBackendDeliveryToFrontend,
  apiGetComplaints,
  apiUpdateComplaintStatus,
  apiGetRefunds,
  apiCreateComplaintRefund,
  apiGetOrderSettings,
  apiPauseOrders,
  apiResumeOrders,
  apiGetRestaurantAvailability,
  apiGetUnreadNotificationCount,
  OrderSettingsResponse,
  PauseOrdersInput,
  RestaurantAvailabilityResponse,
} from '@/services/api';

export type Page = 'dashboard' | 'orders' | 'menu' | 'delivery' | 'earnings' | 'refunds' | 'analytics' | 'offers' | 'reviews' | 'notifications' | 'settings';
export type AuthView = 'login' | 'signup' | 'wizard' | 'status' | 'register';

export interface OwnerSession {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
}

export interface RefundModalDefaults {
  orderId?: string;
  complaintId?: string;
  suggestedAmount?: number;
  defaultReason?: string;
}

interface AppState {
  currentPage: Page;
  setPage: (p: Page) => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authView: AuthView;
  setAuthView: (v: AuthView) => void;
  owner: OwnerSession | null;
  registrationStatus: RegistrationStatus;
  statusDetails: RegistrationStatusResponse | null;
  setRegistrationStatus: (status: RegistrationStatus) => void;
  login: (statusOverride?: RegistrationStatus) => Promise<void>;
  enterDashboard: () => void;
  logout: () => Promise<void>;
  registerOwner: (payload: OwnerRegisterRequest) => Promise<void>;
  submitRegistration: (payload: RegistrationSubmitRequest) => Promise<void>;
  refreshToken: () => Promise<void>;
  isOnline: boolean;
  toggleOnline: () => void;
  goOfflineFor: (minutes: number) => void;
  offlineUntil: Date | null;
  offlineReason: string;
  setOfflineReason: (r: string) => void;
  orderSettings: OrderSettingsResponse | null;
  isOrderSettingsLoading: boolean;
  loadOrderSettings: () => Promise<OrderSettingsResponse | null>;
  availability: RestaurantAvailabilityResponse | null;
  isAvailabilityLoading: boolean;
  loadAvailability: () => Promise<RestaurantAvailabilityResponse | null>;
  pauseOnlineOrders: (payload: PauseOrdersInput) => Promise<boolean>;
  resumeOnlineOrders: () => Promise<boolean>;
  settingsInitialTab: 'profile' | 'hours' | 'status' | 'account' | 'payouts' | null;
  setSettingsInitialTab: (tab: 'profile' | 'hours' | 'status' | 'account' | 'payouts' | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  orders: Order[];
  loadOrders: () => Promise<void>;
  deliveries: Delivery[];
  loadDeliveries: () => Promise<void>;
  addOrder: (o: Order) => void;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  viewOrder: (id: string) => void;
  menuItems: MenuItem[];
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  updateMenuItemAvailability: (id: string, availability: ItemAvailability) => Promise<MenuItem>;
  addMenuItem: (item: MenuItem) => void;
  createMenuItem: (payload: MenuItemCreateRequest) => Promise<MenuItem>;
  loadMenuItems: () => Promise<void>;
  categories: Category[];
  loadCategories: () => Promise<void>;
  reorderCategories: (newOrder: Category[]) => void;
  addCategory: (name: string, visible?: boolean) => Promise<Category>;
  toggleCategoryVisible: (id: string) => void;
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  newOrderCount: number;
  clearNewOrderCount: () => void;
  unreadNotificationCount: number;
  setUnreadNotificationCount: (n: number) => void;
  loadUnreadNotificationCount: () => Promise<void>;
  addNotification: (n: { type: string; title: string; message: string }) => void;
  // Shared Refunds & Complaints State
  refunds: Refund[];
  setRefunds: React.Dispatch<React.SetStateAction<Refund[]>>;
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  loadComplaints: () => Promise<void>;
  loadRefunds: () => Promise<void>;
  selectedRefundId: string | null;
  setSelectedRefundId: (id: string | null) => void;
  refundModalOpen: boolean;
  refundModalDefaults: RefundModalDefaults | null;
  openRefundModal: (defaults?: RefundModalDefaults) => void;
  closeRefundModal: () => void;
  createRefund: (params: {
    orderId: string;
    amount: number;
    reason: string;
    reasonNote?: string;
    refundType: 'FULL' | 'PARTIAL';
    complaintId?: string;
    complaintResolution?: string;
  }) => Promise<any>;
  retryRefund: (refundId: string) => void;
  viewRefund: (refundId: string) => void;
  viewComplaint: (complaintId: string) => void;
  highlightedComplaintId: string | null;
  setHighlightedComplaintId: (id: string | null) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  completedRefundsTotal: number;
  pendingRefundsCount: number;
  failedRefundsCount: number;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [owner, setOwner] = useState<OwnerSession | null>(null);
  const [registrationStatus, setStatusState] = useState<RegistrationStatus>('NOT_STARTED');
  const [statusDetails, setStatusDetails] = useState<RegistrationStatusResponse | null>(null);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineUntil, setOfflineUntil] = useState<Date | null>(null);
  const [offlineReason, setOfflineReason] = useState('');
  const [orderSettings, setOrderSettings] = useState<OrderSettingsResponse | null>(null);
  const [isOrderSettingsLoading, setIsOrderSettingsLoading] = useState(false);
  const [availability, setAvailability] = useState<RestaurantAvailabilityResponse | null>(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'hours' | 'status' | 'account' | 'payouts' | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Shared Refunds & Complaints State
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundModalDefaults, setRefundModalDefaults] = useState<RefundModalDefaults | null>(null);
  const [highlightedComplaintId, setHighlightedComplaintId] = useState<string | null>(null);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Restore offline timer
  useEffect(() => {
    if (offlineUntil) {
      const timer = setInterval(() => {
        if (new Date() >= offlineUntil) {
          setIsOnline(true);
          setOfflineUntil(null);
          setOfflineReason('');
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [offlineUntil]);

  // Restore authenticated session & application status on mount
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        let me;
        try {
          me = await apiGetMe();
        } catch {
          // If access token is expired, attempt refresh via 30-day cookie
          const refresh = await apiRefreshToken().catch(() => null);
          if (refresh?.access_token) {
            me = await apiGetMe().catch(() => null);
          }
        }

        if (!isMounted || !me) {
          if (isMounted) {
            setIsAuthenticated(false);
            setAuthView('login');
          }
          return;
        }

        setOwner({
          id: me.id,
          name: me.name,
          email: me.email,
          phone: me.phone || '',
        });

        try {
          const statusRes = await apiGetRegistrationStatus();
          if (!isMounted) return;
          setStatusState(statusRes.status);
          setStatusDetails(statusRes);

          if (statusRes.status === 'APPROVED') {
            setIsAuthenticated(true);
            setCurrentPage('dashboard');
          } else if (statusRes.status === 'NOT_STARTED') {
            setIsAuthenticated(false);
            setAuthView('wizard');
          } else {
            setIsAuthenticated(false);
            setAuthView('status');
          }
        } catch {
          // If status fetch fails, keep default wizard if owner is logged in
          if (isMounted) {
            setStatusState('NOT_STARTED');
            setAuthView('wizard');
          }
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          setAuthView('login');
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    checkSession();

    const handleSessionExpired = () => {
      setIsAuthenticated(false);
      setOwner(null);
      setStatusState('NOT_STARTED');
      setStatusDetails(null);
      setAuthView('login');
      addToast({
        type: 'info',
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again.',
      });
    };

    window.addEventListener('auth:session_expired', handleSessionExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, [addToast]);

  // Load deliveries from backend REST
  const loadDeliveries = useCallback(async () => {
    try {
      const res = await apiGetDeliveries();
      if (res && Array.isArray(res.deliveries)) {
        const mapped = res.deliveries.map(mapBackendDeliveryToFrontend);
        setDeliveries(mapped);
      }
    } catch (err) {
      console.error("Failed to load deliveries:", err);
    }
  }, []);

  // Load orders with associated delivery details from backend REST
  const loadOrders = useCallback(async () => {
    try {
      const [res, deliveryRes] = await Promise.all([
        apiGetOrders(),
        apiGetDeliveries().catch(() => ({ deliveries: [] as BackendDelivery[], total: 0 })),
      ]);
      if (res && Array.isArray(res.orders)) {
        const deliveriesByOrderId = new Map(
          (deliveryRes.deliveries ?? []).map((delivery) => [delivery.order_id, delivery])
        );
        const mappedDb = res.orders.map((order) =>
          mapBackendOrderToFrontend(order, deliveriesByOrderId.get(order.order_id))
        );
        setOrders(mappedDb);
        const newCount = mappedDb.filter((o) => o.status === 'PLACED').length;
        setNewOrderCount(newCount);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    try {
      const res = await apiGetComplaints();
      if (res && Array.isArray(res.items)) {
        const seenIds = new Set<number>();
        const uniqueItems = res.items.filter((bc) => {
          if (seenIds.has(bc.complaint_id)) return false;
          seenIds.add(bc.complaint_id);
          return true;
        });

        const mapped: Complaint[] = uniqueItems.map((bc) => {
          const orderIdStr = String(bc.order_id);
          return {
            id: String(bc.complaint_id),
            order_id: orderIdStr,
            orderShortId: `#ORD-${orderIdStr.padStart(4, '0')}`,
            customerName: `Customer #${bc.customer_id}`,
            type: (bc.category as ComplaintType) || 'OTHER',
            description: bc.description,
            status: (bc.status as ComplaintStatus) || 'OPEN',
            createdAt: bc.created_at,
            resolution: bc.resolution_note || bc.rejection_reason || null,
            resolvedAt: bc.resolved_at || (bc.status === 'REJECTED' ? bc.updated_at : null) || null,
          };
        });
        setComplaints(mapped);
      }
    } catch (err) {
      console.error("Failed to load complaints:", err);
    }
  }, []);

  const loadRefunds = useCallback(async () => {
    try {
      const res = await apiGetRefunds({ limit: 100, offset: 0 });

      if (!res || !Array.isArray(res.items)) {
        throw new Error('Invalid refund list response');
      }

      const mapped: Refund[] = res.items.map((refund) => ({
        id: String(refund.refund_id),
        payment_id: '',
        order_id: String(refund.order_id),
        order_short_id: `#ORD-${String(refund.order_id).padStart(4, '0')}`,
        customer_name: 'Customer',
        amount: Number(refund.amount),
        reason: refund.reason || 'Refund request',
        status: refund.status,
        refund_reference: refund.execution_reference || '',
        payment_method: refund.destination_method || '',
        original_amount: 0,
        refund_type: 'PARTIAL',
        created_at: refund.created_at,
        updated_at: refund.updated_at,
        completed_at: refund.completed_at,
        failed_reason: refund.failure_reason || undefined,
        complaint_id: refund.complaint_id,
        complaintId: refund.complaint_id
          ? String(refund.complaint_id)
          : null,
      }));

      setRefunds(mapped);
    } catch (err) {
      console.error('Failed to load refunds:', err);
      throw err;
    }
  }, []);

  // Load unread notification count from backend
  const loadUnreadNotificationCount = useCallback(async () => {
    try {
      const res = await apiGetUnreadNotificationCount();
      if (typeof res?.unread_count === 'number') {
        setUnreadNotificationCount(res.unread_count);
      }
    } catch (err) {
      console.warn('Failed to load unread notification count:', err);
    }
  }, []);

  // Update order status with backend API call and state refresh
  const updateOrderStatus = useCallback(async (id: string, status: Order['status']) => {
    const actionApiMap: Partial<Record<Order['status'], (orderId: string | number) => Promise<any>>> = {
      ACCEPTED: apiAcceptOrder,
      REJECTED: apiRejectOrder,
      PREPARING: apiPreparingOrder,
      READY_FOR_PICKUP: apiReadyOrder,
    };

    const apiFn = actionApiMap[status];
    if (apiFn) {
      try {
        await apiFn(id);
        // Refresh both orders and deliveries from the database
        await Promise.all([loadOrders(), loadDeliveries()]);
        return;
      } catch (err) {
        console.error(`Failed to update order ${id} to ${status}:`, err);
        throw err;
      }
    }

    // Fallback for statuses without a dedicated backend action endpoint
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const labelMap: Record<Order['status'], string> = {
          PLACED: 'Order Placed',
          ACCEPTED: 'Order Accepted',
          PREPARING: 'Preparation Started',
          READY_FOR_PICKUP: 'Ready for Pickup',
          PICKED_UP: 'Picked Up',
          DELIVERED: 'Delivered',
          COMPLETED: 'Completed',
          REJECTED: 'Order Rejected',
          CANCELLED: 'Order Cancelled',
          FAILED: 'Order Failed',
          REFUNDED: 'Order Refunded',
        };
        return {
          ...o,
          status,
          timeline: [...o.timeline, { status, timestamp: new Date().toISOString(), label: labelMap[status] || status }],
        };
      })
    );
  }, [loadOrders, loadDeliveries]);

  // Real-time WebSocket connection listening to OrderListener events from backend
  useEffect(() => {
    if (!isAuthenticated) return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;

    async function connectWs() {
      if (isCancelled) return;

      try {
        const token = await getValidAuthToken();
        if (!token) {
          console.warn("[WS] No valid auth token available, skipping WebSocket connection.");
          return;
        }

        if (isCancelled) return;

        // Connect directly to the FastAPI WebSocket endpoint with auth token query param
        const wsBase = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/api/v1/ws/orders';
        const wsUrl = `${wsBase}${wsBase.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("[WS] Connected to live order & delivery listener");
          loadUnreadNotificationCount();
        };

        socket.onmessage = async (event) => {
          console.log("[WS] Event received from OrderListener:", event.data);
          try {
            const data = JSON.parse(event.data);
            const eventType = data?.event;

            if (eventType === "AVAILABILITY_CHANGED") {
              console.log("[WS] Availability changed:", data);
              await loadAvailability();
              return;
            }

            if (eventType === "COMPLAINT_STATUS_CHANGED") {
              console.log("[WS] Complaint status changed:", data);

              await Promise.all([
                loadComplaints(),
                loadUnreadNotificationCount(),
              ]);
              window.dispatchEvent(new CustomEvent('restaurant:notification_event', { detail: data }));
              return;
            }

            if (eventType === "NEW_ORDER") {
              if (availability && !availability.is_accepting_orders) {
                console.warn("[WS] Suppressed NEW_ORDER while restaurant is offline/paused");
                return;
              }

              const [backendOrder, backendDelivery] = await Promise.all([
                apiGetOrder(data.order_id).catch(() => null),
                apiGetDelivery(data.order_id).catch(() => null),
              ]);

              if (backendOrder) {
                const mappedOrder = mapBackendOrderToFrontend(backendOrder, backendDelivery || undefined);
                setOrders((previousOrders) => [
                  mappedOrder,
                  ...previousOrders.filter((o) => o.id !== mappedOrder.id),
                ]);
                addToast({
                  type: "success",
                  title: "🔔 New Order Received!",
                  message: `Order ${mappedOrder.shortId} has been placed.`,
                });
                setNewOrderCount((prev) => prev + 1);
              }

              // Also refresh deliveries and unread notifications
              await Promise.all([
                loadDeliveries(),
                loadUnreadNotificationCount(),
              ]);
              window.dispatchEvent(new CustomEvent('restaurant:notification_event', { detail: data }));
              return;
            }

            // Delivery events
            const orderId = Number(data.order_id);

            const deliveryEventToastMap: Record<string, { title: string; message: string; type: 'info' | 'success' | 'warning' }> = {
              DELIVERY_PARTNER_ASSIGNED: {
                title: "🚴 Partner Assigned",
                message: `Delivery partner assigned for Order #ORD${String(orderId).padStart(4, '0')}`,
                type: 'info',
              },
              DELIVERY_PARTNER_ACCEPTED: {
                title: "✅ Partner Accepted",
                message: `Delivery partner accepted Order #ORD${String(orderId).padStart(4, '0')}`,
                type: 'info',
              },
              DELIVERY_PARTNER_ARRIVED: {
                title: "📍 Partner Arrived",
                message: `Delivery partner arrived at restaurant for Order #ORD${String(orderId).padStart(4, '0')}`,
                type: 'success',
              },
              ORDER_PICKED_UP: {
                title: "📦 Order Picked Up",
                message: `Order #ORD${String(orderId).padStart(4, '0')} has been picked up`,
                type: 'success',
              },
              DELIVERY_PARTNER_ARRIVED_CUSTOMER: {
                title: "🏠 Arrived at Customer",
                message: `Partner reached customer location for Order #ORD${String(orderId).padStart(4, '0')}`,
                type: 'info',
              },
              ORDER_DELIVERED: {
                title: "🎉 Order Delivered",
                message: `Order #ORD${String(orderId).padStart(4, '0')} delivered successfully!`,
                type: 'success',
              },
              DELIVERY_PARTNER_CANCELLED: {
                title: "⚠️ Partner Cancelled",
                message: `Delivery partner cancelled Order #ORD${String(orderId).padStart(4, '0')}`,
                type: 'warning',
              },
              DELIVERY_PARTNER_REASSIGNED: {
                title: "🔄 Partner Reassigned",
                message: `Order #ORD${String(orderId).padStart(4, '0')} reassigned to new partner`,
                type: 'info',
              },
            };

            const toastCfg = deliveryEventToastMap[eventType];
            if (toastCfg) {
              addToast(toastCfg);
            }

            // Synchronize authoritative state from database for deliveries, orders, and notifications
            await Promise.all([
              loadDeliveries(),
              loadOrders(),
              loadUnreadNotificationCount(),
            ]);
            window.dispatchEvent(new CustomEvent('restaurant:notification_event', { detail: data }));
          } catch (err) {
            console.error("Error processing websocket event:", err);
          }
        };

        socket.onclose = (event) => {
          console.log("[WS] Disconnected:", event.code);
          if (isCancelled) return;
          if (event.code !== 1000) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        socket.onerror = (err) => {
          console.error("[WS] WebSocket error:", err);
        };
      } catch (err) {
        console.error("Failed to establish WebSocket:", err);
        if (!isCancelled) {
          reconnectTimeout = setTimeout(connectWs, 3000);
        }
      }
    }

    connectWs();

    return () => {
      isCancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close(1000);
      }
    };
  }, [isAuthenticated, addToast, loadDeliveries, loadOrders, loadComplaints, loadUnreadNotificationCount]);

  // Silent token refresh using backend /api/v1/auth/refresh
  const refreshToken = useCallback(async () => {
    try {
      await apiRefreshToken();
    } catch {
      // ignore
    }
  }, []);

  // Set registration status helper
  const setRegistrationStatus = useCallback((status: RegistrationStatus) => {
    setStatusState(status);
    setStatusDetails((prev) => ({
      ...prev,
      status,
      application_id: prev?.application_id || 'APP-782941',
      restaurant_name: prev?.restaurant_name || 'Vigo Feast Restaurant',
      rejection_reason:
        status === 'REJECTED'
          ? 'FSSAI certificate expired and business PAN name mismatch. Please re-upload verified documents.'
          : undefined,
    }));
    if (status === 'APPROVED') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('nfd_just_received_approval', 'true');
        try {
          localStorage.removeItem('nfd_approved_banner_dismissed');
        } catch {}
      }
      setIsAuthenticated(true);
      setCurrentPage('dashboard');
    }
  }, []);

  // Step 1: Owner Signup attached to POST /api/v1/auth/register-owner
  const registerOwner = useCallback(
    async (payload: OwnerRegisterRequest) => {
      const res = await apiRegisterOwner(payload);
      const newOwner: OwnerSession = {
        id: res.owner_id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
      };
      setOwner(newOwner);
      setStatusState('NOT_STARTED');
      // Auto-login & route straight into Restaurant Registration Wizard
      setAuthView('wizard');
      addToast({
        type: 'success',
        title: 'Account created!',
        message: 'Welcome! Complete your restaurant registration to start receiving orders.',
      });
    },
    [addToast]
  );

  // Step 2: Login attached to backend /api/v1/auth/me & /api/v1/restaurants/registration/status
  const login = useCallback(
    async (statusOverride?: RegistrationStatus) => {
      // 1. Fetch authenticated owner details from backend
      try {
        const me = await apiGetMe();
        setOwner({
          id: me.id,
          name: me.name,
          email: me.email,
          phone: me.phone || '',
        });
      } catch {
        // ignore if not yet available
      }

      // 2. Fetch real registration application status from backend
      let realStatus: RegistrationStatus = 'NOT_STARTED';
      let realDetails: RegistrationStatusResponse | null = null;
      try {
        realDetails = await apiGetRegistrationStatus();
        realStatus = realDetails.status;
      } catch {
        // if no application found yet
      }

      const effectiveStatus = statusOverride ?? realStatus;

      setStatusState(effectiveStatus);
      setStatusDetails(realDetails || { status: effectiveStatus });

      if (effectiveStatus === 'APPROVED') {
        setIsAuthenticated(true);
        setCurrentPage('dashboard');
        addToast({
          type: 'success',
          title: 'Welcome back!',
          message: 'Logged in to Vigo Feast Partner Dashboard',
        });
      } else if (effectiveStatus === 'NOT_STARTED') {
        setIsAuthenticated(false);
        setAuthView('wizard');
      } else {
        // SUBMITTED, UNDER_REVIEW, or REJECTED
        setIsAuthenticated(false);
        setAuthView('status');
      }
    },
    [addToast]
  );

  // Transition from APPROVED status card to full Dashboard
  const enterDashboard = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nfd_dashboard_entered', 'true');
      sessionStorage.setItem('nfd_just_received_approval', 'true');
    }
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
    addToast({
      type: 'success',
      title: 'Welcome to Vigo Feast Partner!',
      message: 'Your restaurant has been verified.',
    });
  }, [addToast]);

  // Step 3: Logout attached to POST /api/v1/auth/logout
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('nfd_dashboard_entered');
      sessionStorage.removeItem('nfd_access_token');
    }
    setIsAuthenticated(false);
    setOwner(null);
    setStatusState('NOT_STARTED');
    setStatusDetails(null);
    setAuthView('login');
    addToast({
      type: 'info',
      title: 'Logged out',
      message: 'You have been safely signed out.',
    });
  }, [addToast]);

  // Step 4: Submit Registration Wizard attached to POST /api/v1/restaurants/registration/submit
  const submitRegistration = useCallback(
    async (payload: RegistrationSubmitRequest) => {
      const res = await apiSubmitRegistration(payload);

      let realDetails: RegistrationStatusResponse | null = null;
      try {
        realDetails = await apiGetRegistrationStatus();
      } catch {
        // fallback
      }

      setStatusState('SUBMITTED');
      setStatusDetails(
        realDetails || {
          status: 'SUBMITTED',
          application_id: res.application_id,
          restaurant_id: res.restaurant_id,
          restaurant_name: payload.restaurant.name,
          submitted_at: new Date().toISOString(),
        }
      );
      setAuthView('status');
      addToast({
        type: 'success',
        title: 'Registration Submitted',
        message: 'Your restaurant registration was submitted for verification.',
      });
    },
    [addToast]
  );

  const loadAvailability = useCallback(async (): Promise<RestaurantAvailabilityResponse | null> => {
    setIsAvailabilityLoading(true);
    try {
      const data = await apiGetRestaurantAvailability();
      setAvailability(data);
      setIsOnline(data.is_accepting_orders);
      if (data.is_paused) {
        setOfflineUntil(data.paused_until ? new Date(data.paused_until) : null);
        setOfflineReason(data.reason);
      } else {
        setOfflineUntil(null);
        setOfflineReason(data.status === 'OFFLINE' ? data.reason : '');
      }
      return data;
    } catch (err) {
      console.warn('Could not load restaurant availability:', err);
      return null;
    } finally {
      setIsAvailabilityLoading(false);
    }
  }, []);

  const loadOrderSettings = useCallback(async (): Promise<OrderSettingsResponse | null> => {
    setIsOrderSettingsLoading(true);
    try {
      const data = await apiGetOrderSettings();
      setOrderSettings(data);
      void loadAvailability();
      return data;
    } catch (err) {
      console.warn('Could not load order settings:', err);
      return null;
    } finally {
      setIsOrderSettingsLoading(false);
    }
  }, [loadAvailability]);

  const pauseOnlineOrders = useCallback(
    async (payload: PauseOrdersInput): Promise<boolean> => {
      setIsOrderSettingsLoading(true);
      try {
        const data = await apiPauseOrders(payload);
        setOrderSettings(data);
        await loadAvailability();
        addToast({
          type: 'info',
          title: 'Orders Paused',
          message: payload.reason || 'Online ordering is temporarily paused.',
        });
        return true;
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Pause Failed',
          message: err?.message || 'Could not pause orders.',
        });
        return false;
      } finally {
        setIsOrderSettingsLoading(false);
      }
    },
    [addToast, loadAvailability]
  );

  const resumeOnlineOrders = useCallback(async (): Promise<boolean> => {
    setIsOrderSettingsLoading(true);
    try {
      const data = await apiResumeOrders();
      setOrderSettings(data);
      const avail = await loadAvailability();
      const isAccepting = avail?.is_accepting_orders ?? false;
      addToast({
        type: isAccepting ? 'success' : 'info',
        title: isAccepting ? 'Orders Resumed' : 'Pause Lifted',
        message: isAccepting
          ? 'You are now accepting online orders.'
          : 'Pause cleared, but store is currently offline based on schedule.',
      });
      return true;
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Resume Failed',
        message: err?.message || 'Could not resume orders.',
      });
      return false;
    } finally {
      setIsOrderSettingsLoading(false);
    }
  }, [addToast, loadAvailability]);


  const toggleOnline = useCallback(() => {
    if (orderSettings?.is_paused) {
      void resumeOnlineOrders();
    } else {
      // Toggle pause: compute 60 min by default if clicked directly
      const now = new Date();
      const until = new Date(now.getTime() + 60 * 60 * 1000);
      void pauseOnlineOrders({ reason: offlineReason || null, paused_until: until.toISOString() });
    }
  }, [orderSettings, offlineReason, resumeOnlineOrders, pauseOnlineOrders]);

  const goOfflineFor = useCallback(
    (minutes: number) => {
      const now = new Date();
      let paused_until: string;
      if (minutes === 0) {
        // Rest of day in IST
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        const istDateStr = formatter.format(now);
        paused_until = `${istDateStr}T23:59:59+05:30`;
      } else {
        const targetDate = new Date(now.getTime() + minutes * 60 * 1000);
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(targetDate.getTime() + istOffsetMs);
        const pad = (n: number) => String(n).padStart(2, '0');
        const y = istTime.getUTCFullYear();
        const m = pad(istTime.getUTCMonth() + 1);
        const d = pad(istTime.getUTCDate());
        const h = pad(istTime.getUTCHours());
        const min = pad(istTime.getUTCMinutes());
        const s = pad(istTime.getUTCSeconds());
        paused_until = `${y}-${m}-${d}T${h}:${min}:${s}+05:30`;
      }
      void pauseOnlineOrders({ reason: offlineReason || null, paused_until });
    },
    [offlineReason, pauseOnlineOrders]
  );

  const addOrder = useCallback((o: Order) => {
    setOrders((prev) => [o, ...prev]);
  }, []);



  const updateMenuItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const updateMenuItemAvailability = useCallback(async (id: string, availability: ItemAvailability): Promise<MenuItem> => {
    const response = await apiUpdateMenuItemAvailability(id, availability as MenuItemAvailability);
    let updatedItem: MenuItem | undefined;
    setMenuItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      updatedItem = { ...item, availability: (response.availability_status as ItemAvailability) || availability };
      return updatedItem;
    }));
    if (!updatedItem) throw new Error('Menu item not found');
    return updatedItem;
  }, []);

  const reorderCategories = useCallback((newOrder: Category[]) => {
    setCategories(newOrder);
  }, []);

  const addMenuItem = useCallback((item: MenuItem) => {
    setMenuItems((prev) => [item, ...prev]);
  }, []);

  const loadMenuItems = useCallback(async () => {
    try {
      const apiItems = await apiGetMenuItems();
      if (Array.isArray(apiItems)) {
        const catMap = new Map(categories.map((c) => [c.id, c.name]));
        const mappedDb: MenuItem[] = apiItems.map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description || '',
          price: Number(it.base_price),
          category: catMap.get(it.category_id) || 'Uncategorized',
          prepTime: it.preparation_time_minutes,
          availability: (it.availability_status as ItemAvailability) || 'AVAILABLE',
          image: it.image_url || 'placeholder',
          image_url: it.image_url || undefined,
          rating: 5.0,
          totalOrders: 0,
          foodType: (it.food_type as any) || 'VEG',
        }));
        setMenuItems(mappedDb);
      }
    } catch {
      // Keep existing menu items if backend is not reachable yet
    }
  }, [categories]);

  // Fetch categories and items from backend database for the authenticated owner's restaurant
  const loadCategories = useCallback(async () => {
    try {
      const [apiCats, apiItems] = await Promise.all([
        apiGetCategories().catch(() => [] as CategoryResponse[]),
        apiGetMenuItems().catch(() => [] as MenuItemResponse[]),
      ]);

      const catMap = new Map((apiCats || []).map((c) => [c.id, c.name]));
      const mappedDb: MenuItem[] = (apiItems || []).map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description || '',
        price: Number(it.base_price),
        category: catMap.get(it.category_id) || 'Uncategorized',
        prepTime: it.preparation_time_minutes,
        availability: (it.availability_status as ItemAvailability) || 'AVAILABLE',
        image: it.image_url || 'placeholder',
        image_url: it.image_url || undefined,
        rating: 5.0,
        totalOrders: 0,
        foodType: (it.food_type as any) || 'VEG',
      }));

      setCategories(
        (apiCats || []).map((c) => ({
          id: c.id,
          name: c.name,
          visible: c.is_active,
          itemCount: mappedDb.filter(
            (item) => item.category.toLowerCase() === c.name.toLowerCase()
          ).length,
        }))
      );

      setMenuItems(mappedDb);
    } catch {
      // Keep existing categories if database is not reachable yet
    }
  }, []);

  const createMenuItem = useCallback(
    async (payload: MenuItemCreateRequest): Promise<MenuItem> => {
      const res = await apiCreateMenuItem(payload);
      const matchedCategory = categories.find((c) => c.id === res.category_id);
      const newItem: MenuItem = {
        id: res.id,
        name: res.name,
        description: res.description || '',
        price: Number(res.base_price),
        category: matchedCategory?.name || payload.category_name || 'Main Course',
        prepTime: res.preparation_time_minutes,
        availability: (res.availability_status as ItemAvailability) || 'AVAILABLE',
        image: res.image_url || 'placeholder',
        image_url: res.image_url || undefined,
        rating: 5.0,
        totalOrders: 0,
        foodType: (res.food_type as any) || 'VEG',
      };

      setMenuItems((prev) => [newItem, ...prev]);
      return newItem;
    },
    [categories]
  );

  const viewOrder = useCallback((id: string) => {
    setSelectedOrderId(id);
    setCurrentPage('orders');
  }, []);

  const openRefundModal = useCallback((defaults?: RefundModalDefaults) => {
    setRefundModalDefaults(defaults || null);
    setRefundModalOpen(true);
  }, []);

  const closeRefundModal = useCallback(() => {
    setRefundModalOpen(false);
    setRefundModalDefaults(null);
  }, []);

  useEffect(() => {
    const handleComplaintStatusChanged = () => {
      void loadComplaints();
    };

    window.addEventListener(
      "complaint-status-changed",
      handleComplaintStatusChanged
    );

    return () => {
      window.removeEventListener(
        "complaint-status-changed",
        handleComplaintStatusChanged
      );
    };
  }, [loadComplaints]);

  const updateComplaint = useCallback(
    async (id: string, updates: Partial<Complaint>) => {
      // Optimistically update local state
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );

      try {
        if (updates.status && ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'].includes(updates.status)) {
          await apiUpdateComplaintStatus(id, {
            status: updates.status as 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED',
            note: updates.resolution || undefined,
          });
          await loadComplaints();
        }
      } catch (err) {
        console.error(`Failed to update complaint ${id}:`, err);
        await loadComplaints();
        throw err;
      }
    },
    [loadComplaints]
  );

  const addNotification = useCallback(
    (n: { type: string; title: string; message: string }) => {
      setUnreadNotificationCount((p) => p + 1);
      addToast({ type: 'info', title: n.title, message: n.message });
    },
    [addToast]
  );

  const createRefund = useCallback(
    async ({
      amount,
      reason,
      reasonNote,
      complaintId,
    }: {
      orderId: string;
      amount: number;
      reason: string;
      reasonNote?: string;
      refundType: 'FULL' | 'PARTIAL';
      complaintId?: string;
      complaintResolution?: string;
    }) => {
      if (!complaintId) {
        throw new Error('A resolved complaint ID is required to create a refund.');
      }
      const combinedReason = [reason.trim(), reasonNote?.trim()]
        .filter(Boolean)
        .join(' — ')
        .slice(0, 255);

      const res = await apiCreateComplaintRefund(Number(complaintId), {
        amount,
        reason: combinedReason,
        destination_method: 'ORIGINAL_PAYMENT_METHOD',
        idempotency_key: crypto.randomUUID(),
      });

      await loadRefunds();
      return res;
    },
    [loadRefunds]
  );

  const retryRefund = useCallback(
    (_refundId: string) => {
      addToast({
        type: 'warning',
        title: 'Retry Unavailable',
        message: 'Refund execution integration is not available. Real payment gateway re-execution cannot be triggered.',
      });
    },
    [addToast]
  );

  const viewRefund = useCallback((refundId: string) => {
    setSelectedRefundId(refundId);
    setCurrentPage('refunds');
  }, []);

  const viewComplaint = useCallback((complaintId: string) => {
    setHighlightedComplaintId(complaintId);
    setCurrentPage('reviews');
  }, []);

  // Computed totals for statistics
  const completedRefundsTotal = useMemo(
    () =>
      refunds
        .filter((r) => r.status === 'COMPLETED')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [refunds]
  );

  const pendingRefundsCount = useMemo(
    () => refunds.filter((r) => r.status === 'PENDING').length,
    [refunds]
  );

  const failedRefundsCount = useMemo(
    () => refunds.filter((r) => r.status === 'FAILED').length,
    [refunds]
  );

  useEffect(() => {
    if (isAuthenticated) {
      void loadCategories();
      void loadOrders();
      void loadDeliveries();
      void loadComplaints();
      void loadRefunds();
      void loadOrderSettings();
      void loadAvailability();
    }
  }, [
    isAuthenticated,
    loadCategories,
    loadOrders,
    loadDeliveries,
    loadComplaints,
    loadRefunds,
    loadOrderSettings,
    loadAvailability,
  ]);

  // Boundary timer: automatically refetch when next_change_at boundary occurs
  useEffect(() => {
    if (!availability?.next_change_at) return;
    const changeTime = new Date(availability.next_change_at).getTime();
    const delay = changeTime - Date.now() + 1000; // 1s buffer
    if (delay <= 0) {
      void loadAvailability();
      return;
    }
    if (delay < 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        void loadAvailability();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [availability?.next_change_at, loadAvailability]);

  // Periodic poll fallback every 60 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      void loadAvailability();
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadAvailability]);

  // Refresh on window focus
  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () => {
      void loadAvailability();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated, loadAvailability]);


  const addCategory = useCallback(
    async (name: string, visible: boolean = true): Promise<Category> => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error('Category name cannot be empty');
      }

      // POST /menu/categories sends ONLY { "name": trimmed } - backend derives restaurant from session
      const res = await apiCreateCategory({ name: trimmed });
      const newCat: Category = {
        id: res.id,
        name: res.name,
        visible: res.is_active,
        itemCount: 0,
      };

      setCategories((prev) => {
        const exists = prev.some(
          (c) => c.id === newCat.id || c.name.toLowerCase() === newCat.name.toLowerCase()
        );
        if (exists) return prev;
        return [...prev, newCat];
      });

      return newCat;
    },
    []
  );

  const toggleCategoryVisible = useCallback((id: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }, []);

  const toggleDarkMode = useCallback(() => setDarkMode((p) => !p), []);
  const toggleSound = useCallback(() => setSoundEnabled((p) => !p), []);
  const clearNewOrderCount = useCallback(() => setNewOrderCount(0), []);

  const setPage = useCallback((p: Page) => {
    setCurrentPage(p);
    if (p === 'orders') setNewOrderCount(0);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setPage,
        isAuthenticated,
        isAuthLoading,
        authView,
        setAuthView,
        owner,
        registrationStatus,
        statusDetails,
        setRegistrationStatus,
        login,
        enterDashboard,
        logout,
        registerOwner,
        submitRegistration,
        refreshToken,
        isOnline,
        toggleOnline,
        goOfflineFor,
        offlineUntil,
        offlineReason,
        setOfflineReason,
        orderSettings,
        isOrderSettingsLoading,
        loadOrderSettings,
        availability,
        isAvailabilityLoading,
        loadAvailability,
        pauseOnlineOrders,
        resumeOnlineOrders,
        settingsInitialTab,
        setSettingsInitialTab,
        darkMode,
        toggleDarkMode,
        orders,
        loadOrders,
        deliveries,
        loadDeliveries,
        addOrder,
        updateOrderStatus,
        selectedOrderId,
        setSelectedOrderId,
        viewOrder,
        menuItems,
        updateMenuItem,
        updateMenuItemAvailability,
        addMenuItem,
        createMenuItem,
        loadMenuItems,
        categories,
        loadCategories,
        reorderCategories,
        addCategory,
        toggleCategoryVisible,
        toasts,
        addToast,
        removeToast,
        soundEnabled,
        toggleSound,
        newOrderCount,
        clearNewOrderCount,
        unreadNotificationCount,
        setUnreadNotificationCount,
        loadUnreadNotificationCount,
        addNotification,
        // Shared Refunds & Complaints State
        refunds,
        setRefunds,
        complaints,
        setComplaints,
        loadComplaints,
        loadRefunds,
        selectedRefundId,
        setSelectedRefundId,
        refundModalOpen,
        refundModalDefaults,
        openRefundModal,
        closeRefundModal,
        createRefund,
        retryRefund,
        viewRefund,
        viewComplaint,
        highlightedComplaintId,
        setHighlightedComplaintId,
        updateComplaint,
        completedRefundsTotal,
        pendingRefundsCount,
        failedRefundsCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
