import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useWeeklySchedule, computePausedUntilIST } from '@/hooks/useRestaurantHours';
import { Clock, X, Calendar, ChevronDown, Loader2, ArrowRight } from 'lucide-react';

const DAY_NAMES: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

function toHHMM(t: string | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export function OfflinePanel({ onClose }: { onClose: () => void }) {
  const {
    availability,
    orderSettings,
    isOrderSettingsLoading,
    pauseOnlineOrders,
    resumeOnlineOrders,
    setSettingsInitialTab,
    setPage,
  } = useApp();

  const { schedule, isLoading: isScheduleLoading } = useWeeklySchedule();

  const [showHours, setShowHours] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [showPauseOptions, setShowPauseOptions] = useState(false);

  const durations = [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: 'Rest of day', value: 0 },
  ];

  const isAcceptingOrders = availability?.is_accepting_orders ?? false;
  const isPaused = availability ? availability.is_paused : (orderSettings?.is_paused ?? false);
  const status: 'ONLINE' | 'PAUSED' | 'OFFLINE' = isAcceptingOrders
    ? 'ONLINE'
    : isPaused
    ? 'PAUSED'
    : 'OFFLINE';
  const pausedUntil = orderSettings?.paused_until ? new Date(orderSettings.paused_until) : null;

  async function handlePause() {
    if (selectedDuration === null) return;
    const paused_until = computePausedUntilIST(selectedDuration);
    const ok = await pauseOnlineOrders({ reason: reason || null, paused_until });
    if (ok) {
      setShowPauseOptions(false);
      setReason('');
      setSelectedDuration(null);
    }
  }

  async function handleResume() {
    await resumeOnlineOrders();
  }

  function handleNavigate(tab: 'hours' | 'status') {
    setSettingsInitialTab(tab);
    setPage('settings');
    onClose();
  }

  return (
    <div className="absolute top-full mt-2 left-0 z-50 w-88 sm:w-96 max-w-[calc(100vw-2rem)] card shadow-elevated animate-slide-up max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10">
        <div>
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Online/Offline Control</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Live ordering availability</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close popup"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Accepting Orders Status Card */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Accepting Orders</p>
              {status === 'ONLINE' ? (
                <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                </span>
              ) : status === 'PAUSED' ? (
                <span className="badge bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> PAUSED
                </span>
              ) : (
                <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> OFFLINE
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {status === 'ONLINE'
                ? 'Store is open & accepting orders'
                : status === 'PAUSED'
                ? orderSettings?.pause_reason
                  ? `Paused: ${orderSettings.pause_reason}`
                  : 'Store is temporarily offline'
                : availability?.reason === 'NO_SCHEDULE'
                ? 'No online ordering hours configured for today'
                : availability?.reason === 'CLOSED_TODAY'
                ? 'Store is closed today'
                : availability?.reason === 'OUTSIDE_ORDERING_HOURS'
                ? 'Outside online ordering hours'
                : availability?.reason === 'OUTSIDE_OPERATING_HOURS'
                ? 'Outside operating hours'
                : 'Store is currently offline'}
            </p>
            {isPaused && pausedUntil && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Resumes at {pausedUntil.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isAcceptingOrders}
            aria-label="Toggle accepting orders"
            disabled={isOrderSettingsLoading}
            onClick={() => {
              if (isPaused) {
                handleResume();
              } else {
                setShowPauseOptions((p) => !p);
              }
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${
              isAcceptingOrders ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span className="sr-only">Toggle accepting orders</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                isAcceptingOrders ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Temporary Pause Options Panel */}
        {showPauseOptions && !isPaused && (
          <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">PAUSE ORDERS TEMPORARILY</p>
              <button
                type="button"
                onClick={() => {
                  setShowPauseOptions(false);
                  setSelectedDuration(null);
                  setReason('');
                }}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDuration(d.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    selectedDuration === d.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-400 bg-white dark:bg-gray-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  {d.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Kitchen maintenance"
                className="input mt-1 text-xs py-1.5"
              />
            </div>

            <button
              type="button"
              disabled={selectedDuration === null || isOrderSettingsLoading}
              onClick={handlePause}
              className="btn-primary w-full text-xs py-2 bg-amber-500 hover:bg-amber-600"
            >
              {isOrderSettingsLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pausing…
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" /> Pause Online Orders
                </>
              )}
            </button>
          </div>
        )}

        {/* Resuming Banner when paused */}
        {isPaused && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 min-w-0">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">{orderSettings?.pause_reason || 'Orders currently paused'}</span>
            </div>
            <button
              type="button"
              disabled={isOrderSettingsLoading}
              onClick={handleResume}
              className="btn-success text-xs py-1.5 px-2.5 shrink-0"
            >
              {isOrderSettingsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Resume Now'}
            </button>
          </div>
        )}

        {/* Collapsible Operating Hours Summary */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowHours(!showHours)}
            className="flex items-center justify-between w-full py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Operating Hours Summary
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showHours ? 'rotate-180' : ''}`} />
          </button>

          {showHours && (
            <div className="mt-2.5 space-y-1.5 p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 animate-fade-in text-xs">
              {isScheduleLoading ? (
                <div className="space-y-1.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-4 rounded w-full" />
                  ))}
                </div>
              ) : !schedule?.days?.length ? (
                <p className="text-gray-400 text-center py-2">No weekly hours configured</p>
              ) : (
                [...schedule.days]
                  .sort((a, b) => a.day_of_week - b.day_of_week)
                  .map((d) => {
                    const opSlots = (d.slots || []).filter((s) => s.slot_type === 'OPERATING');
                    const orSlots = (d.slots || []).filter((s) => s.slot_type === 'ONLINE_ORDERING');
                    const isClosed = d.is_closed || (opSlots.length === 0 && orSlots.length === 0);

                    return (
                      <div key={d.day_of_week} className="flex items-start justify-between py-1 border-b border-gray-100/60 dark:border-gray-800/60 last:border-0">
                        <span className="font-semibold text-gray-600 dark:text-gray-400 w-12 shrink-0">
                          {DAY_NAMES[d.day_of_week] || `Day ${d.day_of_week}`}
                        </span>
                        <div className="flex-1 text-right">
                          {isClosed ? (
                            <span className="text-red-500 font-medium text-[11px]">Closed</span>
                          ) : (
                            <div className="space-y-0.5">
                              {opSlots.length > 0 ? (
                                <p className="text-gray-800 dark:text-gray-200 text-[11px]">
                                  {opSlots.map((s) => `${toHHMM(s.start_time)}–${toHHMM(s.end_time)}`).join(', ')}
                                </p>
                              ) : (
                                <p className="text-gray-400 text-[11px]">Operating: Closed</p>
                              )}
                              {orSlots.length > 0 && (
                                <p className="text-gray-400 text-[10px]">
                                  Orders: {orSlots.map((s) => `${toHHMM(s.start_time)}–${toHHMM(s.end_time)}`).join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>

        {/* Shortcuts */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">SETTINGS SHORTCUTS</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleNavigate('hours')}
              className="flex items-center justify-between p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 text-xs font-medium text-gray-700 dark:text-gray-300 transition-all text-left"
            >
              <span>Operating Hours</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('status')}
              className="flex items-center justify-between p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-500/10 text-xs font-medium text-gray-700 dark:text-gray-300 transition-all text-left"
            >
              <span>Online Status</span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
