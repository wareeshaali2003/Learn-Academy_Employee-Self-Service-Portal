// pages/MarkAttendancePage.tsx
// Mark Attendance — alag standalone page

import React, { useState, useMemo, useEffect } from "react";
import {
  ClipboardCheck, BookOpen, Users, Clock, Calendar,
  CheckCircle2, XCircle, AlertCircle, Save, RotateCcw, BookMarked,
} from "lucide-react";

import { api, BulkAttendanceRow } from "../services/api";
import { useSchedule }      from "../hooks/Useschedule";
import { useGroupStudents } from "../hooks/Usestudents";
import { Skeleton, avatarColor, formatTime, formatDate } from "../components/Shared";

// ─── Type ─────────────────────────────────────────────────────────────────────

type AttendanceStatus = "Present" | "Leave" | "Absent";

// ─── Status Dropdown ──────────────────────────────────────────────────────────

function StatusSelect({
  value,
  onChange,
}: {
  value: AttendanceStatus;
  onChange: (v: AttendanceStatus) => void;
}) {
  const colorMap: Record<AttendanceStatus, string> = {
    Present: "border-green-400 bg-green-50 text-green-700 focus:ring-green-100",
    Leave:   "border-blue-400  bg-blue-50  text-blue-700  focus:ring-blue-100",
    Absent:  "border-red-300   bg-red-50   text-red-600   focus:ring-red-100",
  };

  const iconMap: Record<AttendanceStatus, React.ReactNode> = {
    Present: <CheckCircle2 size={13} />,
    Leave:   <BookMarked   size={13} />,
    Absent:  <XCircle      size={13} />,
  };

  const chevronColor: Record<AttendanceStatus, string> = {
    Present: "text-green-500",
    Leave:   "text-blue-500",
    Absent:  "text-red-400",
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Left icon */}
      <span className={`absolute left-2.5 pointer-events-none z-10 ${
        value === "Present" ? "text-green-600"
        : value === "Leave" ? "text-blue-600"
        : "text-red-500"
      }`}>
        {iconMap[value]}
      </span>

      {/* Native select */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AttendanceStatus)}
        className={`pl-8 pr-7 py-2 rounded-xl text-xs font-bold border-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 transition-all ${colorMap[value]}`}
      >
        <option value="Present">Present</option>
        <option value="Leave">Leave</option>
        <option value="Absent">Absent</option>
      </select>

      {/* Right chevron */}
      <svg
        className={`absolute right-2 pointer-events-none w-3 h-3 ${chevronColor[value]}`}
        viewBox="0 0 12 12" fill="none"
      >
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Helper: UI status → ERPNext status ──────────────────────────────────────

function toErpStatus(status: AttendanceStatus): "Present" | "Absent" | "Leave" {
 return status;
}


// ─── Main Page ────────────────────────────────────────────────────────────────

