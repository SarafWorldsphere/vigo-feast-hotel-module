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
  Plus, Trash2, AlertCircle, CalendarDays, RefreshCw,
} from 'lucide-react';
import {
  useWeeklySchedule,
  useSpecialDates,
  useOrderSettings,
  computePausedUntilIST,
  type SpecialHoursResponse,
  type SpecialHoursInput,
} from '@/hooks/useRestaurantHours';

type Tab = 'profile' | 'hours' | 'status' | 'account' | 'payouts';

const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
  { id: 'profile', label: 'Profile', icon: Store },
  { id: 'hours', label: 'Operating Hours', icon: Clock },
  { id: 'status', label: 'Online Status', icon: Wifi },
  { id: 'account', label: 'Account', icon: User },
  { id: 'payouts', label: 'Payout Details', icon: Wallet },
];

export function SettingsPage() {
  const { addToast, settingsInitialTab, setSettingsInitialTab } = useApp();
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
  const [activeTab, setActiveTab] = useState<Tab>(settingsInitialTab || 'profile');
  const [isHoursDirty, setIsHoursDirty] = useState(false);

  useEffect(() => {
    if (settingsInitialTab) {
      setActiveTab(settingsInitialTab);
      setSettingsInitialTab(null);
    }
  }, [settingsInitialTab, setSettingsInitialTab]);

  useEffect(() => {
    if (!isProfileLoading && !isOwnerLoading) {
      setLoading(false);
    }
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [isProfileLoading, isOwnerLoading]);

  const handleTabChange = (nextTab: Tab) => {
    if (activeTab === 'hours' && isHoursDirty && nextTab !== 'hours') {
      const confirmLeave = window.confirm(
        'You have unsaved changes in Operating Hours. Discard changes?'
      );
      if (!confirmLeave) return;
      setIsHoursDirty(false);
    }
    setActiveTab(nextTab);
  };

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
              onClick={() => handleTabChange(tab.id)}
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
            isDirty={isHoursDirty}
            onDirtyChange={setIsHoursDirty}
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

// ─── Operating Hours Types & Validation Helpers ─────────────────────────────

type SlotTypeLocal = 'OPERATING' | 'ONLINE_ORDERING';

interface LocalSlot {
  id?: string;
  slot_type: SlotTypeLocal;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
}

interface LocalDay {
  id?: string;
  day_of_week: number;
  is_operating_closed: boolean;
  is_ordering_closed: boolean;
  operating_slots: LocalSlot[];
  ordering_slots: LocalSlot[];
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function toHHMM(t: string | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${(h || '').padStart(2, '0')}:${(m || '').padStart(2, '0')}`;
}

function fromHHMM(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  return `${(h || '').padStart(2, '0')}:${(m || '').padStart(2, '0')}:00`;
}

function parseTimeToMinutes(t: string): number | null {
  if (!t) return null;
  const parts = t.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Check per-slot errors for a list of slots of the same type on the same day.
// Returns an array of error messages (or null) corresponding 1-to-1 with slots array.
function getSlotErrors(slots: LocalSlot[]): (string | null)[] {
  const errors: (string | null)[] = slots.map(() => null);

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (!s.start_time || !s.end_time) {
      errors[i] = 'Start and end time are required.';
      continue;
    }
    if (s.start_time === s.end_time) {
      errors[i] = 'Start and end cannot be equal.';
      continue;
    }
  }

  // Overlap validation among slots that have valid distinct start and end times
  for (let i = 0; i < slots.length; i++) {
    if (errors[i]) continue;
    const sA = parseTimeToMinutes(slots[i].start_time)!;
    const eA = parseTimeToMinutes(slots[i].end_time)!;
    const isOvernightA = eA < sA;

    for (let j = i + 1; j < slots.length; j++) {
      if (errors[j] && !errors[j]?.startsWith('Overlaps')) continue;
      const sB = parseTimeToMinutes(slots[j].start_time)!;
      const eB = parseTimeToMinutes(slots[j].end_time)!;
      const isOvernightB = eB < sB;

      let overlap = false;

      if (!isOvernightA && !isOvernightB) {
        overlap = Math.max(sA, sB) < Math.min(eA, eB);
      } else if (isOvernightA && isOvernightB) {
        // Two overnight slots starting on the same day both run to midnight -> always overlap!
        overlap = true;
      } else if (isOvernightA && !isOvernightB) {
        overlap = eB > sA || sB < eA;
      } else if (!isOvernightA && isOvernightB) {
        overlap = eA > sB || sA < eB;
      }

      if (overlap) {
        const msgA = `Overlaps with slot ${j + 1} (${slots[j].start_time}–${slots[j].end_time}).`;
        const msgB = `Overlaps with slot ${i + 1} (${slots[i].start_time}–${slots[i].end_time}).`;
        errors[i] = errors[i] || msgA;
        errors[j] = errors[j] || msgB;
      }
    }
  }

  return errors;
}

// Non-blocking warning: check if online ordering hours extend outside operating hours
function getOrderingOutsideOperatingWarning(day: LocalDay): string | null {
  if (day.is_ordering_closed || !day.ordering_slots.length) return null;

  if (day.is_operating_closed || !day.operating_slots.length) {
    return 'Online ordering is scheduled while operating hours are marked closed.';
  }

  const opOccupied = new Uint8Array(1440);
  for (const s of day.operating_slots) {
    const sMin = parseTimeToMinutes(s.start_time);
    const eMin = parseTimeToMinutes(s.end_time);
    if (sMin === null || eMin === null || sMin === eMin) continue;

    if (eMin > sMin) {
      for (let m = sMin; m < eMin; m++) opOccupied[m] = 1;
    } else {
      // Overnight
      for (let m = sMin; m < 1440; m++) opOccupied[m] = 1;
      for (let m = 0; m < eMin; m++) opOccupied[m] = 1;
    }
  }

  for (const s of day.ordering_slots) {
    const sMin = parseTimeToMinutes(s.start_time);
    const eMin = parseTimeToMinutes(s.end_time);
    if (sMin === null || eMin === null || sMin === eMin) continue;

    let hasUncovered = false;
    if (eMin > sMin) {
      for (let m = sMin; m < eMin; m++) {
        if (!opOccupied[m]) {
          hasUncovered = true;
          break;
        }
      }
    } else {
      for (let m = sMin; m < 1440; m++) {
        if (!opOccupied[m]) {
          hasUncovered = true;
          break;
        }
      }
      if (!hasUncovered) {
        for (let m = 0; m < eMin; m++) {
          if (!opOccupied[m]) {
            hasUncovered = true;
            break;
          }
        }
      }
    }

    if (hasUncovered) {
      return `Online ordering hours (${s.start_time}–${s.end_time}) extend outside configured operating hours.`;
    }
  }

  return null;
}

// Convert backend WeeklyScheduleResponse.days → LocalDay[]
function backendDaysToLocal(days: any[]): LocalDay[] {
  const sorted = [...days].sort((a, b) => a.day_of_week - b.day_of_week);
  return sorted.map((d) => {
    const all: LocalSlot[] = (d.slots || []).map((s: any) => ({
      id: s.id,
      slot_type: s.slot_type,
      start_time: toHHMM(s.start_time),
      end_time: toHHMM(s.end_time),
    }));
    const opSlots = all.filter((s) => s.slot_type === 'OPERATING');
    const orSlots = all.filter((s) => s.slot_type === 'ONLINE_ORDERING');
    return {
      id: d.id,
      day_of_week: d.day_of_week,
      is_operating_closed: d.is_closed || opSlots.length === 0,
      is_ordering_closed: d.is_closed || orSlots.length === 0,
      operating_slots: d.is_closed ? [] : opSlots,
      ordering_slots: d.is_closed ? [] : orSlots,
    };
  });
}

function defaultLocalDays(): LocalDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i + 1,
    is_operating_closed: true,
    is_ordering_closed: true,
    operating_slots: [],
    ordering_slots: [],
  }));
}

// Convert LocalDay[] → WeeklyDayInput[] for backend API
function localDaysToPayload(days: LocalDay[]) {
  return days.map((d) => {
    const allClosed = d.is_operating_closed && d.is_ordering_closed;
    if (allClosed) {
      return { day_of_week: d.day_of_week, is_closed: true, slots: [] };
    }
    const slots = [
      ...(!d.is_operating_closed
        ? d.operating_slots.map((s) => ({
            slot_type: 'OPERATING' as const,
            start_time: fromHHMM(s.start_time),
            end_time: fromHHMM(s.end_time),
          }))
        : []),
      ...(!d.is_ordering_closed
        ? d.ordering_slots.map((s) => ({
            slot_type: 'ONLINE_ORDERING' as const,
            start_time: fromHHMM(s.start_time),
            end_time: fromHHMM(s.end_time),
          }))
        : []),
    ];
    return {
      day_of_week: d.day_of_week,
      is_closed: slots.length === 0,
      slots,
    };
  });
}

// ─── SlotRow Component ───────────────────────────────────────────────────────

function SlotRow({
  slot,
  onChange,
  onDelete,
  error,
}: {
  slot: LocalSlot;
  onChange: (s: LocalSlot) => void;
  onDelete: () => void;
  error?: string | null;
}) {
  return (
    <div className="space-y-1 animate-fade-in">
      <div className="flex items-center gap-2 group">
        <input
          type="time"
          aria-label="Start time"
          value={slot.start_time}
          onChange={(e) => onChange({ ...slot, start_time: e.target.value })}
          className={`input py-1.5 text-xs flex-1 min-w-0 ${error ? 'border-red-400 focus:border-red-500' : ''}`}
        />
        <span className="text-gray-400 text-xs shrink-0 font-medium">→</span>
        <input
          type="time"
          aria-label="End time"
          value={slot.end_time}
          onChange={(e) => onChange({ ...slot, end_time: e.target.value })}
          className={`input py-1.5 text-xs flex-1 min-w-0 ${error ? 'border-red-400 focus:border-red-500' : ''}`}
        />
        <button
          type="button"
          aria-label="Remove slot"
          onClick={onDelete}
          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500 font-medium pl-1 animate-fade-in">{error}</p>}
    </div>
  );
}

// ─── SlotSection Component ───────────────────────────────────────────────────

function SlotSection({
  label,
  isClosed,
  slots,
  errors,
  onToggleClosed,
  onSlotChange,
  onAddSlot,
  onDeleteSlot,
}: {
  label: string;
  isClosed: boolean;
  slots: LocalSlot[];
  errors: (string | null)[];
  onToggleClosed: () => void;
  onSlotChange: (i: number, s: LocalSlot) => void;
  onAddSlot: () => void;
  onDeleteSlot: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <button
          type="button"
          onClick={onToggleClosed}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            isClosed
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
          }`}
        >
          {isClosed ? 'Closed' : 'Open'}
        </button>
      </div>
      {!isClosed && (
        <div className="space-y-2 pl-2 border-l-2 border-gray-100 dark:border-gray-800">
          {slots.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">No time slots added. Click Add slot below.</p>
          ) : (
            slots.map((s, i) => (
              <SlotRow
                key={i}
                slot={s}
                onChange={(updated) => onSlotChange(i, updated)}
                onDelete={() => onDeleteSlot(i)}
                error={errors[i]}
              />
            ))
          )}
          <button
            type="button"
            onClick={onAddSlot}
            className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors pt-0.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add slot
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DayCard Component ───────────────────────────────────────────────────────

function DayCard({
  day,
  onChange,
}: {
  day: LocalDay;
  onChange: (updated: LocalDay) => void;
}) {
  const opErrors = getSlotErrors(day.operating_slots);
  const orErrors = getSlotErrors(day.ordering_slots);
  const warning = getOrderingOutsideOperatingWarning(day);

  function addSlot(type: 'OPERATING' | 'ORDERING') {
    const blank: LocalSlot = {
      slot_type: type === 'OPERATING' ? 'OPERATING' : 'ONLINE_ORDERING',
      start_time: '',
      end_time: '',
    };
    if (type === 'OPERATING') {
      onChange({ ...day, operating_slots: [...day.operating_slots, blank] });
    } else {
      onChange({ ...day, ordering_slots: [...day.ordering_slots, blank] });
    }
  }

  function updateSlot(type: 'OPERATING' | 'ORDERING', i: number, s: LocalSlot) {
    if (type === 'OPERATING') {
      const next = day.operating_slots.map((x, idx) => (idx === i ? s : x));
      onChange({ ...day, operating_slots: next });
    } else {
      const next = day.ordering_slots.map((x, idx) => (idx === i ? s : x));
      onChange({ ...day, ordering_slots: next });
    }
  }

  function deleteSlot(type: 'OPERATING' | 'ORDERING', i: number) {
    if (type === 'OPERATING') {
      onChange({ ...day, operating_slots: day.operating_slots.filter((_, idx) => idx !== i) });
    } else {
      onChange({ ...day, ordering_slots: day.ordering_slots.filter((_, idx) => idx !== i) });
    }
  }

  const isBothClosed = day.is_operating_closed && day.is_ordering_closed;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isBothClosed
          ? 'border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-subtle'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {DAY_NAMES[day.day_of_week]}
        </h4>
        {isBothClosed ? (
          <span className="badge bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Closed
          </span>
        ) : (
          <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Open
          </span>
        )}
      </div>

      <div className="space-y-4">
        <SlotSection
          label="Operating Hours"
          isClosed={day.is_operating_closed}
          slots={day.operating_slots}
          errors={opErrors}
          onToggleClosed={() => {
            const nextClosed = !day.is_operating_closed;
            onChange({
              ...day,
              is_operating_closed: nextClosed,
              operating_slots: nextClosed ? [] : day.operating_slots.length ? day.operating_slots : [{ slot_type: 'OPERATING', start_time: '09:00', end_time: '22:00' }],
            });
          }}
          onSlotChange={(i, s) => updateSlot('OPERATING', i, s)}
          onAddSlot={() => addSlot('OPERATING')}
          onDeleteSlot={(i) => deleteSlot('OPERATING', i)}
        />

        <SlotSection
          label="Online Ordering"
          isClosed={day.is_ordering_closed}
          slots={day.ordering_slots}
          errors={orErrors}
          onToggleClosed={() => {
            const nextClosed = !day.is_ordering_closed;
            onChange({
              ...day,
              is_ordering_closed: nextClosed,
              ordering_slots: nextClosed ? [] : day.ordering_slots.length ? day.ordering_slots : [{ slot_type: 'ONLINE_ORDERING', start_time: '09:30', end_time: '21:30' }],
            });
          }}
          onSlotChange={(i, s) => updateSlot('ORDERING', i, s)}
          onAddSlot={() => addSlot('ORDERING')}
          onDeleteSlot={(i) => deleteSlot('ORDERING', i)}
        />

        {warning && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>{warning}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Special Date Modal ───────────────────────────────────────────────────────

function SpecialDateModal({
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  initial?: SpecialHoursResponse | null;
  onClose: () => void;
  onSave: (payload: SpecialHoursInput) => Promise<boolean>;
  isSaving: boolean;
}) {
  const [date, setDate] = useState(initial?.special_date || '');
  const [isClosed, setIsClosed] = useState(initial?.is_closed ?? false);
  const [note, setNote] = useState(initial?.note || '');
  const [opSlots, setOpSlots] = useState<LocalSlot[]>(
    (initial?.slots || [])
      .filter((s) => s.slot_type === 'OPERATING')
      .map((s) => ({
        id: s.id,
        slot_type: 'OPERATING',
        start_time: toHHMM(s.start_time),
        end_time: toHHMM(s.end_time),
      }))
  );
  const [orSlots, setOrSlots] = useState<LocalSlot[]>(
    (initial?.slots || [])
      .filter((s) => s.slot_type === 'ONLINE_ORDERING')
      .map((s) => ({
        id: s.id,
        slot_type: 'ONLINE_ORDERING',
        start_time: toHHMM(s.start_time),
        end_time: toHHMM(s.end_time),
      }))
  );
  const [formError, setFormError] = useState('');

  const opErrors = getSlotErrors(opSlots);
  const orErrors = getSlotErrors(orSlots);

  async function handleSave() {
    if (!date) {
      setFormError('Please select a date.');
      return;
    }
    if (!isClosed) {
      const hasOpErr = opErrors.some(Boolean);
      const hasOrErr = orErrors.some(Boolean);
      if (hasOpErr || hasOrErr) {
        setFormError('Please resolve all slot errors before saving.');
        return;
      }
    }
    setFormError('');
    const slots = [
      ...opSlots.map((s) => ({
        slot_type: 'OPERATING' as const,
        start_time: fromHHMM(s.start_time),
        end_time: fromHHMM(s.end_time),
      })),
      ...orSlots.map((s) => ({
        slot_type: 'ONLINE_ORDERING' as const,
        start_time: fromHHMM(s.start_time),
        end_time: fromHHMM(s.end_time),
      })),
    ];
    const payload: SpecialHoursInput = {
      special_date: date,
      is_closed: isClosed,
      note: note || null,
      slots: isClosed ? [] : slots,
    };
    const ok = await onSave(payload);
    if (ok) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Special date editor"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg card p-5 shadow-elevated animate-slide-up space-y-4 max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {initial ? 'Edit Special Date' : 'Add Special Date'}
            </h3>
            <p className="text-xs text-gray-400">Overrides weekly schedule for this calendar date</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input mt-1"
              aria-label="Special date"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Festival hours, Maintenance"
              className="input mt-1"
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Entire day closed</span>
              <p className="text-[11px] text-gray-400">Restaurant will not operate or accept orders</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isClosed}
              onClick={() => setIsClosed((p) => !p)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                isClosed ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            >
              <span className="sr-only">Toggle closed</span>
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  isClosed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {!isClosed && (
            <div className="space-y-4 animate-fade-in pt-1">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Operating Hours</p>
                <div className="space-y-2 pl-2 border-l-2 border-gray-100 dark:border-gray-800">
                  {opSlots.map((s, i) => (
                    <SlotRow
                      key={i}
                      slot={s}
                      onChange={(u) => setOpSlots((p) => p.map((x, idx) => (idx === i ? u : x)))}
                      onDelete={() => setOpSlots((p) => p.filter((_, idx) => idx !== i))}
                      error={opErrors[i]}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setOpSlots((p) => [...p, { slot_type: 'OPERATING', start_time: '', end_time: '' }])
                    }
                    className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add operating slot
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Online Ordering</p>
                <div className="space-y-2 pl-2 border-l-2 border-gray-100 dark:border-gray-800">
                  {orSlots.map((s, i) => (
                    <SlotRow
                      key={i}
                      slot={s}
                      onChange={(u) => setOrSlots((p) => p.map((x, idx) => (idx === i ? u : x)))}
                      onDelete={() => setOrSlots((p) => p.filter((_, idx) => idx !== i))}
                      error={orErrors[i]}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setOrSlots((p) => [...p, { slot_type: 'ONLINE_ORDERING', start_time: '', end_time: '' }])
                    }
                    className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add ordering slot
                  </button>
                </div>
              </div>
            </div>
          )}

          {formError && <p className="text-xs text-red-500 animate-fade-in font-medium">{formError}</p>}
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm py-2">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex-1 text-sm py-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HoursTab Component ───────────────────────────────────────────────────────

function HoursTab({
  isDirty,
  onDirtyChange,
  onSave: _onSave,
}: {
  isDirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSave: () => void;
}) {
  const { schedule, isLoading, isSaving, refetch, saveSchedule } = useWeeklySchedule();
  const {
    specialDates,
    isLoading: isLoadingSpecial,
    isMutating: isMutatingSpecial,
    createDate,
    updateDate,
    deleteDate,
  } = useSpecialDates();

  const [days, setDays] = useState<LocalDay[]>([]);
  const [savedDays, setSavedDays] = useState<LocalDay[]>([]);
  const [formError, setFormError] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<SpecialHoursResponse | null>(null);

  useEffect(() => {
    if (schedule?.days?.length) {
      const local = backendDaysToLocal(schedule.days);
      setDays(local);
      setSavedDays(local);
      onDirtyChange(false);
    } else if (!isLoading) {
      const def = defaultLocalDays();
      setDays(def);
      setSavedDays(def);
    }
  }, [schedule, isLoading, onDirtyChange]);

  // Window beforeunload warning when isDirty
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function handleDayChange(i: number, updated: LocalDay) {
    setDays((prev) => {
      const next = prev.map((d, idx) => (idx === i ? updated : d));
      const dirty = JSON.stringify(next) !== JSON.stringify(savedDays);
      onDirtyChange(dirty);
      return next;
    });
    setFormError('');
  }

  async function handleSave() {
    // Validate all 7 days
    for (const d of days) {
      if (!d.is_operating_closed) {
        const opErr = getSlotErrors(d.operating_slots);
        const firstErr = opErr.find(Boolean);
        if (firstErr) {
          setFormError(`${DAY_NAMES[d.day_of_week]} (Operating): ${firstErr}`);
          return;
        }
      }
      if (!d.is_ordering_closed) {
        const orErr = getSlotErrors(d.ordering_slots);
        const firstErr = orErr.find(Boolean);
        if (firstErr) {
          setFormError(`${DAY_NAMES[d.day_of_week]} (Online Ordering): ${firstErr}`);
          return;
        }
      }
    }
    setFormError('');
    const payload = localDaysToPayload(days);
    const ok = await saveSchedule(payload);
    if (ok) {
      setSavedDays([...days]);
      onDirtyChange(false);
      _onSave();
    }
  }

  function handleCancel() {
    setDays([...savedDays]);
    onDirtyChange(false);
    setFormError('');
  }

  const skeletonRows = Array.from({ length: 7 });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Weekly Schedule Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              WEEKLY SCHEDULE
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Set standard operating and online ordering time slots for Monday through Sunday
            </p>
          </div>
          <button
            onClick={() => refetch()}
            aria-label="Refresh schedule"
            className="btn-ghost p-1.5 text-gray-400 hover:text-brand-500 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {skeletonRows.map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((d, i) => (
              <DayCard key={d.day_of_week} day={d} onChange={(u) => handleDayChange(i, u)} />
            ))}
          </div>
        )}

        {formError && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs animate-fade-in font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Sticky / Floating Save / Cancel bar */}
        <div
          className={`flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 transition-all ${
            isDirty ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="btn-secondary flex-1 text-sm py-2.5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="btn-primary flex-1 text-sm py-2.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes…
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Special Dates Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-brand-500" />
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                SPECIAL DATES & HOLIDAYS
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Override weekly hours for festivals, maintenance, or holiday closures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingSpecial(null);
              setModalOpen(true);
            }}
            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Date
          </button>
        </div>

        {isLoadingSpecial ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : specialDates.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No special dates configured</p>
            <p className="text-xs mt-1">Add holiday hours, festival schedules, or closures here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...specialDates]
              .sort((a, b) => a.special_date.localeCompare(b.special_date))
              .map((sd) => (
                <div
                  key={sd.id}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(sd.special_date + 'T00:00:00').toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {sd.is_closed ? (
                        <span className="badge bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px]">
                          Closed
                        </span>
                      ) : (
                        <span className="badge bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">
                          Open
                        </span>
                      )}
                    </div>
                    {sd.note && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate font-medium">
                        {sd.note}
                      </p>
                    )}
                    {!sd.is_closed && sd.slots.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {sd.slots
                          .map(
                            (s) =>
                              `${s.slot_type === 'OPERATING' ? 'Op' : 'Orders'}: ${toHHMM(
                                s.start_time
                              )}–${toHHMM(s.end_time)}`
                          )
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label="Edit special date"
                      onClick={() => {
                        setEditingSpecial(sd);
                        setModalOpen(true);
                      }}
                      className="btn-ghost p-1.5 text-gray-400 hover:text-brand-500 rounded-lg"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === sd.id ? (
                      <div className="flex items-center gap-1 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="btn-ghost py-1 px-2 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isMutatingSpecial}
                          onClick={async () => {
                            await deleteDate(sd.id);
                            setConfirmDeleteId(null);
                          }}
                          className="btn-danger py-1 px-2.5 text-xs"
                        >
                          {isMutatingSpecial ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="Delete special date"
                        onClick={() => setConfirmDeleteId(sd.id)}
                        className="btn-ghost p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <SpecialDateModal
          initial={editingSpecial}
          onClose={() => {
            setModalOpen(false);
            setEditingSpecial(null);
          }}
          onSave={
            editingSpecial
              ? (p) => updateDate(editingSpecial.id, p)
              : (p) => createDate(p)
          }
          isSaving={isMutatingSpecial}
        />
      )}
    </div>
  );
}

// ─── StatusTab Component ──────────────────────────────────────────────────────

function StatusTab() {
  const { settings, availability, isLoading, isMutating, pause, resume } = useOrderSettings();
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
  const isPaused = availability ? availability.is_paused : (settings?.is_paused ?? false);
  const status: 'ONLINE' | 'PAUSED' | 'OFFLINE' = isAcceptingOrders
    ? 'ONLINE'
    : isPaused
    ? 'PAUSED'
    : 'OFFLINE';
  const pausedUntil = settings?.paused_until ? new Date(settings.paused_until) : null;

  async function handlePause() {
    if (selectedDuration === null) return;
    const paused_until = computePausedUntilIST(selectedDuration);
    const ok = await pause({ reason: reason || null, paused_until });
    if (ok) {
      setShowPauseOptions(false);
      setReason('');
      setSelectedDuration(null);
    }
  }

  async function handleResume() {
    await resume();
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Accepting Orders Card */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
          ACCEPTING ORDERS
        </h3>

        {isLoading ? (
          <div className="skeleton h-20 rounded-xl" />
        ) : (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Store Status</p>
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
                  ? settings?.pause_reason
                    ? `Paused: ${settings.pause_reason}`
                    : 'Online ordering is temporarily paused'
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
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                  Auto-resumes at{' '}
                  {pausedUntil.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            {/* Toggle switch — displayed state reflects backend authoritative state */}
            <button
              type="button"
              role="switch"
              aria-checked={isAcceptingOrders}
              aria-label="Toggle accepting orders"
              onClick={() => {
                if (isPaused) handleResume();
                else setShowPauseOptions((p) => !p);
              }}
              disabled={isMutating}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 ${
                isAcceptingOrders ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className="sr-only">Toggle accepting orders</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  isAcceptingOrders ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Pause options panel */}
        {showPauseOptions && !isPaused && (
          <div className="mt-4 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 space-y-3 animate-fade-in">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              PAUSE DURATION
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {durations.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setSelectedDuration(d.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    selectedDuration === d.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-400 bg-white dark:bg-gray-800'
                  }`}
                >
                  <Clock className="w-4 h-4 text-brand-500" />
                  {d.label}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Kitchen maintenance"
                className="input mt-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPauseOptions(false);
                  setSelectedDuration(null);
                  setReason('');
                }}
                className="btn-secondary flex-1 text-sm py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePause}
                disabled={selectedDuration === null || isMutating}
                className="btn-primary flex-1 text-sm py-2 bg-amber-500 hover:bg-amber-600"
              >
                {isMutating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Pausing…
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" /> Pause Orders
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Resume banner when paused */}
        {isPaused && !isLoading && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 min-w-0">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="font-medium">{settings?.pause_reason || 'Orders are currently paused.'}</span>
            </div>
            <button
              type="button"
              onClick={handleResume}
              disabled={isMutating}
              className="btn-success text-xs py-1.5 px-3 shrink-0"
            >
              {isMutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Resume Now'}
            </button>
          </div>
        )}
      </div>

      {/* Current Availability Breakdown */}
      <div className="card p-5">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
          CURRENT AVAILABILITY BREAKDOWN
        </h3>
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-5 rounded-lg w-3/4" />
            <div className="skeleton h-5 rounded-lg w-1/2" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Operating Hours Window</span>
              <span
                className={`text-xs font-semibold ${
                  availability?.is_operating_now ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {availability?.is_operating_now ? 'Currently Operating' : 'Outside Operating Hours'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Online Ordering Window</span>
              <span
                className={`text-xs font-semibold ${
                  availability?.is_ordering_now ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {availability?.is_ordering_now ? 'In Ordering Window' : 'Outside Ordering Hours'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Temporary Pause State</span>
              <span
                className={`text-xs font-semibold ${
                  isPaused ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isPaused ? 'Paused by Owner' : 'Not Paused'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Order Acceptance Status</span>
              <span
                className={`text-xs font-semibold ${
                  isAcceptingOrders ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}
              >
                {isAcceptingOrders ? 'Accepting Orders' : 'Not Accepting Orders'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">Status Reason Code</span>
              <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
                {availability?.reason || (isPaused ? 'TEMPORARILY_PAUSED' : 'OUTSIDE_OPERATING_HOURS')}
              </span>
            </div>
            {availability?.next_change_at && (
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">Next Schedule Boundary</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {new Date(availability.next_change_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {pausedUntil && (
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">Scheduled Resume Time</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {pausedUntil.toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            {settings?.pause_reason && (
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">Pause Reason</span>
                <span className="text-xs font-medium text-gray-900 dark:text-white">{settings.pause_reason}</span>
              </div>
            )}
            <div className="pt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Note: Live availability reflects your weekly & special-date schedules, operating vs ordering windows, and owner pause state in real time.
            </div>
          </div>
        )}
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
  const [accountHolder, setAccountHolder] = useState('VIGO FEAST Restaurant');
  const [upiId, setUpiId] = useState('vigofeast@hdfc');

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
