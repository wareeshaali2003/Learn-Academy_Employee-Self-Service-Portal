import {
  useState,
  useEffect,
  useCallback,
} from "react";

import {
  api,
  SalarySlipDetail,
} from "../services/api";

// Default to current month — fetching every salary slip ever generated
// for every employee in one call is the same trap Attendance had.
function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from_date: fmt(from), to_date: fmt(to) };
}

export function useAdminSalarySlips(
  initialRange = getDefaultDateRange()
) {
  const [salarySlips, setSalarySlips] = useState<SalarySlipDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(initialRange);

  const load = useCallback(async (r = range) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.getAllSalarySlips(r);

      if (!res.ok) {
        setError(res.error ?? "Failed to load salary slips");
        setSalarySlips([]);
      } else {
        setSalarySlips(res.data);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load salary slips");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const search = useCallback(
    (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return salarySlips;

      return salarySlips.filter(
        (s) =>
          (s.employee_name ?? "").toLowerCase().includes(q) ||
          (s.employee ?? "").toLowerCase().includes(q) ||
          (s.name ?? "").toLowerCase().includes(q)
      );
    },
    [salarySlips]
  );

  const filterByStatus = useCallback(
    (status: string) => {
      if (!status || status === "all") return salarySlips;
      return salarySlips.filter(
        (s) => (s.status ?? "").toLowerCase() === status.toLowerCase()
      );
    },
    [salarySlips]
  );

  // Aggregate totals for the currently loaded range — handy for a
  // summary strip at the top of the page (total net pay this month etc.)
  const totals = {
    grossPay: salarySlips.reduce((sum, s) => sum + (s.gross_pay ?? 0), 0),
    deductions: salarySlips.reduce((sum, s) => sum + (s.total_deduction ?? 0), 0),
    netPay: salarySlips.reduce((sum, s) => sum + (s.net_pay ?? 0), 0),
  };

  return {
    salarySlips,
    loading,
    error,
    refresh: () => load(range),
    range,
    setRange,
    search,
    filterByStatus,
    totals,
  };
}

export function useAdminSalarySlipDetail(id: string | null) {
  const [salarySlip, setSalarySlip] = useState<SalarySlipDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.getSalarySlipDetail(id);
      if (!res.ok) {
        setError(res.error);
      } else {
        setSalarySlip(res.data);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load salary slip detail");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
  }, [id, load]);

  return {
    salarySlip,
    loading,
    error,
    refresh: () => id && load(id),
  };
}