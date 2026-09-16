import React, { useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  School,
  AlertTriangle,
} from "lucide-react";
import { useCeoSchedule, GradeScheduleSummary, SectionScheduleSummary } from "../hooks/Useceoschedule";
import {
  SectionHeader,
  Skeleton,
  formatTime,
  formatDate,
  formatMinutesLabel,
  ScreenTimeMeter,
} from "../components/Shared";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Overall stat pill (top strip) ─────────────────────────────────────────────
function StatPill({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-1 min-w-[150px]">
      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{label}</p>
        <p className="text-lg font-black text-gray-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── One section row (e.g. "Grade-6-A") — class count + total time + expandable periods ──
function SectionRow({ section }: { section: SectionScheduleSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
          <span className="text-sm font-bold text-gray-800 truncate">{section.section}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 flex-shrink-0">
            {section.classCount} {section.classCount === 1 ? "class" : "classes"}
          </span>
        </div>
        <span className="text-xs font-bold text-gray-500 flex-shrink-0">
          {formatMinutesLabel(section.usedMinutes)}
        </span>
      </button>

      <div className="px-3 pb-3">
        <ScreenTimeMeter
          label="Total scheduled today"
          usedMinutes={section.usedMinutes}
          limit={section.limit}
        />
      </div>

      {open && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {section.entries.map((e) => (
            <div key={e.name} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-gray-700 truncate">
                  {formatTime(e.from_time)} – {formatTime(e.to_time)}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {e.course || e.title || "—"} · {e.instructor_name || "—"}
                </p>
              </div>
              {e.room && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-gray-50 text-gray-500 flex-shrink-0">
                  {e.room}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── One grade card — rolls up all its sections ────────────────────────────────
function GradeCard({ grade }: { grade: GradeScheduleSummary }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
            <School size={16} />
          </div>
          <div>
            <p className="text-sm font-black text-gray-800">{grade.gradeLabel}</p>
            <p className="text-[11px] text-gray-400">
              {grade.sections.length} section{grade.sections.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-gray-800">{grade.totalClasses} classes</p>
          <p className="text-[11px] text-gray-400">{formatMinutesLabel(grade.totalMinutes)} total</p>
        </div>
      </div>

      <div className="space-y-2">
        {grade.sections.map((s) => (
          <SectionRow key={s.section} section={s} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CeoSchedulePage() {
  const { date, setDate, grades, totals, loading, error, refresh } = useCeoSchedule();

  return (
    <div className="p-4 md:p-6 space-y-5">
      <SectionHeader
        icon={<CalendarDays size={18} />}
        title="Daily Class Schedule — All Grades"
        subtitle="Every grade & section's classes today, with total scheduled hours vs. PEIRA screen-time limits"
      />

      {/* Date picker + refresh */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayStr())}
            className="text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
        <span className="text-xs text-gray-400 font-medium">{formatDate(date)}</span>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-800 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Overall totals strip */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Total Classes Today" value={loading ? "—" : totals.totalClasses} icon={<Layers size={16} />} />
        <StatPill label="Sections Running" value={loading ? "—" : totals.totalSections} icon={<School size={16} />} />
        <StatPill label="Total Hours Covered" value={loading ? "—" : formatMinutesLabel(totals.totalMinutes)} icon={<Clock size={16} />} />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl px-4 py-3">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Grade-by-grade breakdown */}
      {loading ? (
        <Skeleton rows={5} />
      ) : grades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <CalendarDays size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400 font-medium">No classes scheduled on this date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grades.map((g) => (
            <GradeCard key={g.gradeLabel} grade={g} />
          ))}
        </div>
      )}
    </div>
  );
}