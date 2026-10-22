import { useState, useCallback } from 'react';
import {
  apiExportAnalytics,
  triggerCsvDownload,
  type ExportAnalyticsParams,
} from '@/services/api';
import type { AnalyticsPeriod } from '@/hooks/useAnalyticsOverview';

export type { ExportAnalyticsParams };

export interface UseExportAnalyticsOptions {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

export interface UseExportAnalyticsReturn {
  isExporting: boolean;
  error: string | null;
  exportCsv: (paramsOverride?: ExportAnalyticsParams) => Promise<boolean>;
}

/**
 * Custom React hook to call GET /api/v1/analytics/export?period=month (or specified period/range)
 * and trigger downloading the menu performance CSV export.
 */
export function useExportAnalytics(
  options: UseExportAnalyticsOptions = {}
): UseExportAnalyticsReturn {
  const {
    period = 'month',
    startDate,
    endDate,
  } = options;

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const exportCsv = useCallback(
    async (paramsOverride?: ExportAnalyticsParams): Promise<boolean> => {
      setIsExporting(true);
      setError(null);
      try {
        const queryParams: ExportAnalyticsParams = paramsOverride || (
          startDate && endDate
            ? { period: 'custom', start_date: startDate, end_date: endDate }
            : { period }
        );

        if (queryParams.period === 'custom' && (!queryParams.start_date || !queryParams.end_date)) {
          setError('Both start date and end date are required for custom period export');
          return false;
        }

        const { blob, filename } = await apiExportAnalytics(queryParams);
        triggerCsvDownload(blob, filename);
        return true;
      } catch (err: any) {
        const message = err?.message || 'Failed to export analytics CSV';
        setError(message);
        console.warn('Could not export analytics CSV:', err);
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [period, startDate, endDate]
  );

  return {
    isExporting,
    error,
    exportCsv,
  };
}
