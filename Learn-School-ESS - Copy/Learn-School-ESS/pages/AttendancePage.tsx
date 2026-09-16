import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAttendance } from "../hooks/useAttendance";
import type { AttendanceRecord } from "../hooks/useAttendance";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Download, Filter, X, CheckCircle2, XCircle, Clock,
  Calendar, ChevronDown, TrendingUp, ArrowLeft,
} from "lucide-react";

type AttendanceStats = {
  present: number;
  absent: number;
  late: number;
  percentage: number;
  totalDays: number;
  monthLabel?: string;
};

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

function statusPillClass(statusRaw: string) {
  const status = (statusRaw || "").toLowerCase();
  if (status.includes("present")) return "bg-green-100 text-green-700 border border-green-200";
  if (status.includes("late"))    return "bg-amber-100 text-amber-700 border border-amber-200";
  if (status.includes("absent"))  return "bg-red-100 text-red-700 border border-red-200";
  if (status.includes("half"))    return "bg-orange-100 text-orange-700 border border-orange-200";
  if (status.includes("leave"))   return "bg-sky-100 text-sky-700 border border-sky-200";
  if (status.includes("holiday") || status.includes("week")) return "bg-violet-100 text-violet-700 border border-violet-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

function exportToCSV(records: AttendanceRecord[]) {
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
  a.download = "attendance.csv";
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
        percentage: toNumber(attendance.stats.percentage),
        totalDays: toNumber((attendance.stats as any).totalDays),
        monthLabel: (attendance.stats as any).monthLabel,
      }
    : { present: 0, absent: 0, late: 0, percentage: 0, totalDays: 0 };

  const loading = Boolean(attendance?.loading);

  const chartData = useMemo(
    () => [
      { name: "Present", value: stats.present, color: "#22c55e" },
      { name: "Absent",  value: stats.absent,  color: "#ef4444" },
      { name: "Late",    value: stats.late,     color: "#f59e0b" },
    ],
    [stats.present, stats.absent, stats.late]
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
          <h2 className="text-xl font-black text-gray-800">Attendance Statistics</h2>
          <p className="text-gray-400 text-sm mt-0.5">Summary for <span className="font-semibold text-green-600">{monthLabel}</span></p>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2">

          {/* Month selector */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Year selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 appearance-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
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
                {["all", "Present", "Absent", "Late"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => { setFilterStatus(status); setShowFilter(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                      filterStatus === status
                        ? "bg-green-50 text-green-700 font-bold"
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
              className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <X size={13} /> Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => exportToCSV(allRecords)}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── Chart + Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Donut chart */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)] transition-shadow duration-200 p-6 flex flex-col items-center">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 self-start">
              Overview
            </p>
            {stats.totalDays === 0 ? (
              <div className="w-full py-10 flex flex-col items-center text-center text-gray-400">
                <Clock size={28} className="mb-2 opacity-30" />
                <p className="text-xs font-semibold">No attendance logged yet</p>
                <p className="text-[11px] mt-0.5">Scores appear once check-ins are recorded</p>
              </div>
            ) : (
              <>
                <div className="relative w-full" style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={chartData.filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={65}
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
                    <div className="text-3xl font-black"
                      style={{ color: pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626" }}>
                      {pct}%
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
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
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-500 font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-700">{item.value} days</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)] transition-shadow duration-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <Calendar size={15} className="text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Attendance Log</p>
                  <p className="text-[11px] text-gray-400">{records.length} records</p>
                </div>
              </div>
              {filterStatus !== "all" && (
                <span className="text-xs px-3 py-1 rounded-full bg-green-50 text-green-700 font-bold border border-green-100">
                  {filterStatus}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-green-50 text-green-700 text-[10px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Biometric In</th>
                    <th className="px-6 py-3.5">Biometric Out</th>
                    <th className="px-6 py-3.5">Work Hours</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Calendar size={28} className="opacity-20" />
                          <p className="text-sm font-semibold">No attendance records found</p>
                          <p className="text-xs">Try selecting a different month or clearing the filter</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="hover:bg-green-50/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800 text-sm">{record.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium tabular-nums">{record.inTime}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium tabular-nums">{record.outTime}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium tabular-nums">
                          {computeWorkHours(record.inTime, record.outTime)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm ${statusPillClass(record.status)}`}>
                            {record.status || "—"}
                          </span>
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