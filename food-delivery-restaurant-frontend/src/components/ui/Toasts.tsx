import { useApp } from '@/context/AppContext';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          error: <AlertCircle className="w-5 h-5 text-red-500" />,
          info: <Info className="w-5 h-5 text-blue-500" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
        };
        const isOrder = toast.title === 'New Order!';
        return (
          <div
            key={toast.id}
            className={`card p-4 flex items-start gap-3 animate-slide-in-right shadow-elevated ${
              isOrder ? 'ring-2 ring-brand-500/40' : ''
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isOrder ? (
                <div className="relative">
                  <Bell className="w-5 h-5 text-brand-500" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                  </span>
                </div>
              ) : (
                icons[toast.type]
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toast.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
