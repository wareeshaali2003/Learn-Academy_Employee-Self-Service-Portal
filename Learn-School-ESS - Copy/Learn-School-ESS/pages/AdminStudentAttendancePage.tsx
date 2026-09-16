import { useState, useMemo, useEffect, useRef } from "react";
import {
  useStudentAttendance,
  useStudentAttendanceDetail,
  type StudentAttendanceStatus,
} from "../hooks/useAdminStudentAttendance";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { createPortal } from "react-dom";
import {
  X,
  BookOpen,
  CalendarDays,
  Fingerprint,
  Layers,
  UserRound,
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  Check,
} from "lucide-react";

const STATUS_OPTIONS: StudentAttendanceStatus[] = [
  "all",
  "Present",
  "Absent",
  "Half Day",
  "On Leave",
  "Excused",
];

const STATUS_STYLES: Record<string, string> = {
  Present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Absent: "bg-red-50 text-red-700 ring-red-200",
  "On Leave": "bg-amber-50 text-amber-700 ring-amber-200",
  "Half Day": "bg-sky-50 text-sky-700 ring-sky-200",
  Excused: "bg-violet-50 text-violet-700 ring-violet-200",
};

// ✅ Chart colors — STATUS_STYLES ke hi tones se match karte hain
const STATUS_CHART_COLORS: Record<string, string> = {
  Present: "#10b981",
  Absent: "#ef4444",
  "On Leave": "#f59e0b",
  "Half Day": "#0ea5e9",
  Excused: "#8b5cf6",
};

// ✅ Brand green — Employee/Attendance pages wale header se match
const BRAND_GREEN = "#15803d"; // green-700
const BRAND_GREEN_LIGHT = "#16a34a"; // green-600

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
  value: StudentAttendanceStatus;
  onChange: (value: StudentAttendanceStatus) => void;
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

// ─── Multi-select Student Group dropdown (scrollable, checkbox based) ───────

function GroupMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (groups: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = selected.length === 0;

  const toggleGroup = (group: string) => {
    if (selected.includes(group)) {
      onChange(selected.filter((g) => g !== group));
    } else {
      onChange([...selected, group]);
    }
  };

  const toggleAll = () => {
    onChange([]);
  };

  const summaryLabel = allSelected
    ? "All Groups"
    : selected.length === 1
    ? selected[0]
    : `${selected.length} groups selected`;

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 sm:w-56"
      >
        <span className="truncate">{summaryLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[14rem] rounded-md border border-gray-200 bg-white shadow-lg sm:w-56">
          <button
            type="button"
            onClick={toggleAll}
            className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected ? "border-green-600 bg-green-600 text-white" : "border-gray-300"
              }`}
            >
              {allSelected && <Check size={11} strokeWidth={3} />}
            </span>
            All Groups
          </button>

          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((g) => {
              const isChecked = selected.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isChecked ? "border-green-600 bg-green-600 text-white" : "border-gray-300"
                    }`}
                  >
                    {isChecked && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="truncate">{g}</span>
                </button>
              );
            })}
            {options.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No groups found</p>
            )}
          </div>

          {!allSelected && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-green-700 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Charts ─────────────────────────────────────────────────────────────────

function AttendanceCharts({
  records,
}: {
  records: { status?: string; student_group?: string }[];
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

  const groupData = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      const g = r.student_group || "Unassigned";
      map[g] = (map[g] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // top 8 groups, warna chart crowded ho jata hay
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

      {/* Student group breakdown */}
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Records by Student Group
        </p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fontWeight: 500, fill: "#9ca3af" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
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
  const { record, loading, error, refresh } = useStudentAttendanceDetail(id);

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

          {!loading && !error && record ? (
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-semibold ring-2 ring-white/40">
                {getInitials(record.student_name)}
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  {record.student_name || "—"}
                </h2>
                <p className="text-sm text-white/80">{record.student || "—"}</p>
                <div className="mt-2">
                  <StatusBadge status={record.status} />
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
          {loading && <p className="text-sm text-gray-500">Loading details…</p>}

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

          {!loading && !error && record && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  Attendance
                </h3>
                <dl className="space-y-4">
                  <DetailRow
                    icon={<Fingerprint className="h-4 w-4" />}
                    label="Record ID"
                    value={record.name || "—"}
                  />
                  <DetailRow
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Date"
                    value={record.date || "—"}
                  />
                  <DetailRow
                    icon={<Layers className="h-4 w-4" />}
                    label="Student Group"
                    value={record.student_group || "—"}
                  />
                  <DetailRow
                    icon={<BookOpen className="h-4 w-4" />}
                    label="Course Schedule"
                    value={record.course_schedule || "—"}
                  />
                </dl>
              </section>
            </div>
          )}

          {!loading && !error && !record && (
            <p className="text-sm text-gray-500">No details found.</p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface AdminStudentAttendancePageProps {
  onBack?: () => void;
}

export default function AdminStudentAttendancePage({
  onBack,
}: AdminStudentAttendancePageProps = {}) {
  const { attendance, loading, error, refresh, filterByStatus, stats } =
    useStudentAttendance();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StudentAttendanceStatus>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  // ✅ Ab single string ki jaga array — multiple groups select ho saken.
  // Empty array = "All Groups"
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  // ✅ Student Group dropdown options — hamesha full `attendance` list se
  // derive karte hain (rows se nahi), warna filter lagane ke baad options
  // khud hi ghat jate hain.
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    attendance.forEach((a) => {
      if (a.student_group) set.add(a.student_group);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [attendance]);

  const rows = useMemo(() => {
    let filtered = filterByStatus(status);

    if (selectedDate) {
      filtered = filtered.filter((a) => a.date === selectedDate);
    }

    if (selectedGroups.length > 0) {
      filtered = filtered.filter(
        (a) => a.student_group && selectedGroups.includes(a.student_group)
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(
        (a) =>
          (a.student_name ?? "").toLowerCase().includes(q) ||
          (a.student ?? "").toLowerCase().includes(q) ||
          (a.student_group ?? "").toLowerCase().includes(q) ||
          (a.name ?? "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [filterByStatus, status, query, selectedDate, selectedGroups]);

  useEffect(() => {
    setPage(1);
  }, [status, query, selectedDate, selectedGroups, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    Boolean(selectedDate) ||
    status !== "all" ||
    selectedGroups.length > 0;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:border-green-400 hover:text-green-600"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <CalendarDays size={21} className="text-green-600" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-600">
              Attendance
            </p>
            <h1 className="text-xl font-black leading-tight text-gray-900">
              Student Attendance
            </h1>
            <p className="mt-0.5 text-xs font-medium text-gray-400">
              {loading
                ? "Loading records…"
                : `${stats.total} record${stats.total === 1 ? "" : "s"} · ${stats.attendanceRate}% attendance rate`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && (
            <span
              className={`hidden items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex ${
                stats.attendanceRate >= 75
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : stats.attendanceRate >= 50
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {stats.attendanceRate}% present
            </span>
          )}

          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700 transition-all hover:bg-green-100"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {!loading && !error && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Total", value: stats.total },
            { label: "Present", value: stats.present },
            { label: "Absent", value: stats.absent },
            { label: "On Leave", value: stats.onLeave },
            { label: "Attendance %", value: `${stats.attendanceRate}%` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-gray-200 p-3 text-center"
            >
              <p className="text-lg font-semibold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts ── */}
      {!loading && !error && <AttendanceCharts records={rows} />}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student, group, or ID…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          {/* ✅ Student Group filter — ab scrollable multi-select */}
          <GroupMultiSelect
            options={groupOptions}
            selected={selectedGroups}
            onChange={setSelectedGroups}
          />

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
          <button type="button" onClick={refresh} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Student Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Student ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Student Group
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
                  <td className="px-4 py-3" colSpan={6}>
                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
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
                  onClick={() => setSelectedId(a.name ?? null)}
                  className="cursor-pointer hover:bg-green-50/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                        {getInitials(a.student_name)}
                      </div>
                      {a.student_name || "—"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {a.student || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {a.student_group || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {a.date || "—"}
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
            {paginatedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, rows.length)} of {rows.length}{" "}
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