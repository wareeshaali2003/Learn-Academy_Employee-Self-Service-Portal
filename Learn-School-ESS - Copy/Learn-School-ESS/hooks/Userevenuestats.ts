// hooks/Userevenuestats.ts
import { useState, useEffect, useCallback } from 'react';
import { api, RevenueStats } from '../services/api'; // import the type from its source of truth

interface UseRevenueStatsParams {
  fromDate: string;
  toDate: string;
}

interface UseRevenueStatsResult {
  data: RevenueStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRevenueStats({ fromDate, toDate }: UseRevenueStatsParams): UseRevenueStatsResult {
  const [data, setData] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getRevenueStats({ from_date: fromDate, to_date: toDate });
      if (!result.ok) {
        console.warn('[useRevenueStats] getRevenueStats failed:', result.error);
        setError((result as any).error ?? 'Failed to load revenue stats');
        setData(null);
        return;
      }
      setData(result.data);
    } catch (err) {
      console.error('❌ [useRevenueStats] error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load revenue stats');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
}