import { useState, useEffect, useCallback } from "react";
type SalarySlip = Record<string, any>;
import { api } from "../services/api";

function asArray<T>(val: any): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

export const useSalarySlip = () => {
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.getSalarySlips();

      if (res.ok) {
        setSlips(asArray<SalarySlip>(res.data));
      } else {
        setSlips([]);
        setError(res.error || "Failed to load salary slips");
      }
    } catch (e: any) {
      setSlips([]);
      setError(e?.message || "Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    slips,
    loading,
    error,     // ✅ can show "No salary slips available"
    refetch: fetchData,
  };
};
