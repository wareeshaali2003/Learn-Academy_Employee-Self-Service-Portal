import { useState, useEffect, useCallback } from "react";
import type { LeaveApplication, LeaveBalance } from "../types";
import { api } from "../services/api";

type ActionResult =
  | { success: true }
  | { success: false; error: string };

// ── Fuzzy numeric field lookup ──────────────────────────────────────────────
// The mobile ESS "get_leave_type" endpoint's field names don't line up with a
// fixed small list of guesses (total/used/balance/available/...), so the old
// mapping resolved to 0 for every leave type. Instead, scan the record's own
// keys and match by keyword so it works with whatever naming convention the
// backend actually uses (total_leaves_allocated, max_leaves_allowed,
// new_leaves_allocated, leaves_taken, remaining_leaves, leave_balance, etc.)
function findNumeric(item: any, keywordSets: string[]): number | null {
  if (!item || typeof item !== "object") return null;
  const keys = Object.keys(item);
  for (const keyword of keywordSets) {
    const match = keys.find((k) => k.toLowerCase().replace(/[^a-z]/g, "").includes(keyword));
    if (match !== undefined) {
      const n = Number(item[match]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export const useLeave = () => {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [historyRes, dashboardRes, summaryRes] = await Promise.all([
        api.getLeaveHistory(),
        api.getDashboard(),
        api.getLeaveSummary(), // fallback only — this is Leave Type master data (no balance numbers)
      ]);

      // ── Leave History ──────────────────────────────────────────────────────
      if (historyRes.ok) {
        const rawData = historyRes.data as any;

        // API returns { upcoming: [], taken: [...], balance: [] }
        // getLeaveHistory now returns raw data object, so we read .taken directly
        const taken: any[] = Array.isArray(rawData?.taken)
          ? rawData.taken
          : Array.isArray(rawData)
          ? rawData
          : [];

        const mapped: LeaveApplication[] = taken.map((item: any) => ({
          id: item.name || "",
          type: item.leave_type || "Leave",
          startDate: item.from_date || "",
          endDate: item.to_date || "",
          status: item.status || "Pending",
          reason: item.description || item.reason || "",
        }));

        setLeaves(mapped);
      } else {
        setLeaves([]);
        setError(historyRes.error || "Failed to load leave history");
      }

      // ── Leave Balances ─────────────────────────────────────────────────────
      // Primary source: get_dashboard's `leave_balance` — this is the actual
      // per-employee allocation/used/remaining data. The old source
      // (get_leave_type = "Leave Type" master list, i.e. just the type
      // definitions like "Maximum Consecutive Leaves") never had this data at
      // all, which is why every balance card always showed 0.
      const dashboardLeaveBalance: any[] = Array.isArray((dashboardRes as any)?.data?.leave_balance)
        ? (dashboardRes as any).data.leave_balance
        : [];

      const fallbackLeaveTypes: any[] = summaryRes.ok && Array.isArray(summaryRes.data)
        ? summaryRes.data
        : [];

      const raw = dashboardLeaveBalance.length > 0 ? dashboardLeaveBalance : fallbackLeaveTypes;

      if (raw.length > 0) {
        console.log(
          dashboardLeaveBalance.length > 0
            ? "🎯 [ESS] Leave balance (from get_dashboard) raw item keys:"
            : "⚠️ [ESS] get_dashboard had no leave_balance — falling back to Leave Type master list:",
          Object.keys(raw[0])
        );

        const mapped: LeaveBalance[] = raw.map((item: any) => {
          // Most specific patterns first so we don't accidentally grab the
          // wrong field when several keys share a substring like "total".
          const total = findNumeric(item, [
            "totalleavesallocated", "newleavesallocated", "maxleavesallowed",
            "allocatedleaves", "leavesallocated", "totalallocated", "totalleaves", "allocated", "total", "max",
          ]);
          const used = findNumeric(item, [
            "totalleavedays", "leavestaken", "usedleaves", "leavesused", "taken", "used",
          ]);
          const available = findNumeric(item, [
            "leavebalance", "remainingleaves", "availableleaves", "leavesremaining",
            "balance", "available", "remaining",
          ]);

          const resolvedUsed = used ?? 0;
          const resolvedTotal = total ?? (available != null ? available + resolvedUsed : resolvedUsed);
          const resolvedAvailable = available ?? Math.max(resolvedTotal - resolvedUsed, 0);

          return {
            type: item.leave_type || item.name || "Leave",
            total: resolvedTotal,
            used: resolvedUsed,
            available: resolvedAvailable,
          };
        });

        setBalances(mapped);
      } else {
        setBalances([]);
        if (!summaryRes.ok) {
          setError((prev) => prev || summaryRes.error || "Failed to load leave balances");
        }
      }

    } catch (e: any) {
      setLeaves([]);
      setBalances([]);
      setError(e?.message || "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }, []);

  const applyLeave = useCallback(
    async (application: any): Promise<ActionResult> => {
      try {
        const res = await api.makeLeave(application);

        if (!res.ok) {
          return { success: false, error: res.error || "Failed to apply leave" };
        }

        await fetchData();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Failed to apply leave" };
      }
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    leaves,
    balances,
    loading,
    error,
    applyLeave,
    refetch: fetchData,
  };
};