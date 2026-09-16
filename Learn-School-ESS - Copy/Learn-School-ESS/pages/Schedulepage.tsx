import React, { useState, useMemo } from "react";
import { Calendar, RefreshCw, Clock, User, MapPin, CalendarDays, X, Users, BookOpen, PartyPopper } from "lucide-react";

import { useSchedule } from "../hooks/Useschedule";
import {
  SectionHeader,
  Skeleton,
  scheduleColorClass,
  formatTime,
  formatDate,
  getWeekday,
  extractGradeNumber,
  getScreenTimeLimit,
  timeStrToMinutes,
  ScreenTimeMeter,
} from "../components/Shared";

// Rotating accent palette for session-card icon badges + bottom bars —
// gives each class a bit of visual identity, in the same idiom as the
// Quick Overview cards (colored icon square + colored accent bar).
const SESSION_ACCENTS = [
  "#7c3aed", // purple
  "#2563eb", // blue
  "#16a34a", // green
  "#0d9488", // teal
  "#d97706", // amber
  "#db2777", // rose
];

// ─── Small stat card, same language as the Programs & Courses page ────────

function StatCard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
  barColor,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  barColor: string;
}) {
  return (
    <div className="flex-1 min-w-[220px] bg-white rounded-2xl border border-gray-100 shadow-sm p-5 pb-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-400 tracking-wide">{label}</p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-800 mt-2 truncate">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      <div className="mt-4 -mx-5 -mb-4 h-1 rounded-b-2xl" style={{ backgroundColor: barColor }} />
    </div>
  );
}

