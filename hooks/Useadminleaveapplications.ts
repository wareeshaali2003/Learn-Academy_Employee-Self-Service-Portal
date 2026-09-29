import { useState, useEffect, useCallback } from "react";
import { api, LeaveApplicationDetail } from "../services/api";

// ─── List hook — all leave applications, with status filter ────────────────────

export function useAdminLeaveApplications() {
  const [leaveApps, setLeaveApps] = useState<LeaveApplicationDetail[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAllLeaveApplications();
      if (!res.ok) {
        setError(res.error ?? "Failed to load leave applications");
        setLeaveApps([]);
      } else {
        setLeaveApps(res.data);
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load leave applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Client-side search/filter helpers ─────────────────────────────────────
  const search = useCallback(
    (query: string): LeaveApplicationDetail[] => {
      const q = query.toLowerCase().trim();
      if (!q) return leaveApps;
      return leaveApps.filter(
        (l) =>
          (l.employee_name ?? "").toLowerCase().includes(q) ||
          (l.employee ?? "").toLowerCase().includes(q) ||
          (l.leave_type ?? "").toLowerCase().includes(q) ||
          (l.name ?? "").toLowerCase().includes(q)
      );
    },
    [leaveApps]
  );

  const filterByStatus = useCallback(
    (status: string): LeaveApplicationDetail[] => {
      if (!status || status === "all") return leaveApps;
      return leaveApps.filter(
        (l) => (l.status ?? "").toLowerCase() === status.toLowerCase()
      );
    },
    [leaveApps]
  );

  // ── Status update — Open / Approved / Rejected / Cancelled ─────────────────
  // Optimistically updates local state, then confirms with the server.
  const updateStatus = useCallback(
    async (
      id: string,
      status: "Open" | "Approved" | "Rejected" | "Cancelled"
    ): Promise<{ success: boolean; error?: string }> => {
      const previous = leaveApps;
      setLeaveApps((cur) =>
        cur.map((l) => (l.name === id ? { ...l, status } : l))
      );

      const res = await api.updateLeaveApplicationStatus(id, status);
      if (!res.ok) {
        // Revert on failure
        setLeaveApps(previous);
        return { success: false, error: res.error };
      }
      return { success: true };
    },
    [leaveApps]
  );

  return {
    leaveApps,
    loading,
    error,
    refresh: load,
    search,
    filterByStatus,
    updateStatus,
  };
}

// ─── Detail hook — single leave application full record ────────────────────────

export function useAdminLeaveApplicationDetail(id: string | null) {
  const [leaveApp, setLeaveApp] = useState<LeaveApplicationDetail | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (appId: string) => {
    setLoading(true);
    setError(null);
    setLeaveApp(null);
    try {
      const res = await api.getLeaveApplicationDetail(appId);
      if (!res.ok) {
        setError(res.error ?? `Failed to load leave application ${appId}`);
      } else {
        setLeaveApp(res.data);
      }
    } catch (err: any) {
      setError(err?.message ?? `Failed to load leave application ${appId}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
    else {
      setLeaveApp(null);
      setError(null);
    }
  }, [id, load]);

  const updateStatus = useCallback(
    async (
      status: "Open" | "Approved" | "Rejected" | "Cancelled"
    ): Promise<{ success: boolean; error?: string }> => {
      if (!leaveApp) return { success: false, error: "No leave application loaded" };
      const res = await api.updateLeaveApplicationStatus(leaveApp.name, status);
      if (!res.ok) return { success: false, error: res.error };
      setLeaveApp((cur) => (cur ? { ...cur, status } : cur));
      return { success: true };
    },
    [leaveApp]
  );

  return {
    leaveApp,
    loading,
    error,
    refresh: () => id && load(id),
    updateStatus,
  };
}