// hooks/UseAudit.ts
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "../services/api";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ActionType =
  | "All"
  | "Status Change"
  | "Transfer"
  | "Meet Link"
  | "Teacher Assignment"
  | "Grade Entry"
  | "Login";
// NOTE: "Teacher Assignment", "Grade Entry", "Login" are not wired to real
// data yet (ERPNext source not confirmed for these) — they're listed here
// so the action-type pill bar matches the prototype's shape, but they will
// simply yield 0 entries until a confirmed source is added later.

export type Severity = "info" | "warning" | "critical";

export interface AuditEntry {
  id: string;
  timestamp: string;     // raw ERPNext datetime string e.g. "2026-06-16 12:07:09"
  action: ActionType;
  entity: string;
  entityId?: string;
  changedBy: string;
  ip: string;
  before: string;
  after: string;
  severity: Severity;
}

const PER_PAGE = 8;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatTimestamp(raw: string): string {
  if (!raw) return "—";
  try {
    const d = new Date(raw.replace(" ", "T"));
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

function isToday(raw: string): boolean {
  if (!raw) return false;
  const today = new Date().toISOString().split("T")[0];
  return raw.startsWith(today);
}

function withinDateRange(raw: string, range: string): boolean {
  if (!raw || range === "All Time") return true;
  const entryDate = new Date(raw.replace(" ", "T"));
  if (isNaN(entryDate.getTime())) return true;
  const now = new Date();

  if (range === "Last 7 days") {
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 7);
    return entryDate >= cutoff;
  }
  if (range === "Last 30 days") {
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 30);
    return entryDate >= cutoff;
  }
  if (range === "This Month") {
    return entryDate.getMonth() === now.getMonth() && entryDate.getFullYear() === now.getFullYear();
  }
  if (range === "This Term") {
    const cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 4);
    return entryDate >= cutoff;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useAudit() {
  const [rawEntries, setRawEntries] = useState<AuditEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [actionFilter,   setActionFilter]   = useState<ActionType>("All");
  const [userFilter,     setUserFilter]     = useState("All Users");
  const [dateRange,      setDateRange]      = useState("Last 7 days");
  const [severityFilter, setSeverityFilter] = useState<"All" | Severity>("All");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);

  const fetchedRef = useRef(false);

  // ── FETCH ────────────────────────────────────────────────────────────────
  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAuditTrail(300);
      if (!res.ok) {
        setError(res.error || "Failed to load audit trail");
        setRawEntries([]);
        return;
      }
      const entries: AuditEntry[] = res.data.map((e: any) => ({
        ...e,
        timestamp: formatTimestamp(e.timestamp),
        _rawTimestamp: e.timestamp, // kept for date-range filtering
      }));
      setRawEntries(entries);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load audit trail";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchAudit();
    }
  }, [fetchAudit]);

  // ── Dynamic user list (real users from the data, not hardcoded) ───────────
  const userOptions = useMemo(() => {
    const set = new Set<string>();
    rawEntries.forEach(e => { if (e.changedBy && e.changedBy !== "—") set.add(e.changedBy); });
    return ["All Users", ...Array.from(set).sort()];
  }, [rawEntries]);

  // ── Filtered ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rawEntries.filter((e: any) => {
      const matchAction   = actionFilter === "All" || e.action === actionFilter;
      const matchUser     = userFilter === "All Users" || e.changedBy === userFilter;
      const matchSeverity = severityFilter === "All" || e.severity === severityFilter;
      const matchDate     = withinDateRange(e._rawTimestamp || "", dateRange);
      const matchSearch   = !search ||
        e.entity.toLowerCase().includes(search.toLowerCase()) ||
        e.changedBy.toLowerCase().includes(search.toLowerCase()) ||
        e.action.toLowerCase().includes(search.toLowerCase());
      return matchAction && matchUser && matchSeverity && matchDate && matchSearch;
    });
  }, [rawEntries, actionFilter, userFilter, severityFilter, dateRange, search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [actionFilter, userFilter, severityFilter, dateRange, search]);

  const paginated  = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  // ── KPIs (computed from REAL fetched entries, not the filtered subset) ────
  const kpis = useMemo(() => ({
    total:    rawEntries.length,
    warning:  rawEntries.filter(e => e.severity === "warning").length,
    critical: rawEntries.filter(e => e.severity === "critical").length,
    today:    rawEntries.filter((e: any) => isToday(e._rawTimestamp || "")).length,
  }), [rawEntries]);

  // ── Reset filters ────────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setActionFilter("All");
    setUserFilter("All Users");
    setSeverityFilter("All");
    setDateRange("Last 7 days");
    setSearch("");
    setPage(1);
  }, []);

  // ── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const headers = ["ID", "Timestamp", "Action", "Entity", "Entity ID", "Changed By", "IP", "Before", "After", "Severity"];
    const rows = filtered.map(e => [
      e.id, e.timestamp, e.action, e.entity, e.entityId || "—",
      e.changedBy, e.ip, e.before, e.after, e.severity,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Audit log exported");
  }, [filtered]);

  // ── Manual refresh ───────────────────────────────────────────────────────
  const refetch = useCallback(() => {
    fetchedRef.current = false;
    fetchAudit();
  }, [fetchAudit]);

  return {
    loading,
    error,
    refetch,

    // Data
    entries: paginated,
    filteredCount: filtered.length,
    kpis,
    userOptions,

    // Filters
    actionFilter,   setActionFilter,
    userFilter,     setUserFilter,
    dateRange,      setDateRange,
    severityFilter, setSeverityFilter,
    search,         setSearch,
    resetFilters,

    // Pagination
    page, setPage,
    totalPages,
    perPage: PER_PAGE,

    // Export
    exportCSV,
  };
}