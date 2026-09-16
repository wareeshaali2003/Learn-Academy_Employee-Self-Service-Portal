import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import {
  api,
  AttendanceDetail,
} from "../services/api";

// Default to current month — fetching *all* attendance ever recorded
// (every employee × every day) is the main reason this page is slow.
// Scoping the initial load to a date range cuts payload size drastically.
function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from_date: fmt(from), to_date: fmt(to) };
}

export function useAdminAttendance(
  initialRange = getDefaultDateRange()
) {
  const [attendance, setAttendance] = useState<AttendanceDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(initialRange);

  const load = useCallback(async (r = range) => {
    setLoading(true);
    setError(null);

    try {
      // Pass the date range through so the backend/resourceClient can
      // filter server-side instead of returning the entire doctype.
      const res = await api.getAllAttendance(r);

      if (!res.ok) {
        setError(res.error ?? "Failed to load attendance");
        setAttendance([]);
      } else {
        setAttendance(res.data);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Memoize once instead of creating a fresh filtered array on every
  // render/keystroke from a function the caller invokes manually.
  const search = useCallback(
    (query: string) => {
      const q = query.toLowerCase().trim();
      if (!q) return attendance;

      return attendance.filter(
        (a) =>
          (a.employee_name ?? "").toLowerCase().includes(q) ||
          (a.employee ?? "").toLowerCase().includes(q) ||
          (a.name ?? "").toLowerCase().includes(q)
      );
    },
    [attendance]
  );

  const filterByStatus = useCallback(
    (status: string) => {
      if (!status || status === "all") return attendance;
      return attendance.filter(
        (a) => (a.status ?? "").toLowerCase() === status.toLowerCase()
      );
    },
    [attendance]
  );

  return {
    attendance,
    loading,
    error,
    refresh: () => load(range),
    range,
    setRange, // expose so the page can add a date picker later
    search,
    filterByStatus,
  };
}

export function useAdminAttendanceDetail(id: string | null) {
  const [attendance, setAttendance] = useState<AttendanceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.getAttendanceDetail(id);
      if (!res.ok) {
        setError(res.error);
      } else {
        setAttendance(res.data);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load attendance detail");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
  }, [id, load]);

  return {
    attendance,
    loading,
    error,
    refresh: () => id && load(id),
  };
}