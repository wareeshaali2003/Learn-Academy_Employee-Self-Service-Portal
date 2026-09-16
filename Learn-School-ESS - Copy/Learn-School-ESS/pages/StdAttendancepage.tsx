// pages/StdAttendancepage.tsx
// Student Attendance (view only) — alag standalone page

import React, { useState, useMemo } from "react";
import { Users, BookOpen, User, Clock, MapPin, Search, Filter, CalendarDays, AlertCircle } from "lucide-react";

import { useSchedule }          from "../hooks/Useschedule";
import { useStudentAttendance } from "../hooks/Usestdattendance";
import {
  SectionHeader, Skeleton, StatusBadge,
  formatTime, formatDate, avatarColor,
} from "../components/Shared";

export const AttendancePage: React.FC = () => {
  const { schedule, loading: schLoading } = useSchedule();
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { attendance, loading, error } = useStudentAttendance(
    selectedSchedule || undefined
  );

  const selectedEntry = useMemo(
    () => schedule.find((s) => s.name === selectedSchedule),
    [schedule, selectedSchedule]
  );

  const filtered = useMemo(() =>
    attendance.filter((a) => {
      const matchSearch =
        !search ||
        a.student_name.toLowerCase().includes(search.toLowerCase()) ||
        a.student.toLowerCase().includes(search.toLowerCase());

      const statusLower = a.status?.toLowerCase() ?? "";
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "leave" && statusLower === "leave") ||
        statusFilter === statusLower;

      return matchSearch && matchStatus;
    }), [attendance, search, statusFilter]);

  const stats = useMemo(() => {
    const total   = attendance.length;
    const present = attendance.filter((a) => a.status?.toLowerCase() === "present").length;
    const absent  = attendance.filter((a) => a.status?.toLowerCase() === "absent").length;
    const leave   = attendance.filter((a) => a.status?.toLowerCase() === "leave").length;
    return {
      total, present, absent, leave,
      pct: total ? Math.round((present / total) * 100) : 0,
    };
  }, [attendance]);

  return (
    <div className="space-y-6">

      {/* Schedule Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader icon={<Users size={20} />} title="Student Attendance" subtitle="Select a course schedule" />
        {schLoading ? <Skeleton rows={1} /> : (
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
          >
            <option value="">— Select a course schedule —</option>
            {schedule.map((s) => {
              const isHoliday = (s as any).custom_is_holiday;
              return (
                <option 
                  key={s.name} 
                  value={s.name}
                  style={isHoliday ? { 
                    backgroundColor: '#fef3c7', 
                    color: '#92400e',
                    fontWeight: 600 
                  } : undefined}
                >
                  {s.title || s.name}  ·  {formatDate(s.schedule_date)}  ·  {formatTime(s.from_time)}
                  {isHoliday ? `  ·  Holiday (${(s as any).custom_holiday_name || "Holiday"})` : ""}
                </option>
              );
            })}
          </select>
        )}

        {/* ✅ Holiday Warning Banner */}
        {selectedEntry && (selectedEntry as any).custom_is_holiday && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-sm">
            <CalendarDays size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-700">
                🎉 {(selectedEntry as any).custom_holiday_name || "Holiday"}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                This schedule is marked as a holiday. No attendance records.
              </p>
            </div>
          </div>
        )}

        {selectedEntry && !(selectedEntry as any).custom_is_holiday && (
          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-bold"><BookOpen size={13} /> {selectedEntry.course}</span>
            <span className="flex items-center gap-1.5 text-green-600"><User size={13} /> {selectedEntry.instructor_name}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Clock size={13} /> {formatTime(selectedEntry.from_time)} – {formatTime(selectedEntry.to_time)}</span>
            <span className="flex items-center gap-1.5 text-green-600"><Users size={13} /> {selectedEntry.student_group}</span>
            {selectedEntry.room && (
              <span className="flex items-center gap-1.5 text-green-600"><MapPin size={13} /> {selectedEntry.room}</span>
            )}
          </div>
        )}
      </div>

      {selectedSchedule && !(selectedEntry as any)?.custom_is_holiday && (
        <>
          {/* Stat Cards — 4 columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total",   value: stats.total,   bar: "bg-gray-400",  card: "bg-gray-50 text-gray-700" },
              { label: "Present", value: stats.present, bar: "bg-green-500", card: "bg-green-50 text-green-700" },
              { label: "Leave",   value: stats.leave,   bar: "bg-blue-400",  card: "bg-blue-50 text-blue-700" },
              { label: "Absent",  value: stats.absent,  bar: "bg-red-500",   card: "bg-red-50 text-red-700" },
            ].map((s) => (
              <div key={s.label} className={`${s.card} rounded-xl p-4 flex items-center gap-3`}>
                <div className={`w-1.5 h-10 rounded-full ${s.bar} flex-shrink-0`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-60">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Donut + progress bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 pt-7 pb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Attendance Rate (Present)</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black leading-none"
                    style={{ color: stats.pct >= 75 ? "#16a34a" : stats.pct >= 50 ? "#d97706" : "#dc2626" }}>
                    {stats.pct}%
                  </span>
                  <span className="text-sm font-semibold mb-1.5"
                    style={{ color: stats.pct >= 75 ? "#16a34a" : stats.pct >= 50 ? "#d97706" : "#dc2626" }}>
                    {stats.pct >= 75 ? "Good" : stats.pct >= 50 ? "Average" : "Low"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{stats.present} present out of {stats.total} students</p>
              </div>
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <circle cx="40" cy="40" r="32" fill="none"
                    stroke={stats.pct >= 75 ? "#22c55e" : stats.pct >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(stats.pct / 100) * 201} 201`}
                    style={{ transition: "stroke-dasharray 1s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black text-gray-700">{stats.pct}%</span>
                </div>
              </div>
            </div>
            <div className="px-8 pb-6 pt-4">
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {stats.total > 0 ? (
                  <>
                    <div className="bg-green-500 transition-all duration-700 rounded-l-full"
                      style={{ width: `${(stats.present / stats.total) * 100}%` }} />
                    <div className="bg-blue-400 transition-all duration-700"
                      style={{ width: `${(stats.leave / stats.total) * 100}%` }} />
                    <div className="bg-red-400 transition-all duration-700 rounded-r-full"
                      style={{ width: `${(stats.absent / stats.total) * 100}%` }} />
                  </>
                ) : <div className="bg-gray-100 w-full rounded-full" />}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Present {stats.present}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Leave {stats.leave}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Absent {stats.absent}
                </span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search student…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 w-48" />
            </div>
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-green-400 appearance-none">
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="leave">Leave</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            {(search || statusFilter !== "all") && (
              <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="text-xs text-red-500 border border-red-200 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors font-semibold">
                Clear
              </button>
            )}
            <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {attendance.length} records</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {error && <p className="text-sm text-red-500 bg-red-50 px-6 py-3">⚠ {error}</p>}
            {loading ? (
              <div className="p-8"><Skeleton rows={5} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-6 py-4">Student</th>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Group</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                          No records found.
                        </td>
                      </tr>
                    ) : filtered.map((a) => (
                      <tr key={a.name} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${avatarColor(a.student_name)} text-white flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0`}>
                              {a.student_name.slice(0, 2)}
                            </div>
                            <span className="font-semibold text-gray-800 text-sm">{a.student_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 font-mono">{a.student}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-semibold">{a.student_group}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(a.date)}</td>
                        <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendancePage;