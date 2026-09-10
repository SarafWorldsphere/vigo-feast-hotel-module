import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Delivery, DeliveryStage, deliveryStageOrder, deliveryStageConfig,
  generateDelivery, generateDeliveries, mockDeliveryExceptions, deliveryExceptionConfig, DeliveryExceptionType,
} from '@/data/mockData';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  X, Clock, MapPin, Phone, Star, Bike, Navigation, QrCode, ArrowRight,
  AlertTriangle, RefreshCw, UserX, MapPinOff, Truck, CheckCircle2, ChevronDown,
} from 'lucide-react';

const stageTabs: { id: DeliveryStage | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Active' },
  { id: 'WAITING_FOR_PARTNER', label: 'Waiting' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'ARRIVING', label: 'Arriving' },
  { id: 'ARRIVED', label: 'Arrived' },
  { id: 'PICKUP_VERIFICATION', label: 'Pickup Verify' },
  { id: 'HANDOVER', label: 'Handover' },
  { id: 'PICKED_UP', label: 'Picked Up' },
  { id: 'IN_TRANSIT', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
];

export function DeliveryPage() {
  const { addToast, isOnline } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DeliveryStage | 'ALL'>('ALL');
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => generateDeliveries(12));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exceptions] = useState(mockDeliveryExceptions);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Simulate live stage advancement + ETA countdown
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.stage === 'DELIVERED') return d;
          const eta = Math.max(0, d.etaMinutes - 1);
          if (eta === 0 && Math.random() > 0.5) {
            const idx = deliveryStageOrder.indexOf(d.stage);
            if (idx < deliveryStageOrder.length - 1) {
              const nextStage = deliveryStageOrder[idx + 1];
              addToast({ type: 'info', title: 'Delivery Update', message: `${d.shortId} → ${deliveryStageConfig[nextStage].label}` });
              return {
                ...d,
                stage: nextStage,
                etaMinutes: nextStage === 'DELIVERED' ? 0 : Math.floor(Math.random() * 15) + 3,
                timeline: [...d.timeline, { stage: nextStage, timestamp: new Date().toISOString(), label: deliveryStageConfig[nextStage].label }],
                otp: nextStage === 'PICKUP_VERIFICATION' ? String(Math.floor(1000 + Math.random() * 9000)) : d.otp,
              };
            }
          }
          return { ...d, etaMinutes: eta };
        })
      );
    }, 15000);
    return () => clearInterval(interval);
  }, [isOnline, addToast]);

  const filteredDeliveries = useMemo(() => {
    if (activeTab === 'ALL') return deliveries.filter((d) => d.stage !== 'DELIVERED');
    return deliveries.filter((d) => d.stage === activeTab);
  }, [deliveries, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: deliveries.filter((d) => d.stage !== 'DELIVERED').length };
    deliveryStageOrder.forEach((s) => {
      counts[s] = deliveries.filter((d) => d.stage === s).length;
    });
    return counts;
  }, [deliveries]);

  const selectedDelivery = deliveries.find((d) => d.id === selectedId) ?? null;

  const handleExceptionAction = useCallback((exceptionType: DeliveryExceptionType, shortId: string) => {
    const actionMessages: Record<DeliveryExceptionType, string> = {
      PARTNER_CANCEL: 'Reassigning partner...',
      REASSIGNMENT: 'Reassignment confirmed',
      DELAYED_PICKUP: 'Contacting partner...',
      ADDRESS_ISSUE: 'Calling customer...',
      DELIVERY_FAILURE: 'Opening details...',
    };
    addToast({ type: 'info', title: actionMessages[exceptionType], message: shortId });
  }, [addToast]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stage tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {stageTabs.map((tab) => (
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
                activeTab === tab.id ? 'bg-white/20 dark:bg-gray-900/20' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
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
              <p className="text-sm text-gray-400 dark:text-gray-500">No deliveries in this stage</p>
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

        {/* Exceptions panel */}
        <div className="card p-5 h-fit animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Delivery Exceptions</h3>
            <span className="badge px-2 py-0.5 text-[10px] bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 ml-auto">
              {exceptions.length} Active
            </span>
          </div>
          <div className="space-y-3">
            {exceptions.map((exc) => {
              const cfg = deliveryExceptionConfig[exc.type];
              const icons: Record<DeliveryExceptionType, typeof UserX> = {
                PARTNER_CANCEL: UserX,
                REASSIGNMENT: RefreshCw,
                DELAYED_PICKUP: Clock,
                ADDRESS_ISSUE: MapPinOff,
                DELIVERY_FAILURE: X,
              };
              const Icon = icons[exc.type];
              return (
                <div key={exc.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-400 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge px-2 py-0.5 text-[10px] ${cfg.bg} ${cfg.text}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 ml-auto">{exc.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{exc.deliveryShortId}</span> • {exc.customerName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 leading-relaxed">{exc.note}</p>
                  <button
                    onClick={() => handleExceptionAction(exc.type, exc.deliveryShortId)}
                    className="btn-secondary text-xs w-full py-2"
                  >
                    {exc.actionLabel}
                  </button>
                </div>
              );
            })}
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
  const cfg = deliveryStageConfig[delivery.stage];

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
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-white">{delivery.distance} km</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">{delivery.etaMinutes}m ETA</p>
        </div>
      </div>

      {/* Partner info */}
      {delivery.partner ? (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {delivery.partner.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{delivery.partner.name}</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {delivery.partner.rating}
              </span>
              <span className="flex items-center gap-0.5">
                <Bike className="w-3 h-3" />
                {delivery.partner.vehicleType}
              </span>
              <span>{delivery.partner.vehicle}</span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="btn-ghost p-2 shrink-0"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Searching for nearby delivery partners...</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{delivery.address.split(',')[0]}</span>
        </span>
      </div>
    </div>
  );
}

function DeliveryDrawer({ delivery, onClose }: { delivery: Delivery; onClose: () => void }) {
  const [showOTP, setShowOTP] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const stageIndex = deliveryStageOrder.indexOf(delivery.stage);

  const handleVerifyOTP = () => {
    if (otpInput === delivery.otp) {
      setShowOTP(false);
      setOtpInput('');
      setOtpError(false);
      onClose();
    } else {
      setOtpError(true);
    }
  };

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
                <span className={`badge px-2 py-0.5 text-[10px] ${deliveryStageConfig[delivery.stage].bg} ${deliveryStageConfig[delivery.stage].text}`}>
                  {deliveryStageConfig[delivery.stage].label}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">{delivery.orderShortId} • {delivery.customerName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{delivery.etaMinutes}m</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">ETA</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Timeline stepper */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">DELIVERY TRACKER</h3>
            <div className="space-y-0">
              {deliveryStageOrder.map((stage, i) => {
                const isDone = i < stageIndex;
                const isCurrent = i === stageIndex;
                const isLast = i === deliveryStageOrder.length - 1;
                const cfg = deliveryStageConfig[stage];
                const stepData = delivery.timeline.find((t) => t.stage === stage);
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
          {delivery.partner && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">DELIVERY PARTNER</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {delivery.partner.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{delivery.partner.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {delivery.partner.rating}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Bike className="w-3 h-3" />
                      {delivery.partner.vehicleType}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{delivery.partner.vehicle}</p>
                </div>
                <button className="btn-secondary p-2.5">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">DELIVERY ADDRESS</h3>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{delivery.address}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{delivery.distance} km away</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shrink-0">
          {delivery.stage === 'PICKUP_VERIFICATION' && !showOTP && (
            <button onClick={() => setShowOTP(true)} className="btn-primary w-full">
              <QrCode className="w-5 h-5" /> Verify Pickup (OTP)
            </button>
          )}
          {delivery.stage === 'PICKUP_VERIFICATION' && showOTP && (
            <div className="space-y-2">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Enter OTP: <span className="font-bold text-brand-600 dark:text-brand-400">{delivery.otp}</span> (demo)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => { setOtpInput(e.target.value); setOtpError(false); }}
                  placeholder="Enter 4-digit OTP"
                  className={`input text-center font-bold tracking-widest ${otpError ? 'border-red-500' : ''}`}
                  autoFocus
                />
                <button onClick={handleVerifyOTP} className="btn-success px-4">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              {otpError && <p className="text-xs text-red-500 text-center">Incorrect OTP. Try again.</p>}
            </div>
          )}
          {delivery.stage === 'WAITING_FOR_PARTNER' && (
            <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
              Waiting for partner assignment...
            </div>
          )}
          {!['PICKUP_VERIFICATION', 'WAITING_FOR_PARTNER'].includes(delivery.stage) && (
            <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-2">
              {delivery.stage === 'DELIVERED' ? 'Delivery completed' : 'In progress — no action needed'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
