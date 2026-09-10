import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import { Clock, X, Calendar } from 'lucide-react';
import { operatingHours as defaultHours } from '@/data/mockData';

export function OfflinePanel({ onClose }: { onClose: () => void }) {
  const { isOnline, toggleOnline, goOfflineFor, offlineReason, setOfflineReason } = useApp();
  const [showHours, setShowHours] = useState(false);
  const [hours, setHours] = useState(defaultHours);

  const durations = [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: 'Rest of day', value: 0 },
  ];

  return (
    <div className="absolute top-full mt-2 left-0 z-50 w-84 sm:w-96 max-w-[calc(100vw-2rem)] card shadow-elevated animate-slide-up overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Online/Offline Control</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Accepting Orders</p>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isOnline
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1 ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                {isOnline ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isOnline ? 'Store is open & accepting orders' : 'Store is paused & offline to customers'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isOnline}
            onClick={toggleOnline}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              isOnline
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span className="sr-only">Toggle accepting orders</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
                isOnline ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Quick offline durations */}
        {!isOnline && (
          <div className="animate-fade-in">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Go offline temporarily</p>
            <div className="grid grid-cols-2 gap-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  onClick={() => goOfflineFor(d.value)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all"
                >
                  <Clock className="w-4 h-4 text-brand-500" />
                  {d.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason (optional)</label>
              <input
                type="text"
                value={offlineReason}
                onChange={(e) => setOfflineReason(e.target.value)}
                placeholder="e.g. Kitchen maintenance"
                className="input mt-1"
              />
            </div>
          </div>
        )}

        {/* Operating hours */}
        <div>
          <button
            onClick={() => setShowHours(!showHours)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors w-full"
          >
            <Calendar className="w-4 h-4" />
            Operating Hours
            <span className={`ml-auto text-xs transition-transform ${showHours ? 'rotate-180' : ''}`}>
              <ChevronDownSmall />
            </span>
          </button>

          {showHours && (
            <div className="mt-3 space-y-2 animate-fade-in">
              {hours.map((h, i) => (
                <div key={h.day} className="flex items-center gap-2 text-xs">
                  <span className="w-20 font-medium text-gray-600 dark:text-gray-400">{h.day.slice(0, 3)}</span>
                  {!h.closed ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={h.open}
                        onChange={(e) => setHours(prev => prev.map((x, idx) => idx === i ? { ...x, open: e.target.value } : x))}
                        className="input py-1.5 text-xs flex-1"
                      />
                      <span className="text-gray-400">—</span>
                      <input
                        type="time"
                        value={h.close}
                        onChange={(e) => setHours(prev => prev.map((x, idx) => idx === i ? { ...x, close: e.target.value } : x))}
                        className="input py-1.5 text-xs flex-1"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">Closed</span>
                  )}
                  <button
                    onClick={() => setHours(prev => prev.map((x, idx) => idx === i ? { ...x, closed: !x.closed } : x))}
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      h.closed
                        ? 'text-gray-400 bg-gray-100 dark:bg-gray-800'
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                    }`}
                  >
                    {h.closed ? 'Open' : 'Close'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronDownSmall() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
