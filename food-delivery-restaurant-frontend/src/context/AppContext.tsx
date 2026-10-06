'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order, MenuItem, Category, ItemAvailability } from '@/data/mockData';
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
  apiAcceptOrder,
  apiRejectOrder,
  apiPreparingOrder,
  apiReadyOrder,
  mapBackendOrderToFrontend,
  apiGetDeliveries,
  mapBackendDeliveryToFrontend,
} from '@/services/api';

export type Page = 'dashboard' | 'orders' | 'menu' | 'delivery' | 'earnings' | 'analytics' | 'offers' | 'reviews' | 'notifications' | 'settings';
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
  addNotification: (n: { type: string; title: string; message: string }) => void;
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
  const [darkMode, setDarkMode] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(4);

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

  // Update order status (with API call or local fallback)
  const updateOrderStatus = useCallback(async (id: string, status: Order['status']) => {
    // Map frontend action to backend API call
    const actionApiMap: Partial<Record<Order['status'], (orderId: string | number) => Promise<any>>> = {
      ACCEPTED: apiAcceptOrder,
      REJECTED: apiRejectOrder,
      PREPARING: apiPreparingOrder,
      READY_FOR_PICKUP: apiReadyOrder,
    };

    const apiFn = actionApiMap[status];
    if (apiFn) {
      try {
        const backendOrder = await apiFn(id);
        const mapped = mapBackendOrderToFrontend(backendOrder);
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? mapped : o))
        );
        return;
      } catch (err) {
        console.error(`Failed to update order ${id} to ${status}:`, err);
        throw err;
      }
    }

    // Fallback for statuses without a backend API yet (local-only update)
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
          timeline: [...o.timeline, { status, timestamp: new Date().toISOString(), label: labelMap[status] }],
        };
      })
    );
  }, []);

  // Real-time WebSocket connection for live orders and deliveries
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

        // Use the same origin as REST by default. This lets the browser send the
        // HttpOnly authentication cookie through Next's /api rewrite. When an
        // external API URL is configured, fall back to the short-lived token
        // because browsers cannot attach custom headers to WebSocket handshakes.
        const apiUrl = new URL(API_BASE_URL || window.location.origin, window.location.origin);
        apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        apiUrl.pathname = '/api/v1/ws/orders';
        apiUrl.search = apiUrl.origin === window.location.origin
          ? ''
          : `?token=${encodeURIComponent(token)}`;
        socket = new WebSocket(apiUrl.toString());

        socket.onopen = () => {
          console.log("CONNECTED");
        };

        socket.onmessage = async (event) => {
          console.log("MESSAGE:", event.data);
          try {
            const data = JSON.parse(event.data);
            const eventType = data?.event;

            if (eventType === "NEW_ORDER") {
              const backendOrder = await apiGetOrder(data.order_id);
              const mappedOrder = mapBackendOrderToFrontend(backendOrder);
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

              // Also refresh deliveries so the new order appears under WAITING_FOR_PARTNER
              loadDeliveries();
              return;
            }

            // Delivery events
            const orderId = Number(data.order_id);
            const assignmentId = data.assignment_id;
            const status = data.status;

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

            // Map WebSocket event to frontend stage
            let nextStage: DeliveryStage | null = null;
            if (
              eventType === "DELIVERY_PARTNER_ASSIGNED" ||
              eventType === "DELIVERY_PARTNER_ACCEPTED" ||
              eventType === "DELIVERY_PARTNER_REASSIGNED"
            ) {
              nextStage = "ASSIGNED";
            } else if (eventType === "DELIVERY_PARTNER_ARRIVED") {
              nextStage = "ARRIVED";
            } else if (eventType === "ORDER_PICKED_UP") {
              nextStage = "PICKED_UP";
            } else if (eventType === "DELIVERY_PARTNER_ARRIVED_CUSTOMER") {
              nextStage = "IN_TRANSIT";
            } else if (eventType === "ORDER_DELIVERED") {
              nextStage = "DELIVERED";
            } else if (eventType === "DELIVERY_PARTNER_CANCELLED") {
              nextStage = "WAITING_FOR_PARTNER";
            }

            if (nextStage) {
              setDeliveries((prev) =>
                prev.map((delivery) => {
                  const sameOrder =
                    String(delivery.orderId) === String(orderId);

                  const sameAssignment =
                    assignmentId &&
                    String(delivery.assignmentId) === String(assignmentId);

                  if (!sameOrder && !sameAssignment) {
                    return delivery;
                  }

                  return {
                    ...delivery,
                    stage: nextStage,
                    ...(status ? { assignmentStatus: status } : {}),
                    ...(assignmentId
                      ? { assignmentId: Number(assignmentId) }
                      : {}),
                    ...(nextStage === "DELIVERED"
                      ? { etaMinutes: 0 }
                      : {}),
                  };
                })
              );

              // Keep Orders page synchronized
              if (eventType === "ORDER_PICKED_UP") {
                setOrders((prev) =>
                  prev.map((order) =>
                    String(order.id) === String(orderId)
                      ? { ...order, status: "PICKED_UP" }
                      : order
                  )
                );
              }

              if (eventType === "ORDER_DELIVERED") {
                setOrders((prev) =>
                  prev.map((order) =>
                    String(order.id) === String(orderId)
                      ? { ...order, status: "DELIVERED" }
                      : order
                  )
                );
              }
            }
          } catch (err) {
            console.error("Error processing websocket order:", err);
          }
        };

        socket.onclose = (event) => {
          console.log("CLOSED:", event.code);
          if (isCancelled) return;
          if (event.code !== 1000) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        socket.onerror = (err) => {
          console.error("WebSocket error:", err);
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
  }, [isAuthenticated, addToast, loadDeliveries, updateOrderStatus]);

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
      restaurant_name: prev?.restaurant_name || 'Narayani Kitchen',
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
          message: 'Logged in to Narayani Partner Dashboard',
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
      title: 'Welcome to Narayani Partner!',
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

  const toggleOnline = useCallback(() => {
    setIsOnline((prev) => {
      const next = !prev;
      if (next) {
        setOfflineUntil(null);
        setOfflineReason('');
        addToast({ type: 'success', title: "You're online", message: 'Receiving new orders' });
      } else {
        addToast({ type: 'info', title: "You're offline", message: 'Not receiving new orders' });
      }
      return next;
    });
  }, [addToast]);

  const goOfflineFor = useCallback(
    (minutes: number) => {
      setIsOnline(false);
      if (minutes > 0) {
        const until = new Date(Date.now() + minutes * 60000);
        setOfflineUntil(until);
        addToast({
          type: 'info',
          title: `Offline for ${minutes < 60 ? minutes + 'm' : minutes / 60 + 'h'}`,
          message: 'Auto-resuming later',
        });
      } else {
        setOfflineUntil(null);
        addToast({ type: 'info', title: 'Offline for rest of day', message: 'Resumes tomorrow' });
      }
    },
    [addToast]
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

  const loadOrders = useCallback(async () => {
    try {
      const res = await apiGetOrders();
      if (res && Array.isArray(res.orders)) {
        const mappedDb = res.orders.map(mapBackendOrderToFrontend);
        setOrders(mappedDb);
        const newCount = mappedDb.filter((o) => o.status === 'PLACED').length;
        setNewOrderCount(newCount);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
      loadOrders();
      loadDeliveries();
    }
  }, [isAuthenticated, loadCategories, loadOrders, loadDeliveries]);

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
  const addNotification = useCallback(
    (n: { type: string; title: string; message: string }) => {
      setUnreadNotificationCount((p) => p + 1);
      addToast({ type: 'info', title: n.title, message: n.message });
    },
    [addToast]
  );

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
        addNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
