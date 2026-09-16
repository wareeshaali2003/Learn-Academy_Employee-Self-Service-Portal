import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

export type DashboardData = {
  notification_count: number;
  last_log_type: string;
  last_log_time: string;
  leave_balance: any[];
  employee_name: string;
  employee_image: string | null;
  company: string;
  latest_salary_slip: any;
  notice_board: any[];
};

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      if (res.ok) {
        setData(res.data as DashboardData);
      } else {
        setError(res.error || "Failed to load dashboard");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};