export const MarkAttendancePage: React.FC = () => {
  const { schedule, loading: schLoading } = useSchedule();
  const [selectedSchedule, setSelectedSchedule] = useState<string>("");

  const selectedEntry = useMemo(
    () => schedule.find((s) => s.name === selectedSchedule),
    [schedule, selectedSchedule]
  );

  const { students, loading: stuLoading, error: stuError } =
    useGroupStudents(selectedEntry?.student_group);

  const activeStudents = useMemo(() => students.filter((s) => s.active !== 0), [students]);

  const [statusMap, setStatusMap]     = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving]           = useState(false);
  const [saveResults, setSaveResults] = useState<{ success: number; failed: string[] } | null>(null);

  const presentCount = Object.values(statusMap).filter((v) => v === "Present").length;
  const leaveCount   = Object.values(statusMap).filter((v) => v === "Leave").length;
  const absentCount  = Object.values(statusMap).filter((v) => v === "Absent").length;

  // Default all to Present when students load
  useEffect(() => {
    if (activeStudents.length > 0) {
      const init: Record<string, AttendanceStatus> = {};
      activeStudents.forEach((s) => { init[s.student] = "Present"; });
      setStatusMap(init);
    }
  }, [activeStudents]);

  const handleChange = (id: string, value: AttendanceStatus) =>
    setStatusMap((p) => ({ ...p, [id]: value }));

  const handleMarkAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    activeStudents.forEach((s) => { next[s.student] = status; });
    setStatusMap(next);
  };

  const handleSave = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    setSaveResults(null);

    // Build the whole class's attendance as one array — this is what gets
    // sent as ONE HTTP request, instead of one request per student.
    const rows: BulkAttendanceRow[] = activeStudents.map((s) => {
      const attendanceStatus = statusMap[s.student] ?? "Present";
      return {
        student:         s.student,
        student_name:    s.student_name,
        course_schedule: selectedEntry.name,
        student_group:   selectedEntry.student_group,
        date:            selectedEntry.schedule_date,
        status:          toErpStatus(attendanceStatus),
      };
    });

    const result = await api.bulkMarkAttendance(rows);

    if (result.ok) {
      const failed = result.data.failed.map((f) => {
        const student = activeStudents.find((s) => s.student === f.student);
        return `${student?.student_name || f.student || "Unknown student"}: ${f.error}`;
      });

      setSaveResults({
        success: result.data.created + result.data.updated,
        failed,
      });
    } else {
      // Whole request failed (e.g. network error, endpoint not deployed yet)
      setSaveResults({ success: 0, failed: [result.error] });
    }

    setSaving(false);
  };

  const handleReset = () => {
    setSelectedSchedule("");
    setStatusMap({});
    setSaveResults(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Schedule Selector ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Mark Attendance</h3>
            <p className="text-xs text-gray-400">Select a course schedule to mark attendance</p>
          </div>
        </div>

        {schLoading ? <Skeleton rows={1} /> : (
          <select
            value={selectedSchedule}
            onChange={(e) => { setSelectedSchedule(e.target.value); setSaveResults(null); }}
            className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
          >
            <option value="">— Select a course schedule —</option>
            {schedule.map((s) => {
              const isHoliday = (s as any).custom_is_holiday;
              return (
                <option 
                  key={s.name} 
                  value={s.name} 
                  disabled={isHoliday}
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

        {selectedEntry && (selectedEntry as any).custom_is_holiday && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-700">
                {(selectedEntry as any).custom_holiday_name || "Holiday"}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                This date is a holiday. Attendance cannot be marked for this schedule.
              </p>
            </div>
          </div>
        )}

        {selectedEntry && !(selectedEntry as any).custom_is_holiday && (
          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-green-700 font-bold">
              <BookOpen size={13} /> {selectedEntry.course}
            </span>
            <span className="flex items-center gap-1.5 text-green-600">
              <Users size={13} /> {selectedEntry.student_group}
            </span>
            <span className="flex items-center gap-1.5 text-green-600">
              <Clock size={13} /> {formatTime(selectedEntry.from_time)} – {formatTime(selectedEntry.to_time)}
            </span>
            <span className="flex items-center gap-1.5 text-green-600">
              <Calendar size={13} /> {formatDate(selectedEntry.schedule_date)}
            </span>
          </div>
        )}
      </div>

      {selectedSchedule && selectedEntry && !(selectedEntry as any).custom_is_holiday && (
        <>
          {stuError && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">⚠ {stuError}</p>
          )}

          {stuLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <Skeleton rows={6} />
            </div>
          ) : activeStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-semibold">No active students in this group</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* ── Header: counts + bulk buttons ── */}
              <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                    <CheckCircle2 size={11} /> Present {presentCount}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                    <BookMarked size={11} /> Leave {leaveCount}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold">
                    <XCircle size={11} /> Absent {absentCount}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">/ {activeStudents.length} total</span>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleMarkAll("Present")}
                    className="px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-bold hover:bg-green-100 transition-colors">
                    All Present
                  </button>
                  <button type="button" onClick={() => handleMarkAll("Leave")}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors">
                    All Leave
                  </button>
                  <button type="button" onClick={() => handleMarkAll("Absent")}
                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                    All Absent
                  </button>
                </div>
              </div>

              {/* ── Column labels ── */}
              <div className="grid grid-cols-[2.5rem_1fr_auto] items-center px-6 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
              </div>

              {/* ── Student rows ── */}
              <div className="divide-y divide-gray-50">
                {activeStudents.map((s, i) => {
                  const status: AttendanceStatus = statusMap[s.student] ?? "Present";
                  const isPresent = status === "Present";
                  const isLeave   = status === "Leave";

                  return (
                    <div
                      key={s.student}
                      className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 px-6 py-3.5 transition-colors ${
                        isPresent ? "hover:bg-green-50/20"
                        : isLeave  ? "bg-blue-50/20 hover:bg-blue-50/30"
                        :            "bg-red-50/20 hover:bg-red-50/30"
                      }`}
                    >
                      {/* Roll number */}
                      <span className="text-xs text-gray-400 font-mono text-center">
                        {s.group_roll_number ?? i + 1}
                      </span>

                      {/* Student info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${
                          isPresent ? avatarColor(s.student_name)
                          : isLeave  ? "bg-blue-400"
                          :            "bg-gray-300"
                        }`}>
                          {s.student_name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm truncate ${
                            isPresent ? "text-gray-800"
                            : isLeave  ? "text-blue-700"
                            :            "text-gray-400"
                          }`}>
                            {s.student_name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">{s.student}</p>
                        </div>
                      </div>

                      {/* ── Dropdown ── */}
                      <StatusSelect
                        value={status}
                        onChange={(v) => handleChange(s.student, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Save Result Banner ── */}
          {saveResults && (
            <div className={`rounded-2xl px-6 py-4 flex items-start gap-3 ${
              saveResults.failed.length === 0
                ? "bg-green-50 border border-green-200"
                : "bg-amber-50 border border-amber-200"
            }`}>
              {saveResults.failed.length === 0 ? (
                <>
                  <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-green-700 text-sm">Attendance saved!</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {saveResults.success} records saved in ERPNext.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-700 text-sm">
                      {saveResults.success} saved · {saveResults.failed.length} failed
                    </p>
                    <ul className="text-xs text-amber-600 mt-1 space-y-0.5">
                      {saveResults.failed.slice(0, 5).map((f, i) => <li key={i}>• {f}</li>)}
                      {saveResults.failed.length > 5 && (
                        <li>…and {saveResults.failed.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Action Buttons ── */}
          {activeStudents.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  saving
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 text-white shadow-green-100"
                }`}
              >
                <Save size={15} />
                {saving
                  ? `Saving… (${activeStudents.length} records)`
                  : `Save Attendance (${activeStudents.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MarkAttendancePage;