import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Delivery, DeliveryStage, deliveryStageOrder, deliveryStageConfig } from '@/types/delivery';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  X, Clock, MapPin, Phone, Star, Bike, Navigation, ArrowRight,
  AlertTriangle, RefreshCw, Truck, CheckCircle2, ChevronRight, Package,
} from 'lucide-react';

const stageTabs: { id: DeliveryStage | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Active' },
  { id: 'WAITING_FOR_PARTNER', label: 'Waiting' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'ARRIVING', label: 'Heading Here' },
  { id: 'ARRIVED', label: 'Arrived' },
  { id: 'PICKED_UP', label: 'Picked Up' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export function DeliveryPage() {
  const { deliveries, loadDeliveries, addToast, isOnline } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DeliveryStage | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDeliveries().finally(() => setLoading(false));
  }, [loadDeliveries]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDeliveries();
    setTimeout(() => setIsRefreshing(false), 400);
    addToast({
      type: 'info',
      title: 'Deliveries Refreshed',
      message: 'Latest delivery states loaded from database.',
    });
  };

  const filteredDeliveries = useMemo(() => {
    if (activeTab === 'ALL') {
      return deliveries.filter((d) => d.stage !== 'DELIVERED');
    }
    return deliveries.filter((d) => d.stage === activeTab);
  }, [deliveries, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: deliveries.filter((d) => d.stage !== 'DELIVERED').length,
    };
    deliveryStageOrder.forEach((s) => {
      counts[s] = deliveries.filter((d) => d.stage === s).length;
    });
    return counts;
  }, [deliveries]);

  const selectedDelivery = deliveries.find((d) => d.id === selectedId) ?? null;

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Header bar with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Delivery</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Live delivery partner tracking & order dispatch</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stage tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {stageTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {(tabCounts[tab.id] || 0) > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-white/20 dark:bg-gray-900/20'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Deliveries list */}
        <div className="lg:col-span-2 space-y-3">
          {filteredDeliveries.length === 0 ? (
            <div className="card p-12 text-center">
              <Truck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">No deliveries in this stage</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                When new orders are accepted and assigned, they will update here in real time.
              </p>
            </div>
          ) : (
            filteredDeliveries.map((delivery, i) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                index={i}
                onClick={() => setSelectedId(delivery.id)}
              />
            ))
          )}
        </div>

        {/* Live Delivery Overview Panel */}
        <div className="space-y-4">
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-brand-500" />
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Delivery Pipeline</h3>
              <span className="badge px-2 py-0.5 text-[10px] bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 ml-auto">
                {deliveries.length} Total
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Active Deliveries</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{tabCounts.ALL || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Waiting Partner</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{tabCounts.WAITING_FOR_PARTNER || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Arrived at Rest.</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{tabCounts.ARRIVED || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Delivered</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{tabCounts.DELIVERED || 0}</p>
              </div>
            </div>

            {/* Waiting for partner notice */}
            {(tabCounts.WAITING_FOR_PARTNER || 0) > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/30 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    {tabCounts.WAITING_FOR_PARTNER} order(s) waiting for rider assignment
                  </p>
                  <p className="text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Orders will update automatically as soon as a delivery partner accepts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      {selectedDelivery && (
        <DeliveryDrawer
          delivery={selectedDelivery}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function DeliveryCard({ delivery, index, onClick }: { delivery: Delivery; index: number; onClick: () => void }) {
  const cfg = deliveryStageConfig[delivery.stage] || deliveryStageConfig.WAITING_FOR_PARTNER;
  const itemsText = delivery.order.items.map((it) => `${it.quantity}x ${it.name || 'Item name unavailable'}`).join(', ');

  return (
    <div
      onClick={onClick}
      className="card p-4 cursor-pointer hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5 animate-slide-up group"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">{delivery.shortId}</p>
            <span className={`badge px-2 py-0.5 text-[10px] ${cfg.bg} ${cfg.text} transition-all duration-300`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${delivery.stage === 'WAITING_FOR_PARTNER' ? 'animate-pulse' : ''}`} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {delivery.orderShortId} • {delivery.customerName}
            {delivery.customerPhone ? ` • ${delivery.customerPhone}` : ''}
          </p>
        </div>
        <div className="text-right">
          {Number.isFinite(delivery.order.total) ? (
            <p className="text-sm font-bold text-gray-900 dark:text-white">₹{delivery.order.total}</p>
          ) : null}
          {delivery.etaMinutes !== undefined && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{delivery.etaMinutes}m ETA</p>
          )}
        </div>
      </div>

      {/* Order items summary if available */}
      {itemsText && (
        <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-gray-100/60 dark:bg-gray-800/40 text-[11px] text-gray-600 dark:text-gray-400 truncate">
          <span className="font-medium text-gray-700 dark:text-gray-300">Items: </span>
          {itemsText}
        </div>
      )}

      {/* Partner info */}
      {delivery.partner ? (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(delivery.partner.name || '?').split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{delivery.partner.name || 'Partner details unavailable'}</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
              {delivery.partner.rating !== undefined && <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {delivery.partner.rating}
              </span>}
              {delivery.partner.vehicleType && <span className="flex items-center gap-0.5">
                <Bike className="w-3 h-3" />
                {delivery.partner.vehicleType}
              </span>}
              {delivery.partner.vehicleNumber && <span>{delivery.partner.vehicleNumber}</span>}
            </div>
          </div>
          {delivery.partner.phone && (
            <a
              href={`tel:${delivery.partner.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="btn-ghost p-2 shrink-0 text-emerald-600 dark:text-emerald-400"
              title={`Call ${delivery.partner.phone}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Searching for nearby delivery partners...</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3 text-[10px] text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{delivery.address || 'Address not available'}</span>
        </span>
        {delivery.assignmentStatus && (
          <span className="shrink-0 font-medium text-gray-500 dark:text-gray-400">
            Status: {delivery.assignmentStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function DeliveryDrawer({ delivery, onClose }: { delivery: Delivery; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const stageIndex = deliveryStageOrder.indexOf(delivery.stage);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] bg-gray-50 dark:bg-gray-950 shadow-2xl animate-slide-in-right flex flex-col max-h-screen">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-ghost p-2 -ml-2">
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-gray-900 dark:text-white">{delivery.shortId}</h2>
                <span className={`badge px-2 py-0.5 text-[10px] ${deliveryStageConfig[delivery.stage]?.bg} ${deliveryStageConfig[delivery.stage]?.text}`}>
                  {deliveryStageConfig[delivery.stage]?.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{delivery.orderShortId} • {delivery.customerName}</p>
            </div>
          </div>
          {delivery.etaMinutes !== undefined && (
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{delivery.etaMinutes}m</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">ETA</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Order Details */}
          {delivery.order && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">ORDER SUMMARY</h3>
                <span className="text-xs font-bold text-gray-900 dark:text-white">₹{delivery.order.total}</span>
              </div>
              <div className="space-y-1.5">
                {delivery.order.items?.map((it) => (
                  <div key={it.id} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                    <span>{it.quantity}x {it.name || 'Item name unavailable'}</span>
                    <span>₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline stepper */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">DELIVERY TRACKER</h3>
            <div className="space-y-0">
              {deliveryStageOrder.map((stage, i) => {
                const isDone = i < stageIndex;
                const isCurrent = i === stageIndex;
                const isLast = i === deliveryStageOrder.length - 1;
                const cfg = deliveryStageConfig[stage];
                const stepData = delivery.timeline?.find((t) => t.stage === stage);
                return (
                  <div key={stage} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isDone || isCurrent ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      {!isLast && <div className={`w-0.5 h-8 ${isDone ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-800'}`} />}
                    </div>
                    <div className="pt-1.5 pb-6">
                      <p className={`text-sm font-medium ${isDone || isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
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
          </div>

          {/* Partner card */}
          {delivery.partner ? (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">DELIVERY PARTNER</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(delivery.partner.name || '?').split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{delivery.partner.name || 'Partner details unavailable'}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {delivery.partner.rating !== undefined && <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {delivery.partner.rating}
                    </span>}
                    {delivery.partner.vehicleType && <span className="flex items-center gap-0.5">
                      <Bike className="w-3 h-3" />
                      {delivery.partner.vehicleType}
                    </span>}
                  </div>
                  {delivery.partner.vehicleNumber && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{delivery.partner.vehicleNumber}</p>
                  )}
                </div>
                {delivery.partner.phone && (
                  <a
                    href={`tel:${delivery.partner.phone}`}
                    className="btn-secondary p-2.5 text-emerald-600 dark:text-emerald-400"
                    title={`Call ${delivery.partner.phone}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">DELIVERY PARTNER</h3>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <Navigation className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Waiting for delivery partner assignment...
                </p>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">CUSTOMER & DELIVERY ADDRESS</h3>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
              <div>
                {delivery.customerName && <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{delivery.customerName}</p>}
                {delivery.customerPhone && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{delivery.customerPhone}</p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{delivery.address || 'Address not available'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shrink-0 text-center text-sm text-gray-400 dark:text-gray-500">
          {delivery.stage === 'DELIVERED'
            ? 'Delivery completed'
            : delivery.stage === 'WAITING_FOR_PARTNER'
            ? 'Waiting for partner assignment...'
            : 'In progress — updates live via WebSocket'}
        </div>
      </div>
    </div>
  );
}
