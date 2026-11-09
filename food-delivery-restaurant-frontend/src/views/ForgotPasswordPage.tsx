'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ChefHat,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Phone,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  apiForgotPasswordRequestOtp,
  apiForgotPasswordVerifyOtp,
  apiForgotPasswordReset,
} from '@/services/api';
import { AnimatedCheckmark } from '@/components/ui/SuccessAnimation';

export function ForgotPasswordPage() {
  const { setAuthView, darkMode, toggleDarkMode } = useApp();

  // Steps: 1 = Enter Phone, 2 = Verify OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Phone & Language
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<'en' | 'hi' | 'te'>('en');
  const [requestId, setRequestId] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: Password (reset_token stored in memory only)
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Step 1: Send OTP handler
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    const trimmedPhone = phone.trim();
    if (!trimmedPhone || trimmedPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await apiForgotPasswordRequestOtp({ phone: trimmedPhone, language });
      setRequestId(res.request_id);
      setStep(2);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      const msg: string = err?.message || 'Failed to send OTP. Please try again.';
      if (msg.includes('429') || msg.toLowerCase().includes('wait')) {
        setError('Too many requests. Please wait before trying again.');
      } else if (msg.includes('400') || msg.toLowerCase().includes('phone')) {
        setError('Unable to send OTP to this number. Please check the number.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: OTP input helpers
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    if (digit && !/^\d$/.test(digit)) return;

    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length > 0) {
      const nextOtp = [...otp];
      digits.forEach((digit, i) => {
        if (i < 6) nextOtp[i] = digit;
      });
      setOtp(nextOtp);
      const focusIndex = Math.min(digits.length, 5);
      otpRefs.current[focusIndex]?.focus();
    }
  };

  // Step 2: Resend OTP handler
  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;

    setError('');
    setLoading(true);
    setOtp(['', '', '', '', '', '']);

    try {
      const res = await apiForgotPasswordRequestOtp({ phone: phone.trim(), language });
      setRequestId(res.request_id);
      setResendTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const msg: string = err?.message || 'Failed to resend OTP.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP handler
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    if (!requestId) {
      setError('OTP session has expired. Please request a new OTP.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await apiForgotPasswordVerifyOtp({
        phone: phone.trim(),
        request_id: requestId,
        otp: enteredOtp,
      });

      // Securely keep reset_token in memory only
      setResetToken(res.reset_token);
      setStep(3);
    } catch (err: any) {
      const msg: string = err?.message || 'OTP verification failed';
      if (msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
        setError('Invalid or expired OTP. Please check the code or request a new one.');
      } else if (msg.includes('429')) {
        setError('Too many attempts. Please wait before trying again.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  // Step 3: Reset Password handler
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!hasLetter || !hasNumber) {
      setError('Password must contain at least one letter and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setError('Reset session expired. Please start over.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await apiForgotPasswordReset({
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      // Clear memory tokens and show success screen
      setResetToken('');
      setStep(4);
    } catch (err: any) {
      const msg: string = err?.message || 'Failed to reset password.';
      if (msg.includes('400') || msg.includes('401') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid token')) {
        setError('Your password reset session has expired. Please restart the process.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8 relative overflow-hidden">
      {/* Branded background blur elements */}
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
        {/* Logo and header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-elevated mb-3">
            <ChefHat className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VIGO FEAST</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Partner Dashboard</p>
        </div>

        {/* Main Card */}
        <div className="card p-6 shadow-elevated">
          {/* STEP 1: Enter Mobile Number */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4 animate-fade-in">
              <div className="text-left mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Forgot Password?</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter your registered mobile number to reset your password.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Mobile Number
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm font-medium flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(clean);
                      if (error) setError('');
                    }}
                    className="input pl-16 w-full"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  OTP Language
                </label>
                <select
                  className="input mt-1 w-full"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'te')}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-500 animate-fade-in">{error}</p>}

              <button
                type="submit"
                disabled={loading || phone.trim().length < 10}
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

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verify SMS OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
              <div className="text-left mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Verify Your Mobile Number</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the 6-digit OTP sent to your registered mobile number.
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10">
                <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" />
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  OTP sent in <span className="font-medium">{language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}</span> to <span className="font-semibold">+91 {phone}</span>
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Enter 6-digit OTP
                </label>
                <div className="flex gap-2 mt-2 justify-center" onPaste={handleOtpPaste}>
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

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep(1);
                  }}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change Mobile Number
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.some((d) => !d)}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying OTP...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
              <div className="text-left mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Set New Password</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Create a strong, secure new password for your account.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  New Password
                </label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className="input pl-9 pr-10 w-full"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className="input pl-9 pr-10 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      hasMinLength ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                  <span className={hasMinLength ? 'text-gray-800 dark:text-gray-200' : ''}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      hasLetter && hasNumber ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                  <span className={hasLetter && hasNumber ? 'text-gray-800 dark:text-gray-200' : ''}>
                    Contains at least one letter and one number
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      passwordsMatch ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                  <span className={passwordsMatch ? 'text-gray-800 dark:text-gray-200' : ''}>
                    Passwords match
                  </span>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 animate-fade-in">{error}</p>}

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success Screen */}
          {step === 4 && (
            <div className="py-4 text-center animate-fade-in">
              <div className="flex justify-center mb-5">
                <AnimatedCheckmark size="lg" variant="emerald" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Password Reset Successful!
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-xs mx-auto">
                Your password has been updated securely. You can now log in using your registered credentials.
              </p>
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className="btn-primary w-full"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6 tracking-wide">
          Powered by Saraf Worldsphere AI services
        </p>
      </div>
    </div>
  );
}

