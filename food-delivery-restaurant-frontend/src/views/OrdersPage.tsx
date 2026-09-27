import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Order, OrderStatus, OrderTab } from '@/data/mockData';
import { StatusChip, getStatusConfig } from '@/components/ui/StatusChip';
import {
  X, Clock, MapPin, Phone, CreditCard, Bike, CheckCircle2, XCircle,
  ChefHat, PackageCheck, Star, IndianRupee, Timer,
  RefreshCw,
} from 'lucide-react';

const tabConfig: { id: OrderTab; label: string; statuses: OrderStatus[] }[] = [
  { id: 'NEW', label: 'New', statuses: ['PLACED'] },
  { id: 'ACCEPTED', label: 'Accepted', statuses: ['ACCEPTED'] },
  { id: 'PREPARING', label: 'Preparing', statuses: ['PREPARING'] },
  { id: 'READY', label: 'Ready', statuses: ['READY_FOR_PICKUP'] },
  { id: 'PICKED_UP', label: 'Picked Up', statuses: ['PICKED_UP'] },
  { id: 'COMPLETED', label: 'Completed', statuses: ['DELIVERED', 'COMPLETED'] },
  { id: 'REJECTED', label: 'Rejected', statuses: ['REJECTED'] },
  { id: 'CANCELLED', label: 'Cancelled', statuses: ['CANCELLED', 'FAILED', 'REFUNDED'] },
];

