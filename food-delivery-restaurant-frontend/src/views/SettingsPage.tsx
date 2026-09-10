import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  mockRestaurantProfile, mockRestaurantOwner, operatingHours as defaultHours,
  RestaurantProfile, RestaurantOwner,
} from '@/data/mockData';
import { PageSkeleton } from '@/components/ui/Skeletons';
import {
  Store, Clock, Wifi, User, Wallet, Check, X, Star, UploadCloud, Image as ImageIcon,
  Eye, EyeOff, ShieldCheck, ShieldAlert, Building2, MapPin, Phone, Mail, Lock, Loader2,
} from 'lucide-react';

type Tab = 'profile' | 'hours' | 'status' | 'account' | 'payouts';

const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
  { id: 'profile', label: 'Profile', icon: Store },
  { id: 'hours', label: 'Operating Hours', icon: Clock },
  { id: 'status', label: 'Online Status', icon: Wifi },
  { id: 'account', label: 'Account', icon: User },
  { id: 'payouts', label: 'Payout Details', icon: Wallet },
];

export function SettingsPage() {
  const { addToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      {/* Tab bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 mb-4 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="w-full">
        {activeTab === 'profile' && <ProfileTab onSave={() => addToast({ type: 'success', title: 'Profile saved', message: 'Restaurant profile updated' })} />}
        {activeTab === 'hours' && <HoursTab onSave={() => addToast({ type: 'success', title: 'Hours saved', message: 'Operating hours updated' })} />}
        {activeTab === 'status' && <StatusTab />}
        {activeTab === 'account' && <AccountTab onSave={() => addToast({ type: 'success', title: 'Account saved', message: 'Account details updated' })} />}
        {activeTab === 'payouts' && <PayoutsTab onSave={() => addToast({ type: 'success', title: 'Payout details saved', message: 'Bank details updated' })} />}
      </div>
    </div>
  );
}

function ProfileTab({ onSave }: { onSave: () => void }) {
  const [data, setData] = useState<RestaurantProfile>(mockRestaurantProfile);
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [coverUploaded, setCoverUploaded] = useState(false);

  const update = (field: keyof RestaurantProfile, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-in">
      {/* Logo & Cover */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">RESTAURANT IMAGES</h3>
        <div className="space-y-3">
          <MockUploadCard label="Restaurant Logo" uploaded={logoUploaded} onUpload={() => setLogoUploaded(true)} icon={ImageIcon} />
          <MockUploadCard label="Cover Photo" uploaded={coverUploaded} onUpload={() => setCoverUploaded(true)} icon={ImageIcon} />
        </div>
      </div>

      {/* Basic Info */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">BASIC INFORMATION</h3>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Restaurant Name</label>
          <input className="input mt-1" value={data.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
          <textarea className="input mt-1 resize-none" rows={3} value={data.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
            <div className="relative mt-1">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-10" value={data.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-10" value={data.email} onChange={(e) => update('email', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">ADDRESS</h3>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Address Line 1</label>
          <input className="input mt-1" value={data.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Address Line 2</label>
          <input className="input mt-1" value={data.addressLine2} onChange={(e) => update('addressLine2', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">City</label>
            <input className="input mt-1" value={data.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">State</label>
            <input className="input mt-1" value={data.state} onChange={(e) => update('state', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Postal Code</label>
            <input className="input mt-1" value={data.postalCode} onChange={(e) => update('postalCode', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Rating (read-only) */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">RATING</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{data.rating}</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(data.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="xl:col-span-2">
        <SaveCancelButtons onSave={onSave} />
      </div>
    </div>
  );
}

function HoursTab({ onSave }: { onSave: () => void }) {
  const [hours, setHours] = useState(defaultHours);

  const update = (index: number, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">WEEKLY SCHEDULE</h3>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.day} className={`flex items-center gap-2 p-2.5 rounded-xl transition-colors ${h.closed ? 'bg-gray-50 dark:bg-gray-800/40' : ''}`}>
              <span className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{h.day}</span>
              {!h.closed ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="time"
                    value={h.open}
                    onChange={(e) => update(i, 'open', e.target.value)}
                    className="input py-1.5 text-xs flex-1"
                  />
                  <span className="text-gray-400 text-xs">—</span>
                  <input
                    type="time"
                    value={h.close}
                    onChange={(e) => update(i, 'close', e.target.value)}
                    className="input py-1.5 text-xs flex-1"
                  />
                </div>
              ) : (
                <span className="text-sm text-red-500 font-medium flex-1">Closed</span>
              )}
              <button
                onClick={() => update(i, 'closed', !h.closed)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  h.closed
                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                }`}
              >
                {h.closed ? 'Open' : 'Close'}
              </button>
            </div>
          ))}
        </div>
      </div>
      <SaveCancelButtons onSave={onSave} />
    </div>
  );
}

function StatusTab() {
  const { isOnline, toggleOnline, goOfflineFor, offlineUntil, offlineReason, setOfflineReason, addToast } = useApp();

  const durations = [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: 'Rest of day', value: 0 },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Main toggle */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">ACCEPTING ORDERS</h3>
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Store Status</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
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
              isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span className="sr-only">Toggle accepting orders</span>
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${isOnline ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Quick offline */}
      {!isOnline && (
        <div className="card p-5 animate-fade-in">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">GO OFFLINE TEMPORARILY</h3>
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

      {/* Current status info */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">CURRENT STATUS</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">Status</span>
            <span className={`text-sm font-medium ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {offlineUntil && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Auto-resume</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {offlineUntil.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
          {offlineReason && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500">Reason</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{offlineReason}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountTab({ onSave }: { onSave: () => void }) {
  const [data, setData] = useState<RestaurantOwner>(mockRestaurantOwner);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: keyof RestaurantOwner, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = () => {
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setPasswordError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Owner info */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">OWNER DETAILS</h3>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Full Name</label>
          <input className="input mt-1" value={data.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
            <input className="input mt-1" value={data.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
            <input className="input mt-1" value={data.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Verification status */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">VERIFICATION STATUS</h3>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            data.isVerified ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'
          }`}>
            {data.isVerified ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-amber-500" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {data.isVerified ? 'Verified Account' : 'Pending Verification'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {data.isVerified ? 'Your account is verified and active' : 'Your account is under review'}
            </p>
          </div>
          <span className={`badge ${data.isVerified ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.isVerified ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {data.isVerified ? 'Verified' : 'Pending'}
          </span>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">CHANGE PASSWORD</h3>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">New Password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pl-10 pr-10"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
              placeholder="Min 6 characters"
            />
            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            className="input mt-1"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
            placeholder="Re-enter password"
          />
        </div>
        {passwordError && <p className="text-xs text-red-500 animate-fade-in">{passwordError}</p>}
        <button onClick={handleChangePassword} disabled={loading} className="btn-secondary text-sm">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
        </button>
      </div>

      <SaveCancelButtons onSave={onSave} />
    </div>
  );
}

function PayoutsTab({ onSave }: { onSave: () => void }) {
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNumber, setAccountNumber] = useState('5010XXXXXXXXXX4823');
  const [ifsc, setIfsc] = useState('HDFC0001234');
  const [accountHolder, setAccountHolder] = useState('NARAYANI Restaurant');
  const [upiId, setUpiId] = useState('narayani@hdfc');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">BANK DETAILS FOR SETTLEMENTS</h3>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Account Holder Name</label>
          <input className="input mt-1" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Bank Name</label>
          <input className="input mt-1" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Account Number</label>
            <input className="input mt-1" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">IFSC Code</label>
            <input className="input mt-1" value={ifsc} onChange={(e) => setIfsc(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">UPI ID</label>
          <input className="input mt-1" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
        </div>
      </div>
      <SaveCancelButtons onSave={onSave} />
    </div>
  );
}

function MockUploadCard({ label, uploaded, onUpload, icon: Icon }: {
  label: string;
  uploaded: boolean;
  onUpload: () => void;
  icon: typeof ImageIcon;
}) {
  return (
    <button
      onClick={onUpload}
      className={`w-full p-4 rounded-xl border-2 border-dashed transition-all text-left ${
        uploaded
          ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5'
          : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-500/5'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          uploaded ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          {uploaded ? <Check className="w-5 h-5 text-emerald-500" /> : <Icon className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${uploaded ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {label}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {uploaded ? 'Uploaded successfully' : 'Tap to upload (mock)'}
          </p>
        </div>
        {!uploaded && <UploadCloud className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
      </div>
    </button>
  );
}

function SaveCancelButtons({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex gap-2">
      <button className="btn-secondary flex-1">Cancel</button>
      <button onClick={onSave} className="btn-primary flex-1">
        <Check className="w-4 h-4" /> Save Changes
      </button>
    </div>
  );
}
