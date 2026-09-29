import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  CalendarCheck, Search, X, AlertCircle, RefreshCw,
  ChevronRight, User, CheckCircle2, XCircle, Ban, Clock, ArrowLeft,
} from "lucide-react";
import {
  useAdminLeaveApplications,
  useAdminLeaveApplicationDetail,
} from "../hooks/Useadminleaveapplications";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

type StatusFilter = "all" | "Open" | "Approved" | "Rejected" | "Cancelled";
type LeaveStatus = "Open" | "Approved" | "Rejected" | "Cancelled";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? "";
  const map: Record<string, { bg: string; text: string }> = {
    Open:      { bg: "bg-amber-50",  text: "text-amber-600" },
    Approved:  { bg: "bg-green-50",  text: "text-green-600" },
    Rejected:  { bg: "bg-red-50",    text: "text-red-500" },
    Cancelled: { bg: "bg-gray-100",  text: "text-gray-500" },
    Draft:     { bg: "bg-blue-50",   text: "text-blue-500" },
  };
  const style = map[s] ?? { bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${style.bg} ${style.text}`}>
      {s || "—"}
    </span>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-green-500">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 wrap-break-word">{value}</p>
      </div>
    </div>
  );
}

// Employee Name aur Employee ID ko side-by-side (parallel) dikhane ke liye
function DetailRowPair({
  icon, label1, value1, label2, value2,
}: {
  icon: React.ReactNode;
  label1: string; value1?: string | number | null;
  label2: string; value2?: string | number | null;
}) {
  if ((!value1 && value1 !== 0) && (!value2 && value2 !== 0)) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-green-500">{icon}</span>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label1}</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5 wrap-break-word">{value1 ?? "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label2}</p>
          <p className="text-sm font-semibold text-gray-800 mt-0.5 wrap-break-word">{value2 ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      <div className="bg-gray-50 rounded-xl px-4 py-1">
        {children}
      </div>
    </div>
  );
}

// ── Status action buttons ──────────────────────────────────────────────────────

// Kis status se kis status mein jaana allowed hai — is map ke zariye control hota hai
// ke har status pe sirf sahi buttons dikhen.
const STATUS_TRANSITIONS: Record<string, LeaveStatus[]> = {
  Open:      ["Approved", "Rejected", "Cancelled"],
  Approved:  ["Rejected", "Cancelled"],
  Rejected:  ["Open"],
  Cancelled: ["Open"],
};

const ACTION_META: Record<LeaveStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  Approved:  { label: "Approve",  icon: <CheckCircle2 size={13} />, cls: "bg-green-50 text-green-600 hover:bg-green-100" },
  Rejected:  { label: "Reject",   icon: <XCircle size={13} />,      cls: "bg-red-50 text-red-500 hover:bg-red-100" },
  Open:      { label: "Reopen",   icon: <Clock size={13} />,        cls: "bg-amber-50 text-amber-600 hover:bg-amber-100" },
  Cancelled: { label: "Cancel",   icon: <Ban size={13} />,          cls: "bg-gray-100 text-gray-500 hover:bg-gray-200" },
};

function StatusActions({
  current, onChange, busy,
}: {
  current?: string;
  onChange: (status: LeaveStatus) => void;
  busy?: boolean;
}) {
  const allowed = STATUS_TRANSITIONS[current ?? "Open"] ?? STATUS_TRANSITIONS.Open;

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((status) => {
        const meta = ACTION_META[status];
        return (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={(e) => { e.stopPropagation(); onChange(status); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${meta.cls}`}
          >
            {meta.icon}
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function LeaveDetailPanel({
  id, onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { leaveApp, loading, error, updateStatus } = useAdminLeaveApplicationDetail(id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleChange = async (status: LeaveStatus) => {
    setBusy(true);
    setActionError(null);
    const res = await updateStatus(status);
    if (!res.success) setActionError(res.error ?? "Could not update status");
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* ── Panel: height = screen - top navbar (mt-16 = 4rem) ── */}
      <div className="relative w-full max-w-md bg-white h-[calc(100vh-4rem)] shadow-2xl flex flex-col overflow-hidden animate-slide-in-right mt-16">

        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between shrink-0"
          style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CalendarCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white">
                {loading ? "Loading..." : leaveApp?.employee_name ?? id}
              </p>
              <p className="text-[10px] text-white/70 font-medium mt-0.5">
                {leaveApp?.leave_type ?? ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X size={15} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {leaveApp && !loading && (
            <>
              {/* Status + ID */}
              <div className="flex items-center justify-between">
                <StatusBadge status={leaveApp.status} />
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {leaveApp.name}
                </span>
              </div>

              {/* Status actions */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Change Status
                </p>
                <StatusActions current={leaveApp.status} onChange={handleChange} busy={busy} />
                {actionError && (
                  <p className="text-xs text-red-500 font-medium mt-2">{actionError}</p>
                )}
              </div>

              {leaveApp.description && (
                <Section title="Reason">
                  <div className="py-2.5">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {leaveApp.description}
                    </p>
                  </div>
                </Section>
              )}

              {/* Application details — Employee Name aur ID ab side-by-side */}
              <Section title="Application">
                <DetailRowPair
                  icon={<User size={13} />}
                  label1="Employee"
                  value1={leaveApp.employee_name}
                  label2="Employee ID"
                  value2={leaveApp.employee}
                />
                <DetailRow icon={<CalendarCheck size={13} />} label="Leave Type"      value={leaveApp.leave_type} />
                <DetailRowPair
                  icon={<Clock size={13} />}
                  label1="From Date"
                  value1={leaveApp.from_date}
                  label2="To Date"
                  value2={leaveApp.to_date}
                />
                <DetailRowPair
                  icon={<Clock size={13} />}
                  label1="Total Days"
                  value1={leaveApp.total_leave_days}
                  label2="Leave Balance"
                  value2={leaveApp.leave_balance}
                />
                <DetailRow icon={<Clock size={13} />}         label="Posting Date"    value={leaveApp.posting_date} />
              </Section>

              {/* Approver */}
              <Section title="Approver">
                <DetailRow icon={<User size={13} />} label="Leave Approver" value={leaveApp.leave_approver_name ?? leaveApp.leave_approver} />
              </Section>

              {/* Extra bottom padding taake last content clip na ho */}
              <div className="h-6" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Open: "#f59e0b",
  Approved: "#22c55e",
  Rejected: "#ef4444",
  Cancelled: "#9ca3af",
};

function LeaveCharts({
  counts, leaveApps,
}: {
  counts: { all: number; Open: number; Approved: number; Rejected: number; Cancelled: number };
  leaveApps: { leave_type?: string }[];
}) {
  const statusData = (["Open", "Approved", "Rejected", "Cancelled"] as const)
    .map((s) => ({ name: s, value: counts[s] }))
    .filter((d) => d.value > 0);

  const typeMap = leaveApps.reduce<Record<string, number>>((acc, l) => {
    const type = l.leave_type ?? "Unspecified";
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});
  const typeData = Object.entries(typeMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (counts.all === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Status distribution */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          Status Distribution
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#9ca3af"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leave type breakdown */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          Leave Type Breakdown
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontWeight: 600, fill: "#9ca3af" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={40}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface AdminLeaveApprovalPageProps {
  onBack?: () => void;
}

export const AdminLeaveApprovalPage: React.FC<AdminLeaveApprovalPageProps> = ({ onBack }) => {
  const { leaveApps, loading, error, refresh, filterByStatus, updateStatus } =
    useAdminLeaveApplications();

  const [query, setQuery]           = useState("");
  const [statusFilter, setStatus]   = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // NEW: leave type filter
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId]   = useState<string | null>(null);
  const [rowError, setRowError]     = useState<{ id: string; message: string } | null>(null);

  // NEW: master Leave Type list — Leave Type doctype se saari types, chahe unki
  // koi application ho ya na ho (jaise HR > Leave Type list mein dikhti hain)
  const [masterLeaveTypes, setMasterLeaveTypes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaveTypes() {
      try {
        const res = await fetch(
          "/api/resource/Leave Type?fields=[\"name\"]&limit_page_length=0",
          { headers: { "X-Frappe-CSRF-Token": (window as any).csrf_token ?? "" } }
        );
        if (!res.ok) return;
        const json = await res.json();
        const names: string[] = (json?.data ?? []).map((d: { name: string }) => d.name);
        if (!cancelled) setMasterLeaveTypes(names);
      } catch {
        // Silent fail — dropdown falls back to types present in leaveApps
      }
    }

    loadLeaveTypes();
    return () => { cancelled = true; };
  }, []);

  // NEW: leave_type ke hisab se counts nikaalna (jitni applications us type ki hain)
  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    leaveApps.forEach((l) => {
      const t = l.leave_type ?? "Unspecified";
      map[t] = (map[t] ?? 0) + 1;
    });
    return map;
  }, [leaveApps]);

  // NEW: dropdown ki list — master types (doctype se) + jo bhi extra types
  // sirf applications mein mile ho (fallback / safety), sab merge + sorted.
  // Agar master list fetch na ho paye to sirf applications wali types dikhengi.
  const leaveTypes = useMemo(() => {
    const fromApps = Object.keys(typeCounts);
    const merged = new Set([...masterLeaveTypes, ...fromApps]);
    return Array.from(merged).sort();
  }, [masterLeaveTypes, typeCounts]);

  const filtered = useMemo(() => {
    const byStatus = filterByStatus(statusFilter);

    // NEW: status filter ke baad type filter bhi apply karo
    let result = byStatus;
    if (typeFilter !== "all") {
      result = result.filter((l) => (l.leave_type ?? "Unspecified") === typeFilter);
    }

    if (!query.trim()) return result;
    const q = query.toLowerCase();
    return result.filter(
      (l) =>
        (l.employee_name ?? "").toLowerCase().includes(q) ||
        (l.employee ?? "").toLowerCase().includes(q) ||
        (l.leave_type ?? "").toLowerCase().includes(q) ||
        (l.name ?? "").toLowerCase().includes(q)
    );
  }, [leaveApps, query, statusFilter, typeFilter, filterByStatus]);

  const counts = useMemo(() => ({
    all:       leaveApps.length,
    Open:      leaveApps.filter((l) => l.status === "Open").length,
    Approved:  leaveApps.filter((l) => l.status === "Approved").length,
    Rejected:  leaveApps.filter((l) => l.status === "Rejected").length,
    Cancelled: leaveApps.filter((l) => l.status === "Cancelled").length,
  }), [leaveApps]);

  const handleRowStatusChange = async (id: string, status: LeaveStatus) => {
    setRowBusyId(id);
    setRowError(null);
    const res = await updateStatus(id, status);
    if (!res.success) setRowError({ id, message: res.error ?? "Could not update status" });
    setRowBusyId(null);
  };

  const handleBack = () => {
    if (selectedId) {
      setSelectedId(null);
      return;
    }
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 text-gray-500 flex items-center justify-center transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CalendarCheck size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="font-black text-gray-800 text-lg leading-none">Leave Approvals</h2>
            <p className="text-[11px] text-gray-400 font-medium mt-0.5">{counts.all} total applications</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 text-gray-500 rounded-xl text-sm font-bold transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Charts ── */}
      {!loading && !error && (
        <LeaveCharts counts={counts} leaveApps={leaveApps} />
      )}

      {/* ── Filters: Status + Leave Type dropdowns ── */}
      <div className="flex gap-3 flex-wrap">
        {/* Status dropdown */}
        <div className="relative flex-1 min-w-45">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all cursor-pointer"
          >
            {(["all", "Open", "Approved", "Rejected", "Cancelled"] as const).map((s) => (
              <option key={s} value={s}>
                {(s === "all" ? "All" : s)} ({counts[s]})
              </option>
            ))}
          </select>
          <ChevronRight
            size={14}
            className="pointer-events-none absolute right-3.5 top-8.5 text-gray-400 rotate-90"
          />
        </div>

        {/* Leave Type dropdown */}
        {leaveTypes.length > 0 && (
          <div className="relative flex-1 min-w-45">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
              Leave Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all cursor-pointer"
            >
              <option value="all">All Types ({counts.all})</option>
              {leaveTypes.map((type) => (
                <option key={type} value={type}>
                  {type} ({typeCounts[type] ?? 0})
                </option>
              ))}
            </select>
            <ChevronRight
              size={14}
              className="pointer-events-none absolute right-3.5 top-8.5 text-gray-400 rotate-90"
            />
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by employee, leave type, ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-600 rounded-xl p-4 text-sm font-medium">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Leave list ── */}
      {!loading && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CalendarCheck size={32} className="mx-auto mb-3 opacity-30" />
              {/* NEW: type-specific empty message jab type filter active ho aur us type ka koi data na ho */}
              {typeFilter !== "all" && !query.trim() ? (
                <>
                  <p className="font-bold text-sm">No leave found of this type</p>
                  <p className="text-xs mt-1">No "{typeFilter}" applications match the current status filter</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-sm">No leave applications found</p>
                  <p className="text-xs mt-1">Try a different search or filter</p>
                </>
              )}
            </div>
          ) : (
            filtered.map((l) => (
              <div
                key={l.name}
                className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5 hover:shadow-md hover:border-green-200 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(l.name)}
                  className="w-full text-left flex items-center gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0 border border-green-100">
                    <User size={18} className="text-green-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-gray-800 text-sm truncate">
                        {l.employee_name ?? l.employee}
                      </p>
                      <StatusBadge status={l.status} />
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">
                      {l.leave_type ?? "—"} · {l.total_leave_days ?? "?"} day(s)
                      {l.from_date ? ` · ${l.from_date}` : ""}
                    </p>
                    <p className="text-[10px] text-gray-300 font-medium mt-0.5">{l.name}</p>
                  </div>

                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </button>

                {/* Inline quick actions */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <StatusActions
                    current={l.status}
                    busy={rowBusyId === l.name}
                    onChange={(status) => handleRowStatusChange(l.name, status)}
                  />
                  {rowError?.id === l.name && (
                    <p className="text-xs text-red-500 font-medium mt-2">{rowError.message}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Detail panel ── */}
      {selectedId && (
        <LeaveDetailPanel
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};