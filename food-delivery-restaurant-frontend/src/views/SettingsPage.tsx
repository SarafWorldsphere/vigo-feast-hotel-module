import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  mockRestaurantProfile, mockRestaurantOwner, operatingHours as defaultHours,
  RestaurantProfile, RestaurantOwner,
} from '@/data/mockData';
import {
  apiGetRestaurantProfile,
  apiUpdateRestaurantProfile,
  apiGetRestaurantAddress,
  RestaurantAddressUpdatePayload,
  RestaurantProfileResponse,
} from '@/services/api';

import {
  useUpdateRestaurantAddress,
  useRestaurantAddress,
} from '@/hooks/useRestaurantAddress';
export {
  useUpdateRestaurantAddress,
  useRestaurantAddress,
} from '@/hooks/useRestaurantAddress';
export type {
  UpdateRestaurantAddressParams,
  UseUpdateRestaurantAddressReturn,
  UseRestaurantAddressReturn,
} from '@/hooks/useRestaurantAddress';
import {
  useRestaurantProfile,
  useGetRestaurantProfile,
} from '@/hooks/useRestaurantProfile';
export {
  useRestaurantProfile,
  useGetRestaurantProfile,
} from '@/hooks/useRestaurantProfile';
export type {
  UseRestaurantProfileReturn,
  UseRestaurantProfileOptions,
} from '@/hooks/useRestaurantProfile';

import {
  useOwnerProfile,
  useGetOwnerProfile,
  useUpdateOwnerProfile,
} from '@/hooks/useOwnerProfile';
import type {
  OwnerProfileResponse,
  OwnerProfileUpdatePayload,
  UseOwnerProfileReturn,
  UseOwnerProfileOptions,
  UseUpdateOwnerProfileReturn,
} from '@/hooks/useOwnerProfile';
export {
  useOwnerProfile,
  useGetOwnerProfile,
  useUpdateOwnerProfile,
};
export type {
  UseOwnerProfileReturn,
  UseOwnerProfileOptions,
  UseUpdateOwnerProfileReturn,
  OwnerProfileResponse,
  OwnerProfileUpdatePayload,
} from '@/hooks/useOwnerProfile';


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
  const {
    profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useRestaurantProfile();
  const {
    ownerProfile,
    isLoading: isOwnerLoading,
    isUpdating: isOwnerUpdating,
    updateOwnerProfile,
    refetch: refetchOwnerProfile,
  } = useOwnerProfile();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!isProfileLoading && !isOwnerLoading) {
      setLoading(false);
    }
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [isProfileLoading, isOwnerLoading]);

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
        {activeTab === 'profile' && (
          <ProfileTab profile={profile} refetchProfile={refetchProfile} />
        )}
        {activeTab === 'hours' && (
          <HoursTab
            onSave={() =>
              addToast({
                type: 'success',
                title: 'Hours saved',
                message: 'Operating hours updated',
              })
            }
          />
        )}
        {activeTab === 'status' && <StatusTab />}
        {activeTab === 'account' && (
          <AccountTab
            ownerProfile={ownerProfile}
            isLoading={isOwnerLoading}
            isUpdating={isOwnerUpdating}
            onUpdate={updateOwnerProfile}
          />
        )}
        {activeTab === 'payouts' && (
          <PayoutsTab
            onSave={() =>
              addToast({
                type: 'success',
                title: 'Payout details saved',
                message: 'Bank details updated',
              })
            }
          />
        )}
      </div>
    </div>
  );
}

interface ProfileTabProps {
  profile?: RestaurantProfileResponse | null;
  refetchProfile?: () => void;
}

