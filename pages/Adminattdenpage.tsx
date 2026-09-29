import { useState, useMemo, useEffect } from "react";
import {
  useAdminAttendance,
  useAdminAttendanceDetail,
} from "../hooks/Useadminattendance";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  Clock3,
  CalendarDays,
  Fingerprint,
  LogIn,
  LogOut,
  Timer,
  UserRound,
  ArrowLeft,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";

const STATUS_OPTIONS = [
  "all",
  "Present",
  "Absent",
  "On Leave",
  "Half Day",
  "Work From Home",
] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLES: Record<string, string> = {
  Present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Absent: "bg-red-50 text-red-700 ring-red-200",
  "On Leave": "bg-amber-50 text-amber-700 ring-amber-200",
  "Half Day": "bg-sky-50 text-sky-700 ring-sky-200",
  "Work From Home": "bg-violet-50 text-violet-700 ring-violet-200",
};

// ✅ Chart colors — STATUS_STYLES ke hi tones se match karte hain
const STATUS_CHART_COLORS: Record<string, string> = {
  Present: "#10b981",
  Absent: "#ef4444",
  "On Leave": "#f59e0b",
  "Half Day": "#0ea5e9",
  "Work From Home": "#8b5cf6",
};

// ✅ Brand green — Employee page wale header se match
const BRAND_GREEN = "#15803d"; // green-700
const BRAND_GREEN_LIGHT = "#16a34a"; // green-600

// ✅ Date normalize helper — kisi bhi format ko YYYY-MM-DD mein convert karta hai
function normalizeDate(value?: string): string {
  if (!value) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // DD-MM-YYYY or DD/MM/YYYY
  const parts = value.split(/[-\/]/);
  if (parts.length === 3 && parts[0].length === 2) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Fallback: try native Date parse
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return value;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusBadge({ status }: { status?: string }) {
  const style =
    STATUS_STYLES[status ?? ""] ?? "bg-gray-100 text-gray-600 ring-gray-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {status || "Unknown"}
    </span>
  );
}

function StatusFilterTabs({
  value,
  onChange,
}: {
  value: StatusOption;
  onChange: (value: StatusOption) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            value === status
              ? "bg-green-700 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {status === "all" ? "All" : status}
        </button>
      ))}
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return "—";
  return value;
}

function formatHours(value?: number): string {
  if (value === undefined || value === null) return "—";
  return `${value}`;
}

function formatBoolean(value?: number): string {
  return value ? "Yes" : "No";
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function AttendanceCharts({
  records,
}: {
  records: { status?: string; late_entry?: number; early_exit?: number }[];
}) {
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      const s = r.status || "Unknown";
      map[s] = (map[s] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const punctualityData = useMemo(() => {
    const lateCount = records.filter((r) => r.late_entry).length;
    const earlyExitCount = records.filter((r) => r.early_exit).length;
    const onTimeCount = records.filter(
      (r) => !r.late_entry && !r.early_exit
    ).length;
    return [
      { name: "On Time", value: onTimeCount },
      { name: "Late Entry", value: lateCount },
      { name: "Early Exit", value: earlyExitCount },
    ];
  }, [records]);

  if (records.length === 0) return null;

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Status distribution */}
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
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
                  <Cell
                    key={entry.name}
                    fill={STATUS_CHART_COLORS[entry.name] ?? "#9ca3af"}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "11px", fontWeight: 500 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Punctuality breakdown */}
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Punctuality
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={punctualityData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 500, fill: "#9ca3af" }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip />
              <Bar dataKey="value" fill={BRAND_GREEN} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Detail row with icon (Employee panel jaisa) ──────────────────────────────

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
        {icon}
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-gray-400">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
      </div>
    </div>
  );
}

