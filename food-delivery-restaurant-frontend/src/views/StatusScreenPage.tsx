import { useApp } from '@/context/AppContext';
import { ChefHat, AlertCircle, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { RegistrationStatus } from '@/services/api';
import { AnimatedCheckmark, ConfettiBurst } from '@/components/ui/SuccessAnimation';

export function StatusScreenPage() {
  const {
    registrationStatus,
    statusDetails,
    setAuthView,
    logout,
    enterDashboard,
    darkMode,
    toggleDarkMode,
  } = useApp();

  // The application status comes directly from the server
  const currentStatus: RegistrationStatus = statusDetails?.status || registrationStatus || 'SUBMITTED';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
      </div>

      {/* Dark mode button */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 btn-ghost p-2 z-10"
        aria-label="Toggle theme"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Brand logo */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-elevated mb-3">
            <ChefHat className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VIGO FEAST</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Partner Onboarding Status</p>
        </div>

        {/* Main Status Card */}
        <div className="card p-6 shadow-elevated text-center relative overflow-hidden">
          {/* 1. SUBMITTED State with Celebratory Checkmark & Particle Burst */}
          {currentStatus === 'SUBMITTED' && (
            <div className="space-y-4 relative">
              <ConfettiBurst count={20} className="-top-12" />

              <div className="flex justify-center mb-2">
                <AnimatedCheckmark size="lg" variant="emerald" />
              </div>

              <div
                className="flex justify-center"
                style={{
                  animation: 'badgeFadeScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s backwards',
                }}
              >
                <span className="badge px-3.5 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold text-xs border border-blue-200/50 dark:border-blue-500/20">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  SUBMITTED
                </span>
              </div>

              <div
                style={{
                  animation: 'badgeFadeScale 0.4s ease-out 0.4s backwards',
                }}
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Registration submitted successfully.
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your registration is waiting for verification.
                </p>
              </div>

              {/* Application details card */}
              <div
                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-left space-y-2"
                style={{
                  animation: 'badgeFadeScale 0.4s ease-out 0.5s backwards',
                }}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Application Reference</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    {statusDetails?.application_id || 'APP-782941'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Restaurant</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {statusDetails?.restaurant_name || 'Vigo Feast Restaurant'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Submitted</span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {statusDetails?.submitted_at
                      ? new Date(statusDetails.submitted_at).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Just now'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                You can safely close this window. We will review your FSSAI, PAN, and bank details.
              </p>

              <button
                type="button"
                onClick={logout}
                className="btn-primary w-full"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>

              <style>{`
                @keyframes badgeFadeScale {
                  0% { opacity: 0; transform: scale(0.85) translateY(6px); }
                  100% { opacity: 1; transform: scale(1) translateY(0); }
                }
              `}</style>
            </div>
          )}

          {/* 2. UNDER_REVIEW State */}
          {currentStatus === 'UNDER_REVIEW' && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-2 text-amber-600 dark:text-amber-400">
                <RefreshCw className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
              </div>

              <div className="flex justify-center">
                <span className="badge px-3.5 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-xs border border-amber-200/50 dark:border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  UNDER_REVIEW
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Application Under Review
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Our compliance team is currently reviewing your restaurant documents and legal details.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-left space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Application Reference</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    {statusDetails?.application_id || 'APP-782941'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Current Stage</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Document & FSSAI Verification
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="btn-primary w-full"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Login
              </button>
            </div>
          )}

          {/* 3. REJECTED State */}
          {currentStatus === 'REJECTED' && (
            <div className="space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="flex justify-center">
                <span className="badge px-3.5 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-semibold text-xs border border-red-200/50 dark:border-red-500/20">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  🔴 Registration Rejected
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Registration Rejected
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your restaurant registration requires changes before it can be approved.
                </p>
              </div>

              {/* Rejection reason box */}
              <div className="p-4 rounded-xl bg-red-50/70 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-left">
                <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-1.5 uppercase tracking-wide">
                  Reason:
                </p>
                <p className="text-sm text-red-700 dark:text-red-400 font-medium whitespace-pre-wrap">
                  {statusDetails?.rejection_reason ||
                    'FSSAI certificate expired and business PAN name mismatch. Please update your registration with valid documents.'}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAuthView('wizard')}
                  className="btn-primary w-full py-2.5"
                >
                  <FileText className="w-4 h-4" /> Resubmit Application
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="btn-secondary w-full py-2.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
              </div>
            </div>
          )}

          {/* 4. APPROVED State (when platform admin approves) */}
          {currentStatus === 'APPROVED' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-center mb-2">
                <AnimatedCheckmark size="lg" variant="emerald" />
              </div>

              <div className="flex justify-center">
                <span className="badge px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-xs border border-emerald-200/50 dark:border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  APPROVED
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Application Approved!
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your restaurant registration has been approved by the platform admin.
                </p>
              </div>

              <button
                type="button"
                onClick={() => enterDashboard()}
                className="btn-primary w-full py-2.5 font-semibold"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Read-Only Status Indicator Pills (No actions or API calls) */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Application Status
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {currentStatus === 'APPROVED'
                  ? 'Verified & Approved'
                  : currentStatus === 'REJECTED'
                  ? 'Action Required'
                  : 'Awaiting Admin Review'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 select-none pointer-events-none" aria-readonly="true">
              {[
                { key: 'SUBMITTED', label: 'Submitted' },
                { key: 'UNDER_REVIEW', label: 'In Review' },
                { key: 'APPROVED', label: 'Approved' },
                { key: 'REJECTED', label: 'Rejected' },
              ].map(({ key, label }) => {
                const isCurrent = currentStatus === key;
                return (
                  <div
                    key={key}
                    className={`px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-all ${
                      isCurrent
                        ? key === 'APPROVED'
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                          : key === 'REJECTED'
                          ? 'bg-red-600 text-white border-red-600 font-bold shadow-sm'
                          : key === 'UNDER_REVIEW'
                          ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-sm'
                          : 'bg-brand-500 text-white border-brand-500 font-bold shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/30'
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
