import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAttendance } from "../hooks/useAttendance";
import type { AttendanceRecord } from "../hooks/useAttendance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Download, Filter, X, Clock, CheckCircle2, XCircle, Minus,
  Calendar, ChevronDown, TrendingUp,
} from "lucide-react";

type AttendanceStats = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  percentage: number;
  totalDays: number;
  monthLabel?: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 SINGLE SOURCE OF TRUTH — status colors
// KPI cards aur chart dono yahi colors use karenge. Change ek jagah karo,
// dono jagah update ho jayega.
// ═══════════════════════════════════════════════════════════════════════════
const STATUS_COLORS = {
  present: {
    accent: "#10b981",        // emerald-500 (chart + icon + pill)
    bg: "#f0fdf4",            // green-50 (card bg)
    border: "#bbf7d0",        // green-200
    label: "#15803d",         // green-700
    number: "#14532d",        // green-900
  },
  late: {
    accent: "#f59e0b",        // amber-500
    bg: "#fffbeb",            // amber-50
    border: "#fde68a",        // amber-200
    label: "#b45309",         // amber-700
    number: "#78350f",        // amber-900
  },
  halfDay: {
    accent: "#0ea5e9",        // sky-500 (BILKUL ALAG — not pink, not teal, not violet)
    bg: "#f0f9ff",            // sky-50
    border: "#bae6fd",        // sky-200
    label: "#0369a1",         // sky-700
    number: "#0c4a6e",        // sky-900
  },
  absent: {
    accent: "#ef4444",        // red-500
    bg: "#fef2f2",            // red-50
    border: "#fecaca",        // red-200
    label: "#b91c1c",         // red-700
    number: "#7f1d1d",        // red-900
  },
} as const;

type KpiKey = keyof typeof STATUS_COLORS;

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseHHMM(t: string): number | null {
  if (!t || t === "--:--") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function computeWorkHours(inTime: string, outTime: string): string {
  const start = parseHHMM(inTime);
  const end = parseHHMM(outTime);
  if (start == null || end == null) return "--";
  const diff = end - start;
  if (diff <= 0) return "--";
  return formatDuration(diff);
}

function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return "--";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(dt.getTime())) return dateStr;
  const dayNum = dt.getDate();
  const weekday = dt.toLocaleDateString(undefined, { weekday: "long" }); // 👈 "short" → "long"
  const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
  return `${dayNum} ${weekday}${isWeekend ? " 🎉" : ""}`;
}

// ── Balanced KPI card — light bg, professional spacing ──────────────────
function KpiCard({
  themeKey,
  value,
  label,
  icon,
}: {
  themeKey: KpiKey;
  value: number;
  label: string;
  icon: React.ReactNode;
}) {
  const t = STATUS_COLORS[themeKey];

  return (
    <div
      className="rounded-xl border px-5 py-4 transition-all duration-200 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
      style={{ background: t.bg, borderColor: t.border }}
    >
      {/* Top row: icon + label */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: t.accent, color: "#ffffff" }}
        >
          {icon}
        </div>
        <span
          className="text-sm md:text-[15px] font-bold uppercase tracking-[0.06em]"
          style={{ color: t.label }}
        >
          {label}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-1.5">
        <p
          className="text-[32px] font-bold leading-none tracking-tight"
          style={{ color: t.number }}
        >
          {value}
        </p>
        <span
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: t.label }}
        >
          days
        </span>
      </div>
    </div>
  );
}

// ── Status pill — same accent colors as KPI/chart ───────────────────────
function StatusPill({ status }: { status: string }) {
  const s = (status || "").toLowerCase();

  const base =
    "inline-flex items-center gap-1.5 justify-center w-[118px] px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide border";

  if (s.includes("present")) {
    const t = STATUS_COLORS.present;
    return (
      <span
        className={base}
        style={{ background: t.bg, color: t.label, borderColor: t.border }}
      >
        <CheckCircle2 size={12} strokeWidth={2.5} /> Present
      </span>
    );
  }
  if (s.includes("late")) {
    const t = STATUS_COLORS.late;
    return (
      <span
        className={base}
        style={{ background: t.bg, color: t.label, borderColor: t.border }}
      >
        <Clock size={12} strokeWidth={2.5} /> Late
      </span>
    );
  }
  if (s.includes("half")) {
    const t = STATUS_COLORS.halfDay;
    return (
      <span
        className={base}
        style={{ background: t.bg, color: t.label, borderColor: t.border }}
      >
        <Minus size={12} strokeWidth={3} /> Half Day
      </span>
    );
  }
  if (s.includes("absent")) {
    const t = STATUS_COLORS.absent;
    return (
      <span
        className={base}
        style={{ background: t.bg, color: t.label, borderColor: t.border }}
      >
        <XCircle size={12} strokeWidth={2.5} /> Absent
      </span>
    );
  }
  if (s.includes("leave")) {
    return (
      <span className={`${base} bg-sky-50 text-sky-700 border-sky-200`}>
        On Leave
      </span>
    );
  }
  return (
    <span className={`${base} bg-gray-50 text-gray-600 border-gray-200`}>
      {status || "—"}
    </span>
  );
}