export function OrdersPage() {
  const { orders, loadOrders, selectedOrderId, setSelectedOrderId, updateOrderStatus, addToast } = useApp();
  const [activeTab, setActiveTab] = useState<OrderTab>('NEW');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const filteredOrders = useMemo(() => {
    const tab = tabConfig.find(t => t.id === activeTab)!;
    return orders.filter(o => tab.statuses.includes(o.status));
  }, [orders, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tabConfig.forEach(t => {
      counts[t.id] = orders.filter(o => t.statuses.includes(o.status)).length;
    });
    return counts;
  }, [orders]);

  const selectedOrder = orders.find(o => o.id === selectedOrderId) ?? null;

  const handleAction = async (order: Order, action: 'accept' | 'reject' | 'prepare' | 'ready') => {
    const actionMap = {
      accept: { status: 'ACCEPTED' as OrderStatus, label: 'Order accepted', type: 'success' as const },
      reject: { status: 'REJECTED' as OrderStatus, label: 'Order rejected', type: 'error' as const },
      prepare: { status: 'PREPARING' as OrderStatus, label: 'Preparation started', type: 'info' as const },
      ready: { status: 'READY_FOR_PICKUP' as OrderStatus, label: 'Order marked ready', type: 'success' as const },
    };
    const cfg = actionMap[action];
    try {
      await updateOrderStatus(order.id, cfg.status);
      addToast({ type: cfg.type, title: cfg.label, message: order.shortId });
    } catch {
      addToast({ type: 'error', title: 'Action failed', message: `Could not ${action} order ${order.shortId}` });
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-thin">
          {tabConfig.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id
                  ? 'bg-white/20 dark:bg-gray-900/20'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          className="btn-ghost p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white shrink-0 transition-colors"
          title="Refresh orders from server"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} />
        </button>
      </div>

      {/* Orders grid */}
      {filteredOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <PackageCheck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No orders in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredOrders.map((order, i) => (
            <OrderCard
              key={order.id}
              order={order}
              index={i}
              onClick={() => setSelectedOrderId(order.id)}
              onAction={(a) => handleAction(order, a)}
            />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onAction={(a) => handleAction(selectedOrder, a)}
        />
      )}
    </div>
  );
}

function OrderCard({ order, index, onClick, onAction }: {
  order: Order;
  index: number;
  onClick: () => void;
  onAction: (a: 'accept' | 'reject' | 'prepare' | 'ready' | 'pickup') => void;
}) {
  const minsAgo = Math.round((Date.now() - new Date(order.placedAt).getTime()) / 60000);

  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5 animate-slide-up group"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{order.shortId}</p>
            <StatusChip status={order.status} size="xs" />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{order.customerName}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-base text-gray-900 dark:text-white">₹{order.total}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{minsAgo}m ago</p>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.slice(0, 2).map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-gray-200">{item.quantity}x</span>
            <span className="truncate">{item.name}{item.variant ? ` (${item.variant})` : ''}</span>
          </div>
        ))}
        {order.items.length > 2 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">+{order.items.length - 2} more items</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`badge px-2 py-0.5 text-[10px] ${
          order.paymentStatus === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : order.paymentStatus === 'COD' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}>
          {order.paymentStatus === 'PAID' ? 'Paid' : order.paymentStatus === 'COD' ? 'COD' : 'Pending'}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
          <Clock className="w-3 h-3" />
          {order.prepTime} min
        </span>
        {order.deliveryAddress && (
          <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{order.deliveryAddress.split(',')[0]}</span>
          </span>
        )}
      </div>

      {/* Quick actions */}
      {(order.status === 'PLACED' || order.status === 'ACCEPTED' || order.status === 'PREPARING' || order.status === 'READY_FOR_PICKUP') && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
          {order.status === 'PLACED' && (
            <>
              <button onClick={() => onAction('accept')} className="btn-success flex-1 text-xs py-2">
                <CheckCircle2 className="w-4 h-4" /> Accept
              </button>
              <button onClick={() => onAction('reject')} className="btn-danger text-xs py-2 px-3">
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {order.status === 'ACCEPTED' && (
            <button onClick={() => onAction('prepare')} className="btn-primary flex-1 text-xs py-2">
              <ChefHat className="w-4 h-4" /> Start Preparing
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button onClick={() => onAction('ready')} className="btn-success flex-1 text-xs py-2">
              <PackageCheck className="w-4 h-4" /> Ready for pickup
            </button>
          )}
          {order.status === 'READY_FOR_PICKUP' && (
            <button onClick={() => onAction('ready')} className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5">
              <PackageCheck className="w-4 h-4" /> Ready for pickup
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OrderDrawer({ order, onClose, onAction }: {
  order: Order;
  onClose: () => void;
  onAction: (a: 'accept' | 'reject' | 'prepare' | 'ready') => void;
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const lifecycleSteps: OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DELIVERED', 'COMPLETED'];
  const currentStepIndex = lifecycleSteps.indexOf(order.status);
  const isException = ['REJECTED', 'CANCELLED', 'FAILED', 'REFUNDED'].includes(order.status);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] bg-gray-50 dark:bg-gray-950 shadow-2xl animate-slide-in-right flex flex-col max-h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-ghost p-2 -ml-2">
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-gray-900 dark:text-white">{order.shortId}</h2>
                <StatusChip status={order.status} size="xs" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{order.customerName} • {order.customerPhone}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900 dark:text-white">₹{order.total}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{order.paymentMethod}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status timeline */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">ORDER TIMELINE</h3>
            {isException ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">{getStatusConfig(order.status).label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{order.timeline[order.timeline.length - 1]?.label}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {lifecycleSteps.map((step, i) => {
                  const stepData = order.timeline.find(t => t.status === step);
                  const isDone = i <= currentStepIndex;
                  const isCurrent = i === currentStepIndex;
                  const isLast = i === lifecycleSteps.length - 1;
                  const cfg = getStatusConfig(step);
                  return (
                    <div key={step} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isDone ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}>
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 h-8 ${isDone ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'}`} />
                        )}
                      </div>
                      <div className="pt-1.5 pb-6">
                        <p className={`text-sm font-medium ${isDone ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                          {cfg.label}
                        </p>
                        {stepData && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(stepData.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">ORDER ITEMS</h3>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{item.quantity}x</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    {item.variant && <p className="text-xs text-gray-400 dark:text-gray-500">Variant: {item.variant}</p>}
                    {item.addOns && item.addOns.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Add-ons: {item.addOns.join(', ')}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">Note: {item.notes}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            {/* Pricing breakdown */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Subtotal</span><span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Taxes (5%)</span><span>₹{order.taxes}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Delivery Fee</span><span>₹{order.deliveryFee}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Packaging Fee</span><span>₹{order.packagingFee}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Discount</span><span>-₹{order.discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
                <span>Total</span><span>₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              order.paymentStatus === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'
            }`}>
              <CreditCard className={`w-5 h-5 ${order.paymentStatus === 'PAID' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{order.paymentMethod}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {order.paymentStatus === 'PAID' ? 'Payment received' : order.paymentStatus === 'COD' ? 'Cash on delivery' : 'Payment pending'}
              </p>
            </div>
            <span className={`badge ${order.paymentStatus === 'PAID' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
              {order.paymentStatus}
            </span>
          </div>

          {/* Delivery address */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">DELIVERY ADDRESS</h3>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{order.deliveryAddress}</p>
            </div>
          </div>

          {/* Delivery partner */}
          {order.deliveryPartner && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">DELIVERY PARTNER</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {order.deliveryPartner.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.deliveryPartner.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{order.deliveryPartner.vehicle}</p>
                </div>
                <button className="btn-secondary p-2">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Rating */}
          {order.rating && (
            <div className="card p-4 flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < order.rating! ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer rated this order</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shrink-0">
          {order.status === 'PLACED' && (
            <div className="flex gap-2">
              <button onClick={() => onAction('accept')} className="btn-success flex-1">
                <CheckCircle2 className="w-5 h-5" /> Accept Order
              </button>
              <button onClick={() => onAction('reject')} className="btn-danger px-4">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
          {order.status === 'ACCEPTED' && (
            <button onClick={() => onAction('prepare')} className="btn-primary w-full">
              <ChefHat className="w-5 h-5" /> Start Preparing
            </button>
          )}
          {order.status === 'PREPARING' && (
            <button onClick={() => onAction('ready')} className="btn-success w-full flex items-center justify-center gap-2">
              <PackageCheck className="w-5 h-5" /> Ready for pickup
            </button>
          )}
          {order.status === 'READY_FOR_PICKUP' && (
            <button onClick={() => onAction('ready')} className="btn-primary w-full flex items-center justify-center gap-2">
              <PackageCheck className="w-5 h-5" /> Ready for pickup
            </button>
          )}
          {['PICKED_UP', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED', 'REFUNDED'].includes(order.status) && (
            <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
              No further actions available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