function DetailPanel({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { attendance, loading, error, refresh } =
    useAdminAttendanceDetail(id);

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        {/* ── Green header ── */}
        <div
          className="relative shrink-0 px-6 pb-6 pt-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${BRAND_GREEN_LIGHT}, ${BRAND_GREEN})`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {!loading && !error && attendance ? (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-semibold ring-2 ring-white/40">
                {getInitials(attendance.employee_name)}
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  {attendance.employee_name || "—"}
                </h2>
                <p className="text-sm text-white/80">
                  {attendance.employee || "—"}
                </p>
                <div className="mt-2">
                  <StatusBadge status={attendance.status} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                <UserRound className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold">Attendance Detail</h2>
            </div>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-sm text-gray-500">Loading details…</p>
          )}

          {error && !loading && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={refresh}
                className="ml-2 font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && attendance && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Attendance
                </h3>
                <dl className="space-y-4">
                  <DetailRow
                    icon={<Fingerprint className="h-4 w-4" />}
                    label="Record ID"
                    value={attendance.name || "—"}
                  />
                  <DetailRow
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Date"
                    value={formatDate(attendance.attendance_date)}
                  />
                  <DetailRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Company"
                    value={attendance.company || "—"}
                  />
                  <DetailRow
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Shift"
                    value={attendance.shift || "—"}
                  />
                </dl>
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  Hours
                </h3>
                <dl className="space-y-4">
                  <DetailRow
                    icon={<Timer className="h-4 w-4" />}
                    label="Working Hours"
                    value={formatHours(attendance.working_hours)}
                  />
                  <DetailRow
                    icon={<Timer className="h-4 w-4" />}
                    label="Standard Working Hours"
                    value={formatHours(attendance.standard_working_hours)}
                  />
                  <DetailRow
                    icon={<Timer className="h-4 w-4" />}
                    label="Overtime Duration"
                    value={formatHours(attendance.actual_overtime_duration)}
                  />
                  <DetailRow
                    icon={<LogIn className="h-4 w-4" />}
                    label="Late Entry"
                    value={formatBoolean(attendance.late_entry)}
                  />
                  <DetailRow
                    icon={<LogOut className="h-4 w-4" />}
                    label="Early Exit"
                    value={formatBoolean(attendance.early_exit)}
                  />
                </dl>
              </section>
            </div>
          )}

          {!loading && !error && !attendance && (
            <p className="text-sm text-gray-500">No details found.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface AdminAttendancePageProps {
  onBack?: () => void;
}

export default function AdminAttendancePage({ onBack }: AdminAttendancePageProps) {
  const { attendance, loading, error, refresh, filterByStatus } =
    useAdminAttendance();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusOption>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const rows = useMemo(() => {
    const byStatus = filterByStatus(status);

    let filtered = byStatus;

    // ✅ Fix: dono sides normalize karke compare karo
    if (selectedDate) {
      filtered = filtered.filter(
        (a) => normalizeDate(a.attendance_date) === selectedDate
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          (a.employee_name ?? "").toLowerCase().includes(q) ||
          (a.employee ?? "").toLowerCase().includes(q) ||
          (a.name ?? "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [filterByStatus, status, query, selectedDate]);

  useEffect(() => {
    setPage(1);
  }, [status, query, selectedDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const hasActiveFilters =
    Boolean(query.trim()) || Boolean(selectedDate) || status !== "all";

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
    <div className="mx-auto max-w-6xl p-6">
      {/* ── Header ── */}
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:border-green-400 hover:text-green-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <CalendarCheck size={20} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-none text-gray-800">Attendance</h1>
            <p className="mt-0.5 text-[11px] font-medium text-gray-400">
              {loading ? "Loading…" : `${attendance.length} total records`}
              {hasActiveFilters && !loading && rows.length !== attendance.length
                ? ` · ${rows.length} matching filters`
                : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-500 transition-all hover:border-green-400 hover:text-green-600"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Charts — hamesha current filtered rows ko reflect karte hain ── */}
      {!loading && !error && <AttendanceCharts records={rows} />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or ID…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 sm:w-auto"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <StatusFilterTabs value={status} onChange={setStatus} />
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Employee Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Employee ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Record ID
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-4 py-3" colSpan={5}>
                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  No attendance records match your filters.
                </td>
              </tr>
            )}

            {!loading &&
              paginatedRows.map((a) => (
                <tr
                  key={a.name}
                  onClick={() => setSelectedId(a.name)}
                  className="cursor-pointer hover:bg-green-50/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                        {getInitials(a.employee_name)}
                      </div>
                      {a.employee_name || "—"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {a.employee || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {a.attendance_date || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {a.name}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            Showing{" "}
            {paginatedRows.length === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}
            –{Math.min(currentPage * pageSize, rows.length)} of {rows.length}{" "}
            record{rows.length === 1 ? "" : "s"}
            {hasActiveFilters &&
              rows.length !== attendance.length &&
              ` (filtered from ${attendance.length})`}
          </p>

          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedId && (
        <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}