function exportToCSV(records: AttendanceRecord[], year: number, month: number) {
  const headers = ["Date", "Biometric In", "Biometric Out", "Work Hours", "Status"];
  const rows = records.map((r) => [
    r.date, r.inTime, r.outTime,
    computeWorkHours(r.inTime, r.outTime),
    r.status,
  ]);
  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${year}-${String(month).padStart(2, "0")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface AttendancePageProps {
  onBack?: () => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const years = [now.getFullYear(), now.getFullYear() - 1];

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilter, setShowFilter] = useState(false);

  const attendance = useAttendance(selectedYear, selectedMonth);

  const allRecords: AttendanceRecord[] = Array.isArray(attendance?.records)
    ? (attendance.records as AttendanceRecord[])
    : [];

  const records = useMemo(() => {
    if (filterStatus === "all") return allRecords;
    const needle = filterStatus.toLowerCase().trim();
    return allRecords.filter((r) =>
      (r.status || "").toLowerCase().trim().includes(needle)
    );
  }, [allRecords, filterStatus]);

  const stats: AttendanceStats = attendance?.stats
    ? {
        present: toNumber(attendance.stats.present),
        absent: toNumber(attendance.stats.absent),
        late: toNumber(attendance.stats.late),
        halfDay: toNumber((attendance.stats as any).halfDay),
        percentage: toNumber(attendance.stats.percentage),
        totalDays: toNumber((attendance.stats as any).totalDays),
        monthLabel: (attendance.stats as any).monthLabel,
      }
    : { present: 0, absent: 0, late: 0, halfDay: 0, percentage: 0, totalDays: 0 };

  const loading = Boolean(attendance?.loading);

  // ── Chart colors use the SAME STATUS_COLORS.accent as KPI cards ──────
  const chartData = useMemo(
    () => [
      { name: "Present",  value: stats.present,  color: STATUS_COLORS.present.accent },
      { name: "Absent",   value: stats.absent,   color: STATUS_COLORS.absent.accent  },
      { name: "Late",     value: stats.late,     color: STATUS_COLORS.late.accent    },
      { name: "Half Day", value: stats.halfDay,  color: STATUS_COLORS.halfDay.accent },
    ],
    [stats.present, stats.absent, stats.late, stats.halfDay]
  );

  const monthLabel = stats.monthLabel || "This Month";
  const pct = Math.max(0, Math.min(100, Math.round(stats.percentage)));

  const handleBack = () => {
    if (onBack) onBack();
    else navigate("/ess");
  };

  if (loading)
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-gray-400 text-sm font-medium">
        <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
        Loading attendance records…
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">
            Attendance Statistics
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Summary for <span className="font-bold text-green-600">{monthLabel}</span>
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                filterStatus !== "all"
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-green-200 hover:bg-green-50/40"
              }`}
            >
              <Filter size={14} />
              {filterStatus !== "all" ? filterStatus : "Filter"}
            </button>
            {showFilter && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                {["all", "Present", "Absent", "Late", "Half Day", "On Leave"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => { setFilterStatus(status); setShowFilter(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${
                      filterStatus === status
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {status === "all" ? "All Records" : status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filterStatus !== "all" && (
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
            >
              <X size={13} /> Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => exportToCSV(allRecords, selectedYear, selectedMonth)}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── KPI Cards Row ── */}
      {stats.totalDays > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard themeKey="present" value={stats.present} label="Present"  icon={<CheckCircle2 size={18} strokeWidth={2.5} />} />
          <KpiCard themeKey="late"    value={stats.late}    label="Late"     icon={<Clock size={18} strokeWidth={2.5} />} />
          <KpiCard themeKey="halfDay" value={stats.halfDay} label="Half Day" icon={<Minus size={18} strokeWidth={3} />} />
          <KpiCard themeKey="absent"  value={stats.absent}  label="Absent"   icon={<XCircle size={18} strokeWidth={2.5} />} />
        </div>
      )}

      {/* ── Insights Banner ── */}
      {stats.totalDays > 0 && (
        <div className={`rounded-xl border p-4 flex items-center gap-3.5 ${
          pct >= 75
            ? "bg-green-50/70 border-green-200"
            : pct >= 50
              ? "bg-amber-50/70 border-amber-200"
              : "bg-red-50/70 border-red-200"
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            pct >= 75 ? "bg-green-100" : pct >= 50 ? "bg-amber-100" : "bg-red-100"
          }`}>
            <TrendingUp size={18} strokeWidth={2.5} className={pct >= 75 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${pct >= 75 ? "text-green-700" : pct >= 50 ? "text-amber-700" : "text-red-700"}`}>
              {pct >= 75 ? "Great attendance this month!" : pct >= 50 ? "Attendance needs attention" : "Low attendance alert"}
            </p>
            <p className="text-[13px] text-gray-600 mt-0.5 font-medium">
              Present <strong>{stats.present}</strong> of <strong>{stats.totalDays}</strong> days
              {stats.late > 0 && <> · <strong>{stats.late}</strong> late</>}
              {stats.halfDay > 0 && <> · <strong>{stats.halfDay}</strong> half day</>}
              {stats.absent > 0 && <> · <strong>{stats.absent}</strong> absent</>}
            </p>
          </div>
        </div>
      )}

      {/* ── Chart + Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] p-6 flex flex-col items-center">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4 self-start">
              Overview
            </p>
            {stats.totalDays === 0 ? (
              <div className="w-full py-10 flex flex-col items-center text-center text-gray-400">
                <Clock size={28} className="mb-2 opacity-30" />
                <p className="text-xs font-bold">No attendance logged yet</p>
                <p className="text-[11px] mt-0.5">Scores appear once check-ins are recorded</p>
              </div>
            ) : (
              <>
                <div className="relative w-full" style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={chartData.filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={48} outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartData.filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #f0fdf4", fontSize: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="text-4xl font-black tracking-tight"
                      style={{ color: pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626" }}>
                      {pct}%
                    </div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                      Score
                    </div>
                  </div>
                </div>
                <div className="w-full mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 75
                        ? "linear-gradient(90deg,#22c55e,#16a34a)"
                        : pct >= 50
                          ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                          : "linear-gradient(90deg,#f87171,#ef4444)",
                    }}
                  />
                </div>
                <div className="w-full mt-5 space-y-2.5">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex justify-between items-center px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-gray-600 font-bold">{item.name}</span>
                      </div>
                      <span className="text-sm font-black text-gray-800">{item.value} days</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <Calendar size={16} className="text-green-600" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-black text-gray-800 text-base tracking-tight">Attendance Log</p>
                  <p className="text-[11px] text-gray-400 font-semibold">{records.length} records</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {stats.totalDays > 0 && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    pct >= 75
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : pct >= 50
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    <TrendingUp size={13} strokeWidth={2.5} />
                    {pct}% Score
                  </div>
                )}

                {filterStatus !== "all" && (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 font-black border border-green-100 uppercase tracking-wider">
                    {filterStatus}
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-green-50 text-green-700 text-[11px] uppercase tracking-widest font-black sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Biometric In</th>
                    <th className="px-6 py-4">Biometric Out</th>
                    <th className="px-6 py-4">Work Hours</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                            <Calendar size={28} className="opacity-40" />
                          </div>
                          <div>
                            <p className="text-base font-black text-gray-600">No records for {monthLabel}</p>
                            <p className="text-xs mt-1 font-medium">
                              {filterStatus !== "all"
                                ? `No "${filterStatus}" records found. Try clearing the filter.`
                                : "Your attendance will appear here once check-ins are recorded."}
                            </p>
                          </div>
                          {filterStatus !== "all" && (
                            <button
                              onClick={() => setFilterStatus("all")}
                              className="mt-2 px-4 py-2 bg-green-50 text-green-700 text-xs font-black rounded-lg hover:bg-green-100 transition-colors uppercase tracking-wider"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-green-50/60 transition-colors border-l-4 border-transparent hover:border-l-green-400"
                      >
                        <td className="px-6 py-4 font-bold text-gray-800 text-sm">{formatDateWithDay(record.date)}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-bold tabular-nums">{record.inTime}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-bold tabular-nums">{record.outTime}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-bold tabular-nums">
                          {computeWorkHours(record.inTime, record.outTime)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={record.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};