export const SchedulePage: React.FC = () => {
  const [programFilter, setProgramFilter] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Fetch ALL sessions first (no filter) to build the program list
  const { schedule: allSchedule } = useSchedule(undefined);

  // Filtered schedule used for display
  const { schedule, loading, error, refetch } = useSchedule(
    programFilter || undefined
  );

  const today = new Date().toISOString().slice(0, 10);

  // Derive unique programs only from this teacher's schedule entries
  const teacherPrograms = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string }[] = [];
    allSchedule.forEach((s) => {
      if (s.program && !seen.has(s.program)) {
        seen.add(s.program);
        result.push({ name: s.program });
      }
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [allSchedule]);

  // Apply the date filter (if any) before grouping
  const dateFilteredSchedule = useMemo(() => {
    if (!selectedDate) return schedule;
    return schedule.filter((s) => s.schedule_date === selectedDate);
  }, [schedule, selectedDate]);

  const byDate = useMemo(() => {
    const map: Record<string, typeof schedule> = {};
    dateFilteredSchedule.forEach((s) => {
      const key = s.schedule_date || "Unknown";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    const grouped = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => {
        // PEIRA screen-time: sum up scheduled minutes per SECTION (student_group)
        // for this date only — so a section's total is the sum of its own
        // classes that day, never mixed with another section or another date.
        const minutesByGroup: Record<string, number> = {};
        entries.forEach((e) => {
          if (e.custom_is_holiday) return;
          const from = timeStrToMinutes(e.from_time);
          const to = timeStrToMinutes(e.to_time);
          if (from === null || to === null || to <= from) return;
          const key = (e.student_group || "Unknown").trim();
          minutesByGroup[key] = (minutesByGroup[key] || 0) + (to - from);
        });

        const screenTime = Object.entries(minutesByGroup)
          .map(([group, usedMinutes]) => {
            const sample = entries.find((e) => (e.student_group || "Unknown").trim() === group);
            const gradeNumber =
              extractGradeNumber(sample?.student_group) ?? extractGradeNumber(sample?.program);
            return {
              group,
              usedMinutes,
              limit: getScreenTimeLimit(gradeNumber),
            };
          })
          .sort((a, b) => a.group.localeCompare(b.group));

        return {
          date,
          weekday: getWeekday(date),
          isToday: date === today,
          entries: [...entries].sort((a, b) =>
            a.from_time.localeCompare(b.from_time)
          ),
          screenTime,
        };
      });

    // Pin today's schedule to the top when showing multiple dates
    const todayIndex = grouped.findIndex((g) => g.isToday);
    if (todayIndex > 0) {
      const [todayGroup] = grouped.splice(todayIndex, 1);
      grouped.unshift(todayGroup);
    }
    return grouped;
  }, [dateFilteredSchedule, today]);

  const hasTodaySession = allSchedule.some((s) => s.schedule_date === today);
  const todaySessionCount = allSchedule.filter((s) => s.schedule_date === today).length;

  return (
    <div className="space-y-6">
      {/* Quick Overview */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          label="Total Sessions"
          value={dateFilteredSchedule.length}
          subtitle={programFilter ? `In ${programFilter}` : "Across all programs"}
          icon={<Calendar size={17} />}
          iconBg="#7c3aed"
          barColor="#c4b5fd"
        />
        <StatCard
          label="Today's Sessions"
          value={todaySessionCount}
          subtitle={formatDate(today)}
          icon={<CalendarDays size={17} />}
          iconBg="#2563eb"
          barColor="#bfdbfe"
        />
        <StatCard
          label="Active Filter"
          value={programFilter || "All Programs"}
          subtitle={selectedDate ? formatDate(selectedDate) : "No date filter"}
          icon={<Users size={17} />}
          iconBg="#16a34a"
          barColor="#bbf7d0"
        />
      </div>

      {/* Program Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-400 flex-shrink-0">
          Program
        </span>

        <div className="flex flex-wrap items-center gap-1 bg-gray-50 rounded-xl p-1.5">
          <button
            type="button"
            onClick={() => setProgramFilter("")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !programFilter
                ? "bg-green-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white"
            }`}
          >
            All
          </button>

          {/* Only teacher's own programs */}
          {teacherPrograms.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setProgramFilter(p.name)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                programFilter === p.name
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={refetch}
          aria-label="Refresh schedule"
          className="ml-auto p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-400 flex-shrink-0">
          Date
        </span>

        {/* Today quick button */}
        <button
          type="button"
          onClick={() => setSelectedDate(today)}
          disabled={!hasTodaySession}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
            selectedDate === today
              ? "border-green-500 bg-green-600 text-white"
              : hasTodaySession
              ? "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700"
              : "border-gray-100 text-gray-300 cursor-not-allowed"
          }`}
        >
          <CalendarDays size={13} />
          Today
        </button>

        {/* Date picker */}
        <label className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:border-green-300 transition-all cursor-pointer">
          <Calendar size={13} className="text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="outline-none bg-transparent text-xs font-semibold text-gray-700 cursor-pointer"
          />
        </label>

        {/* Clear date filter */}
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 transition-all flex items-center gap-1.5"
          >
            <X size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <SectionHeader
          icon={<Calendar size={20} />}
          title="Course Schedule"
          subtitle={`${dateFilteredSchedule.length} session${
            dateFilteredSchedule.length !== 1 ? "s" : ""
          }${programFilter ? ` · ${programFilter}` : ""}${
            selectedDate ? ` · ${formatDate(selectedDate)}` : ""
          }`}
        />

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl mb-4">
            ⚠ {error}
          </p>
        )}

        {loading ? (
          <Skeleton rows={4} />
        ) : byDate.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            {selectedDate
              ? "No schedule entries found for this date."
              : "No schedule entries found."}
          </p>
        ) : (
          <div className="space-y-8">
            {byDate.map(({ date, weekday, isToday, entries, screenTime }) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                      isToday
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase">
                      {weekday.slice(0, 3)}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                      {new Date(date + "T00:00:00").getDate()}
                    </span>
                  </div>
                  <div>
                    <p
                      className={`font-bold text-sm ${
                        isToday ? "text-green-600" : "text-gray-700"
                      }`}
                    >
                      {isToday ? "Today" : weekday}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {formatDate(date)}
                    </p>
                  </div>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] text-gray-400 font-semibold">
                    {entries.length} session{entries.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* PEIRA Screen-Time Summary — total class time per group vs. daily max */}
                {screenTime.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {screenTime.map((s) => (
                      <ScreenTimeMeter
                        key={s.group}
                        label={s.group}
                        usedMinutes={s.usedMinutes}
                        limit={s.limit}
                      />
                    ))}
                  </div>
                )}

               {/* Session Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entries.map((entry, idx) => {
                    const cls = scheduleColorClass(entry.class_schedule_color);
                    const accent = SESSION_ACCENTS[idx % SESSION_ACCENTS.length];

                    if (entry.custom_is_holiday) {
                      return (
                        <div
                          key={entry.name}
                          className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50 to-orange-100 p-4 pb-3 relative overflow-hidden hover:shadow-md hover:shadow-amber-100 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                              <PartyPopper size={15} />
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                                {entry.student_group}
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                                Holiday
                              </span>
                            </div>
                          </div>

                          <p className="font-bold text-amber-900 text-sm leading-snug truncate mb-2">
                            {entry.course}
                          </p>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                              <Clock size={11} /> {formatTime(entry.from_time)} —{" "}
                              {formatTime(entry.to_time)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-amber-700">
                              <User size={11} />{" "}
                              {entry.instructor_name || entry.instructor}
                            </div>
                            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-lg px-3 py-2">
                              <CalendarDays size={14} className="text-amber-600 flex-shrink-0" />
                              <span className="text-sm font-extrabold text-amber-800 truncate">
                                {entry.custom_holiday_name || "Holiday"}
                              </span>
                            </div>
                            {entry.room && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                                <MapPin size={11} /> {entry.room}
                              </div>
                            )}
                          </div>

                          <div className="mt-3 -mx-4 -mb-3 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={entry.name}
                        className={`rounded-xl border ${cls.border} ${cls.bg} p-4 pb-3 relative overflow-hidden hover:shadow-sm transition-all`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                            style={{ backgroundColor: accent }}
                          >
                            <BookOpen size={15} />
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cls.badge}`}
                          >
                            {entry.student_group}
                          </span>
                        </div>

                        <p className="font-bold text-gray-800 text-sm leading-snug mb-2">
                          {entry.course}
                        </p>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                            <Clock size={11} /> {formatTime(entry.from_time)} —{" "}
                            {formatTime(entry.to_time)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <User size={11} />{" "}
                            {entry.instructor_name || entry.instructor}
                          </div>
                          {entry.room && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <MapPin size={11} /> {entry.room}
                            </div>
                          )}
                        </div>

                        <div
                          className="mt-3 -mx-4 -mb-3 h-1"
                          style={{ backgroundColor: accent }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;