function ProfileTab({
  profile: propProfile,
  refetchProfile: propRefetch,
}: ProfileTabProps = {}) {
  const { addToast } = useApp();
  const profileHook = useRestaurantProfile({ autoFetch: propProfile === undefined });
  const profile = propProfile !== undefined ? propProfile : profileHook.profile;
  const refetchProfile = propRefetch || profileHook.refetch;


  // Images state
  const [savedImages, setSavedImages] = useState({ logo: false, cover: false });
  const [images, setImages] = useState({ logo: false, cover: false });
  const [updatingImages, setUpdatingImages] = useState(false);

  // Basic info state
  const [savedBasic, setSavedBasic] = useState({
    name: mockRestaurantProfile.name,
    description: mockRestaurantProfile.description,
    phone: mockRestaurantProfile.phone,
    email: mockRestaurantProfile.email,
  });
  const [basic, setBasic] = useState({
    name: mockRestaurantProfile.name,
    description: mockRestaurantProfile.description,
    phone: mockRestaurantProfile.phone,
    email: mockRestaurantProfile.email,
  });
  const [updatingBasic, setUpdatingBasic] = useState(false);

  // Address state
  const [savedAddress, setSavedAddress] = useState({
    addressLine1: mockRestaurantProfile.addressLine1,
    addressLine2: mockRestaurantProfile.addressLine2,
    city: mockRestaurantProfile.city,
    state: mockRestaurantProfile.state,
    postalCode: mockRestaurantProfile.postalCode,
  });
  const [address, setAddress] = useState({
    addressLine1: mockRestaurantProfile.addressLine1,
    addressLine2: mockRestaurantProfile.addressLine2,
    city: mockRestaurantProfile.city,
    state: mockRestaurantProfile.state,
    postalCode: mockRestaurantProfile.postalCode,
  });
  const { updateAddress, isUpdating: updatingAddress } = useUpdateRestaurantAddress();

  // Scoped dirty state checks
  const isImagesDirty =
    images.logo !== savedImages.logo ||
    images.cover !== savedImages.cover;

  const isBasicDirty =
    basic.name !== savedBasic.name ||
    basic.description !== savedBasic.description ||
    basic.phone !== savedBasic.phone ||
    basic.email !== savedBasic.email;

  const isAddressDirty =
    address.addressLine1 !== savedAddress.addressLine1 ||
    address.addressLine2 !== savedAddress.addressLine2 ||
    address.city !== savedAddress.city ||
    address.state !== savedAddress.state ||
    address.postalCode !== savedAddress.postalCode;

  // Rating state
  const [currentRating, setCurrentRating] = useState({
    average: mockRestaurantProfile.rating,
    totalReviews: 0,
  });

  // Sync state whenever profile from hook loads or updates
  useEffect(() => {
    if (!profile) return;
    const initial = {
      name: profile.name || '',
      description: profile.description || '',
      phone: profile.phone || '',
      email: profile.email || '',
    };
    setSavedBasic(initial);
    setBasic(initial);

    if (profile.images) {
      const imgState = {
        logo: Boolean(profile.images.logo_url),
        cover: Boolean(profile.images.cover_image_url),
      };
      setSavedImages(imgState);
      setImages(imgState);
    }

    if (profile.address) {
      const initialAddr = {
        addressLine1: profile.address.address_line1 || '',
        addressLine2: profile.address.address_line2 || '',
        city: profile.address.city || '',
        state: profile.address.state || '',
        postalCode: profile.address.postal_code || '',
      };
      setSavedAddress(initialAddr);
      setAddress(initialAddr);
    }

    if (profile.rating) {
      const avg = typeof profile.rating === 'object' ? profile.rating.average : profile.rating;
      const total = typeof profile.rating === 'object' ? profile.rating.total_reviews : 0;
      if (avg !== undefined && avg !== null) {
        mockRestaurantProfile.rating = avg;
        setCurrentRating({ average: avg, totalReviews: total });
      }
    }
  }, [profile]);


  // Handlers
  const handleUpdateImages = () => {
    if (!isImagesDirty || updatingImages) return;
    setUpdatingImages(true);
    setTimeout(() => {
      setSavedImages({ ...images });
      setUpdatingImages(false);
      addToast({
        type: 'success',
        title: 'Images updated',
        message: 'Restaurant images have been updated successfully.',
      });
    }, 500);
  };

  const handleUpdateBasic = async () => {
    if (!isBasicDirty || updatingBasic) return;
    setUpdatingBasic(true);

    try {
      // Build partial payload containing only the modified fields
      const payload: {
        name?: string;
        description?: string;
        phone?: string;
        email?: string;
      } = {};

      if (basic.name !== savedBasic.name) {
        payload.name = basic.name.trim();
      }
      if (basic.description !== savedBasic.description) {
        payload.description = basic.description;
      }
      if (basic.phone !== savedBasic.phone) {
        payload.phone = basic.phone.trim();
      }
      if (basic.email !== savedBasic.email) {
        const trimmedEmail = basic.email.trim();
        if (trimmedEmail) {
          payload.email = trimmedEmail;
        }
      }

      // If no scoped difference found, fallback to populated basic info
      const requestPayload =
        Object.keys(payload).length > 0
          ? payload
          : {
              ...(basic.name ? { name: basic.name.trim() } : {}),
              ...(basic.description ? { description: basic.description } : {}),
              ...(basic.phone ? { phone: basic.phone.trim() } : {}),
              ...(basic.email?.trim() ? { email: basic.email.trim() } : {}),
            };

      const updated = await apiUpdateRestaurantProfile(requestPayload);

      const nextSaved = {
        name: updated?.name ?? basic.name,
        description: updated?.description ?? basic.description,
        phone: updated?.phone ?? basic.phone,
        email: updated?.email ?? basic.email,
      };

      setSavedBasic(nextSaved);
      setBasic(nextSaved);

      // Keep mock in sync for fallback
      mockRestaurantProfile.name = nextSaved.name;
      mockRestaurantProfile.description = nextSaved.description;
      mockRestaurantProfile.phone = nextSaved.phone;
      mockRestaurantProfile.email = nextSaved.email;

      addToast({
        type: 'success',
        title: 'Basic information updated',
        message: 'Restaurant profile details have been updated successfully.',
      });
    } catch (err: any) {
      console.error('Failed to update restaurant profile:', err);
      addToast({
        type: 'error',
        title: 'Update failed',
        message: err?.message || 'Failed to update restaurant profile. Please try again.',
      });
    } finally {
      setUpdatingBasic(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!isAddressDirty || updatingAddress) return;

    try {
      const payload: RestaurantAddressUpdatePayload = {};
      if (address.addressLine1 !== savedAddress.addressLine1) {
        payload.address_line1 = address.addressLine1.trim();
      }
      if (address.addressLine2 !== savedAddress.addressLine2) {
        payload.address_line2 = address.addressLine2.trim();
      }
      if (address.city !== savedAddress.city) {
        payload.city = address.city.trim();
      }
      if (address.state !== savedAddress.state) {
        payload.state = address.state.trim();
      }
      if (address.postalCode !== savedAddress.postalCode) {
        payload.postal_code = address.postalCode.trim();
      }

      const requestPayload =
        Object.keys(payload).length > 0
          ? payload
          : {
              ...(address.addressLine1 ? { address_line1: address.addressLine1.trim() } : {}),
              ...(address.addressLine2 ? { address_line2: address.addressLine2.trim() } : {}),
              ...(address.city ? { city: address.city.trim() } : {}),
              ...(address.state ? { state: address.state.trim() } : {}),
              ...(address.postalCode ? { postal_code: address.postalCode.trim() } : {}),
            };

      const updated = await updateAddress(requestPayload);

      const nextSaved = {
        addressLine1: updated?.address_line1 ?? address.addressLine1,
        addressLine2: updated?.address_line2 ?? address.addressLine2,
        city: updated?.city ?? address.city,
        state: updated?.state ?? address.state,
        postalCode: updated?.postal_code ?? address.postalCode,
      };

      setSavedAddress(nextSaved);
      setAddress(nextSaved);

      // Keep mock in sync for fallback
      mockRestaurantProfile.addressLine1 = nextSaved.addressLine1;
      mockRestaurantProfile.addressLine2 = nextSaved.addressLine2;
      mockRestaurantProfile.city = nextSaved.city;
      mockRestaurantProfile.state = nextSaved.state;
      mockRestaurantProfile.postalCode = nextSaved.postalCode;
    } catch (err: any) {
      console.error('Failed to update restaurant address:', err);
      // Fallback update in offline / demo mode
      setSavedAddress({ ...address });
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-fade-in">
      {/* 1. Restaurant Images */}
      <div className="card p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">RESTAURANT IMAGES</h3>
          <div className="space-y-3">
            <MockUploadCard
              label="Restaurant Logo"
              uploaded={images.logo}
              onUpload={() => setImages((prev) => ({ ...prev, logo: !prev.logo }))}
              icon={ImageIcon}
            />
            <MockUploadCard
              label="Cover Photo"
              uploaded={images.cover}
              onUpload={() => setImages((prev) => ({ ...prev, cover: !prev.cover }))}
              icon={ImageIcon}
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 mt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            disabled={!isImagesDirty || updatingImages}
            onClick={handleUpdateImages}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            {updatingImages ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Update</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Basic Information */}
      <div className="card p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">BASIC INFORMATION</h3>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Restaurant Name</label>
            <input
              className="input mt-1"
              value={basic.name}
              onChange={(e) => setBasic((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
            <textarea
              className="input mt-1 resize-none"
              rows={3}
              value={basic.description}
              onChange={(e) => setBasic((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-10"
                  value={basic.phone}
                  onChange={(e) => setBasic((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className="input pl-10"
                  value={basic.email}
                  onChange={(e) => setBasic((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 mt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            disabled={!isBasicDirty || updatingBasic}
            onClick={handleUpdateBasic}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            {updatingBasic ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Update</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Address */}
      <div className="card p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">ADDRESS</h3>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Address Line 1</label>
            <input
              className="input mt-1"
              value={address.addressLine1}
              onChange={(e) => setAddress((prev) => ({ ...prev, addressLine1: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Address Line 2</label>
            <input
              className="input mt-1"
              value={address.addressLine2}
              onChange={(e) => setAddress((prev) => ({ ...prev, addressLine2: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">City</label>
              <input
                className="input mt-1"
                value={address.city}
                onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">State</label>
              <input
                className="input mt-1"
                value={address.state}
                onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Postal Code</label>
              <input
                className="input mt-1"
                value={address.postalCode}
                onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 mt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            disabled={!isAddressDirty || updatingAddress}
            onClick={handleUpdateAddress}
            className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            {updatingAddress ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Update</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Rating (read-only) */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">RATING</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentRating.average.toFixed(1)}
              </span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(currentRating.average)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 dark:text-gray-700'
                    }`}
                  />
                ))}
              </div>
              {currentRating.totalReviews > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  ({currentRating.totalReviews} review{currentRating.totalReviews === 1 ? '' : 's'})
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Customer ratings are calculated automatically and cannot be edited.
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-amber-500" />
          </div>
        </div>
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

interface AccountTabProps {
  ownerProfile?: OwnerProfileResponse | null;
  isLoading?: boolean;
  isUpdating?: boolean;
  onUpdate?: (payload: OwnerProfileUpdatePayload) => Promise<OwnerProfileResponse>;
  onSave?: () => void;
}

function AccountTab({
  ownerProfile: propOwnerProfile,
  isLoading: propIsLoading,
  isUpdating: propIsUpdating,
  onUpdate: propOnUpdate,
}: AccountTabProps) {
  const hookResult = useOwnerProfile({ autoFetch: propOwnerProfile === undefined });
  const ownerProfile = propOwnerProfile !== undefined ? propOwnerProfile : hookResult.ownerProfile;
  const isLoading = propIsLoading !== undefined ? propIsLoading : hookResult.isLoading;
  const isUpdating = propIsUpdating !== undefined ? propIsUpdating : hookResult.isUpdating;
  const updateOwnerProfile = propOnUpdate || hookResult.updateOwnerProfile;

  const [savedOwner, setSavedOwner] = useState({
    name: ownerProfile?.name || mockRestaurantOwner.name,
    email: ownerProfile?.email || mockRestaurantOwner.email,
    phone: ownerProfile?.phone || mockRestaurantOwner.phone,
  });

  const [formData, setFormData] = useState({
    name: ownerProfile?.name || mockRestaurantOwner.name,
    email: ownerProfile?.email || mockRestaurantOwner.email,
    phone: ownerProfile?.phone || mockRestaurantOwner.phone,
  });

  useEffect(() => {
    if (ownerProfile) {
      const next = {
        name: ownerProfile.name || '',
        email: ownerProfile.email || '',
        phone: ownerProfile.phone || '',
      };
      setSavedOwner(next);
      setFormData(next);
    }
  }, [ownerProfile]);

  const isOwnerDirty =
    formData.name.trim() !== (savedOwner.name || '').trim() ||
    formData.email.trim() !== (savedOwner.email || '').trim() ||
    formData.phone.trim() !== (savedOwner.phone || '').trim();

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const update = (field: 'name' | 'email' | 'phone', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateOwner = async () => {
    if (isUpdating) return;

    try {
      const payload: OwnerProfileUpdatePayload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      };

      const updated = await updateOwnerProfile(payload);
      const next = {
        name: updated?.name ?? formData.name,
        email: updated?.email ?? formData.email,
        phone: updated?.phone ?? formData.phone,
      };
      setSavedOwner(next);
      setFormData(next);
    } catch {
      // Toast notification is handled by the hook
    }
  };

  const handleChangePassword = () => {
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    setPasswordError('');
    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 1000);
  };

  // Read-only verification status directly from backend response
  const isVerified = ownerProfile ? Boolean(ownerProfile.is_verified) : mockRestaurantOwner.isVerified;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Owner info */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">OWNER DETAILS</h3>
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-brand-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading profile...
            </span>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Full Name</label>
          <input
            className="input mt-1"
            value={formData.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Rahul Sharma"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
            <input
              className="input mt-1"
              type="email"
              value={formData.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="e.g. owner@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
            <input
              className="input mt-1"
              type="tel"
              value={formData.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleUpdateOwner}
          disabled={isUpdating}
          className="btn-secondary text-sm"
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Updating...
            </>
          ) : (
            'Update'
          )}
        </button>
      </div>

      {/* Verification status (Read-only from backend) */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">VERIFICATION STATUS</h3>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isVerified ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'
          }`}>
            {isVerified ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-amber-500" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {isVerified ? 'Verified Account' : 'Pending Verification'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {isVerified ? 'Your account is verified and active' : 'Your account is under review'}
            </p>
          </div>
          <span className={`badge ${isVerified ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {isVerified ? 'Verified' : 'Pending'}
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
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
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
        <button type="button" onClick={handleChangePassword} disabled={passwordLoading} className="btn-secondary text-sm">
          {passwordLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
        </button>
      </div>
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

function SaveCancelButtons({
  onSave,
  onCancel,
  loading = false,
  disabled = false,
}: {
  onSave: () => void;
  onCancel?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading || disabled}
        className="btn-secondary flex-1"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={loading || disabled}
        className="btn-primary flex-1"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
