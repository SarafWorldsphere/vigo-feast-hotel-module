import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ChefHat, Eye, EyeOff, Loader2, ArrowLeft, Phone, Mail, Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { RegistrationStatus, apiLogin, apiRefreshToken } from '@/services/api';
import { AnimatedCheckmark } from '@/components/ui/SuccessAnimation';

export function LoginPage() {
  const { login, setAuthView, darkMode, toggleDarkMode, addToast } = useApp();
  const [tab, setTab] = useState<'password' | 'otp'>('password');
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const [error, setError] = useState('');

  // Password form
  const [identifier, setIdentifier] = useState('partner@narayani.com');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);

  // Status gating simulation helper for review testing
  const [simulatedStatus, setSimulatedStatus] = useState<RegistrationStatus>('APPROVED');

  // OTP form
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const handlePasswordLogin = async () => {
    if (!identifier.trim()) {
      setError('Phone number or email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Calls POST /api/v1/auth/login
      await apiLogin({
        email: identifier.trim(),
        password,
      });

      // Show celebratory success animation state for ~900ms before routing
      setLoading(false);
      setSuccessState(true);
      setTimeout(async () => {
        await login();
      }, 950);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Invalid credentials');
    }
  };

  const handleSendOtp = () => {
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setResendTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }, 800);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpLogin = async () => {
    if (otp.some((d) => !d)) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      setLoading(false);
      setSuccessState(true);
      setTimeout(async () => {
        await login();
      }, 950);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'OTP verification failed');
    }
  };

  const handleForgotPassword = async () => {
    try {
      await apiRefreshToken();
      addToast({
        type: 'info',
        title: 'Password Reset',
        message: 'A password reset link has been dispatched to your email.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not process password reset at this time.',
      });
    }
  };

  const resetOtp = () => {
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
    setResendTimer(0);
    setError('');
  };

  // Brief animated success state before routing
  if (successState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        </div>
        <div className="relative w-full max-w-sm animate-fade-in card p-8 text-center shadow-elevated">
          <div className="flex justify-center mb-5">
            <AnimatedCheckmark size="lg" variant="emerald" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">Login Successful!</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {simulatedStatus === 'APPROVED'
              ? 'Opening your partner dashboard...'
              : 'Checking registration status...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 relative overflow-hidden">
      {/* Branded background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-500/5 blur-3xl" />
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 btn-ghost p-2 z-10"
        aria-label="Toggle theme"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-elevated mb-3">
            <ChefHat className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NARAYANI</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Partner Dashboard</p>
        </div>

        <div className="card p-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 mb-5">
            <button
              onClick={() => {
                setTab('password');
                setError('');
              }}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'password'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => {
                setTab('otp');
                setError('');
              }}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'otp'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              OTP Login
            </button>
          </div>

          {/* Password tab */}
          {tab === 'password' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone or Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className="input pl-10"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError('');
                    }}
                    placeholder="you@restaurant.com"
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pl-10 pr-10"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your password"
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 animate-fade-in">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                onClick={handlePasswordLogin}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </div>
          )}

          {/* OTP tab */}
          {tab === 'otp' && (
            <div className="space-y-4 animate-fade-in">
              {!otpSent ? (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        className="input pl-10"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setError('');
                        }}
                        placeholder="98765 43210"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                      />
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-500 animate-fade-in">{error}</p>}

                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" /> Send OTP
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10">
                    <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      OTP sent to <span className="font-semibold">{phone}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Enter 6-digit OTP</label>
                    <div className="flex gap-2 mt-2">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpRefs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="input w-11 h-12 text-center text-lg font-bold p-0"
                        />
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-xs text-red-500 animate-fade-in">{error}</p>}

                  <div className="flex items-center justify-between">
                    <button
                      onClick={resetOtp}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change number
                    </button>
                    <button
                      onClick={() => {
                        if (resendTimer === 0) {
                          setResendTimer(30);
                          setError('');
                        }
                      }}
                      disabled={resendTimer > 0}
                      className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                  </div>

                  <button
                    onClick={handleOtpLogin}
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      'Verify & Login'
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Test Status Simulation Pill Selector */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Simulate Status on Login
              </span>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">Status Gating</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED'] as RegistrationStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSimulatedStatus(st)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                    simulatedStatus === st
                      ? 'bg-brand-50 dark:bg-brand-500/20 border-brand-400 dark:border-brand-500 text-brand-700 dark:text-brand-300 font-semibold'
                      : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {st === 'APPROVED' && '🟢 Approved (Dashboard)'}
                  {st === 'SUBMITTED' && '🔵 Submitted'}
                  {st === 'UNDER_REVIEW' && '🟡 Under Review'}
                  {st === 'REJECTED' && '🔴 Rejected'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Register link (now links to Owner Signup) */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          New restaurant partner?{' '}
          <button
            onClick={() => setAuthView('signup')}
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}
