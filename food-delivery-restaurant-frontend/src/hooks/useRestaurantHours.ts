import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  apiGetWeeklySchedule,
  apiPutWeeklySchedule,
  apiGetSpecialDates,
  apiCreateSpecialDate,
  apiUpdateSpecialDate,
  apiDeleteSpecialDate,
  apiGetOrderSettings,
  apiPauseOrders,
  apiResumeOrders,
  type WeeklyScheduleResponse,
  type WeeklyDayInput,
  type SpecialHoursResponse,
  type SpecialHoursInput,
  type OrderSettingsResponse,
  type PauseOrdersInput,
  type RestaurantAvailabilityResponse,
} from '@/services/api';

export type {
  WeeklyScheduleResponse,
  WeeklyDayInput,
  SpecialHoursResponse,
  SpecialHoursInput,
  OrderSettingsResponse,
  PauseOrdersInput,
  RestaurantAvailabilityResponse,
};

// ─── Weekly Schedule ──────────────────────────────────────────────────────────

export interface UseWeeklyScheduleReturn {
  schedule: WeeklyScheduleResponse | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  refetch: () => Promise<WeeklyScheduleResponse | null>;
  saveSchedule: (days: WeeklyDayInput[]) => Promise<boolean>;
}

export function useWeeklySchedule(autoFetch = true): UseWeeklyScheduleReturn {
  const { addToast, loadAvailability } = useApp();
  const [schedule, setSchedule] = useState<WeeklyScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<WeeklyScheduleResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetWeeklySchedule();
      setSchedule(data);
      return data;
    } catch (err: any) {
      const msg = err?.message || 'Failed to load weekly schedule';
      setError(msg);
      console.warn('Could not load weekly schedule:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) refetch();
  }, [autoFetch, refetch]);

  const saveSchedule = useCallback(
    async (days: WeeklyDayInput[]): Promise<boolean> => {
      setIsSaving(true);
      try {
        const updated = await apiPutWeeklySchedule({ days });
        setSchedule(updated);
        await loadAvailability();
        addToast({ type: 'success', title: 'Hours saved', message: 'Weekly schedule updated successfully.' });
        return true;
      } catch (err: any) {
        addToast({ type: 'error', title: 'Save failed', message: err?.message || 'Failed to save weekly schedule.' });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [addToast, loadAvailability]
  );

  return { schedule, isLoading, isSaving, error, refetch, saveSchedule };
}

// ─── Special Dates ────────────────────────────────────────────────────────────

export interface UseSpecialDatesReturn {
  specialDates: SpecialHoursResponse[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createDate: (payload: SpecialHoursInput) => Promise<boolean>;
  updateDate: (id: string, payload: SpecialHoursInput) => Promise<boolean>;
  deleteDate: (id: string) => Promise<boolean>;
}

export function useSpecialDates(autoFetch = true): UseSpecialDatesReturn {
  const { addToast, loadAvailability } = useApp();
  const [specialDates, setSpecialDates] = useState<SpecialHoursResponse[]>([]);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetSpecialDates();
      setSpecialDates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load special dates';
      setError(msg);
      console.warn('Could not load special dates:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) refetch();
  }, [autoFetch, refetch]);

  const createDate = useCallback(
    async (payload: SpecialHoursInput): Promise<boolean> => {
      setIsMutating(true);
      try {
        await apiCreateSpecialDate(payload);
        addToast({ type: 'success', title: 'Special date added', message: 'The schedule for that date has been saved.' });
        await refetch();
        await loadAvailability();
        return true;
      } catch (err: any) {
        addToast({ type: 'error', title: 'Failed to add', message: err?.message || 'Could not save special date.' });
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [addToast, refetch, loadAvailability]
  );

  const updateDate = useCallback(
    async (id: string, payload: SpecialHoursInput): Promise<boolean> => {
      setIsMutating(true);
      try {
        await apiUpdateSpecialDate(id, payload);
        addToast({ type: 'success', title: 'Special date updated', message: 'Changes saved.' });
        await refetch();
        await loadAvailability();
        return true;
      } catch (err: any) {
        addToast({ type: 'error', title: 'Update failed', message: err?.message || 'Could not update special date.' });
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [addToast, refetch, loadAvailability]
  );

  const deleteDate = useCallback(
    async (id: string): Promise<boolean> => {
      setIsMutating(true);
      try {
        await apiDeleteSpecialDate(id);
        addToast({ type: 'success', title: 'Special date removed', message: 'The override has been deleted.' });
        setSpecialDates((prev) => prev.filter((d) => d.id !== id));
        await loadAvailability();
        return true;
      } catch (err: any) {
        addToast({ type: 'error', title: 'Delete failed', message: err?.message || 'Could not delete special date.' });
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [addToast, loadAvailability]
  );

  return { specialDates, isLoading, isMutating, error, refetch, createDate, updateDate, deleteDate };
}

// ─── Order Settings (pause / resume) ─────────────────────────────────────────

export interface UseOrderSettingsReturn {
  settings: OrderSettingsResponse | null;
  availability: RestaurantAvailabilityResponse | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refetch: () => Promise<OrderSettingsResponse | null>;
  refetchAvailability: () => Promise<RestaurantAvailabilityResponse | null>;
  pause: (payload: PauseOrdersInput) => Promise<boolean>;
  resume: () => Promise<boolean>;
}

// Compute paused_until ISO string in IST (Asia/Kolkata timezone)
export function computePausedUntilIST(minutes: number): string {
  const now = new Date();
  if (minutes === 0) {
    // End of current local calendar day in Asia/Kolkata (UTC +05:30)
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const istDateStr = formatter.format(now);
    return `${istDateStr}T23:59:59+05:30`;
  }
  const targetDate = new Date(now.getTime() + minutes * 60 * 1000);
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(targetDate.getTime() + istOffsetMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = istTime.getUTCFullYear();
  const m = pad(istTime.getUTCMonth() + 1);
  const d = pad(istTime.getUTCDate());
  const h = pad(istTime.getUTCHours());
  const min = pad(istTime.getUTCMinutes());
  const s = pad(istTime.getUTCSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}+05:30`;
}

export function useOrderSettings(autoFetch = true): UseOrderSettingsReturn {
  const {
    orderSettings,
    isOrderSettingsLoading,
    loadOrderSettings,
    availability,
    isAvailabilityLoading,
    loadAvailability,
    pauseOnlineOrders,
    resumeOnlineOrders,
  } = useApp();

  useEffect(() => {
    if (autoFetch) {
      if (!orderSettings) {
        void loadOrderSettings();
      }
      if (!availability) {
        void loadAvailability();
      }
    }
  }, [autoFetch, orderSettings, availability, loadOrderSettings, loadAvailability]);

  return {
    settings: orderSettings,
    availability,
    isLoading: isOrderSettingsLoading || isAvailabilityLoading,
    isMutating: isOrderSettingsLoading,
    error: null,
    refetch: loadOrderSettings,
    refetchAvailability: loadAvailability,
    pause: pauseOnlineOrders,
    resume: resumeOnlineOrders,
  };
}
