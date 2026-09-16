// pages/FacultyPage.tsx — URL-based navigation ka principle baaki page pe qaim hai;
// sirf is "expandable stat card" interaction ke liye local UI state use kiya hai
// (koi data-fetching state nahi, sirf yeh track karta hai konsa card bara hua hai).

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, GraduationCap, Calendar, Users,
  ClipboardCheck, Clock, MapPin, CheckCircle2, AlertCircle, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useQuickStats, useTodaySchedule, useAttendanceTrends, useStudentGroups } from "../hooks/useFaculty";

type StatKey = "courses" | "students" | "groups" | "attendance";

// Har stat card ka apna distinct color — sab ek jaisay green blob nahi
const STAT_META: Record<StatKey, {
  icon: React.ReactNode; iconBg: string; bar: string; chartColor: string; subtitle: string;
}> = {
  courses:    { icon: <GraduationCap size={20} />, iconBg: "bg-indigo-500",  bar: "bg-indigo-400",  chartColor: "#6366f1", subtitle: "Sessions scheduled today" },
  students:   { icon: <Users size={20} />,          iconBg: "bg-rose-500",    bar: "bg-rose-400",    chartColor: "#f43f5e", subtitle: "Active students per group" },
  groups:     { icon: <BookOpen size={20} />,        iconBg: "bg-amber-500",  bar: "bg-amber-400",   chartColor: "#f59e0b", subtitle: "This month's attendance, per group" },
  attendance: { icon: <ClipboardCheck size={20} />,  iconBg: "bg-emerald-500",bar: "bg-emerald-400", chartColor: "#10b981", subtitle: "Last 7 days, across all your classes" },
};

// Har course/subject ko consistent color chip dene ke liye chota hash
const COURSE_PALETTE = [
  { bg: "bg-indigo-100", text: "text-indigo-600" },
  { bg: "bg-rose-100",   text: "text-rose-600" },
  { bg: "bg-amber-100",  text: "text-amber-600" },
  { bg: "bg-teal-100",   text: "text-teal-600" },
  { bg: "bg-violet-100", text: "text-violet-600" },
  { bg: "bg-sky-100",    text: "text-sky-600" },
];
const colorForCourse = (name: string) => {
  const sum = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COURSE_PALETTE[sum % COURSE_PALETTE.length];
};

// Attendance % ke liye performance-based color — hara achi, amber theek, red kam
const barColorFor = (pct: number) => {
  if (pct >= 75) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#f43f5e";
};

const PercentTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-md rounded-xl px-3 py-2 text-xs">
      <p className="font-bold text-gray-700 mb-0.5">{label}</p>
      <p className="font-semibold" style={{ color: barColorFor(payload[0].value) }}>{payload[0].value}%</p>
    </div>
  );
};

const CountTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-md rounded-xl px-3 py-2 text-xs">
      <p className="font-bold text-gray-700 mb-0.5">{label}</p>
      <p className="font-semibold text-gray-600">{payload[0].value} {unit}</p>
    </div>
  );
};

export const FacultyPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCourses, totalStudents, avgAttendance, studentGroups } = useQuickStats();
  const { classes, loading: scheduleLoading } = useTodaySchedule();
  const { dailyTrend, groupBreakdown, loading: trendsLoading } = useAttendanceTrends();
  const { groups, loading: groupsLoading } = useStudentGroups();

  // Konsa stat card bara hua hai — default attendance, taake load hote hi ek graph dikhe
  const [selectedStat, setSelectedStat] = useState<StatKey>("attendance");

  const statCards: { key: StatKey; label: string; value: React.ReactNode; path: string }[] = [
    { key: "courses",    label: "Active Courses",               value: activeCourses !== null ? activeCourses : "—",  path: "/faculty/programs" },
    { key: "students",   label: "Total Students",                value: totalStudents !== null ? totalStudents : "—",  path: "/faculty/students" },
    { key: "groups",     label: "Student Groups",                value: studentGroups !== null ? studentGroups : "—",  path: "/faculty/students" },
    { key: "attendance", label: "Avg. Attendance (This Month)",  value: avgAttendance,                                  path: "/faculty/attendance" },
  ];

  const selectedCard = statCards.find((s) => s.key === selectedStat)!;
  const otherCards = statCards.filter((s) => s.key !== selectedStat);

  // Sessions today, course-wise — Active Courses card ke expanded view ke liye
  const sessionsByCourse = useMemo(() => {
    const byCourse = new Map<string, number>();
    classes.forEach((c) => byCourse.set(c.course, (byCourse.get(c.course) ?? 0) + 1));
    return Array.from(byCourse.entries()).map(([course, count]) => ({ course, count }));
  }, [classes]);

  // Active students, group-wise — Total Students card ke expanded view ke liye
  const studentsByGroup = useMemo(
    () =>
      groups.map((g) => ({
        group: g.student_group_name || g.name,
        count: g.activeCount ?? g.totalCount ?? 0,
      })),
    [groups]
  );

  const pendingCount = classes.filter((c) => !c.attendanceMarked).length;

  const renderExpandedChart = () => {
    const isLoading =
      (selectedStat === "attendance" || selectedStat === "groups") ? trendsLoading :
      selectedStat === "students" ? groupsLoading :
      scheduleLoading;

    if (isLoading) {
      return <div className="h-56 flex items-center justify-center text-sm text-gray-400">Loading chart…</div>;
    }

    if (selectedStat === "attendance") {
      if (dailyTrend.every((d) => d.percentage === 0)) {
        return (
          <div className="h-56 flex flex-col items-center justify-center text-center">
            <Calendar size={26} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No attendance recorded this week yet</p>
          </div>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={dailyTrend} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<PercentTooltip />} />
            <Area type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2.5} fill="url(#attendanceFill)" dot={{ r: 4, strokeWidth: 0, fill: "#10b981" }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (selectedStat === "groups") {
      if (groupBreakdown.length === 0) {
        return (
          <div className="h-56 flex flex-col items-center justify-center text-center">
            <Users size={26} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No group attendance data yet</p>
          </div>
        );
      }
      return (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={groupBreakdown} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<PercentTooltip />} />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {groupBreakdown.map((g) => <Cell key={g.group} fill={barColorFor(g.percentage)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> 75%+</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> 50–74%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> Below 50%</span>
          </div>
        </>
      );
    }

    if (selectedStat === "students") {
      if (studentsByGroup.length === 0) {
        return (
          <div className="h-56 flex flex-col items-center justify-center text-center">
            <Users size={26} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No student group data yet</p>
          </div>
        );
      }
      return (
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={studentsByGroup} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CountTooltip unit="students" />} />
            <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // courses
    if (sessionsByCourse.length === 0) {
      return (
        <div className="h-56 flex flex-col items-center justify-center text-center">
          <GraduationCap size={26} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No sessions scheduled today</p>
        </div>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={sessionsByCourse} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="course" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CountTooltip unit="sessions" />} />
          <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-500 to-teal-500 p-8 text-white flex items-center justify-between gap-6 shadow-lg shadow-green-200">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute bottom-0 right-24 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg select-none">FP</div>
            <div>
              <h1 className="text-2xl font-black leading-tight">Teacher Dashboard</h1>
              <p className="text-green-100 text-sm font-medium">Learn Academy Teacher Portal</p>
            </div>
          </div>
          <p className="text-green-50/90 text-sm max-w-lg leading-relaxed">
            Access all your teaching tools and resources in one unified platform.
          </p>
        </div>
        <BookOpen size={72} className="relative z-10 text-white/15 hidden md:block flex-shrink-0" />
      </div>

      {/* Quick Overview — expandable stat cards */}
      <div>
        <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest mb-4">Quick Overview</h2>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Expanded card — bara, chart ke sath */}
          <div key={selectedCard.key} className="lg:w-[58%] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{selectedCard.label}</p>
                <p className="text-4xl font-black text-gray-800">{selectedCard.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center flex-shrink-0 shadow-sm ${STAT_META[selectedCard.key].iconBg}`}>
                {STAT_META[selectedCard.key].icon}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">{STAT_META[selectedCard.key].subtitle}</p>

            {renderExpandedChart()}

            <button type="button" onClick={() => navigate(selectedCard.path)}
              className="mt-3 text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
              View details <ArrowRight size={13} />
            </button>
          </div>

          {/* Baaki 3 cards — compact, click karke expand karein */}
          <div className="grid grid-cols-3 lg:grid-cols-1 lg:w-[42%] gap-4">
            {otherCards.map((s) => {
              const meta = STAT_META[s.key];
              return (
                <button key={s.key} type="button" onClick={() => setSelectedStat(s.key)}
                  className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-center justify-between overflow-hidden transition-all duration-200 group hover:shadow-md hover:-translate-y-0.5 text-left">
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-tight">{s.label}</p>
                    <p className="text-2xl sm:text-3xl font-black text-gray-800">{s.value}</p>
                  </div>
                  <div className={`hidden sm:flex w-10 h-10 rounded-xl text-white items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform ${meta.iconBg}`}>
                    {React.cloneElement(meta.icon as React.ReactElement, { size: 18 })}
                  </div>
                  <div className={`absolute bottom-0 left-0 h-1 w-3/4 rounded-full opacity-70 group-hover:opacity-100 group-hover:w-full transition-all duration-500 ${meta.bar}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest">Today's Schedule</h2>
          {pendingCount > 0 && (
            <button type="button" onClick={() => navigate("/faculty/mark")}
              className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-amber-100 transition-colors">
              <AlertCircle size={14} /> {pendingCount} pending attendance
            </button>
          )}
        </div>

        {scheduleLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            Loading today's classes…
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No classes scheduled for today</p>
            <p className="text-xs text-gray-400 mt-1">Enjoy the free slot, ya apna schedule check kar lein.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
            {classes.map((cls) => {
              const courseColor = colorForCourse(cls.course);
              return (
                <div key={cls.id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-gray-50/60 transition-colors">
                  <div className="w-16 flex-shrink-0 text-center">
                    <p className="text-sm font-black text-gray-800 leading-tight">{cls.startTime}</p>
                    <p className="text-[11px] text-gray-400">{cls.endTime}</p>
                  </div>

                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${courseColor.bg} ${courseColor.text}`}>
                    {cls.course.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{cls.course}</p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={12} /> {cls.studentGroup}</span>
                      {cls.room && <span className="flex items-center gap-1"><MapPin size={12} /> {cls.room}</span>}
                      <span className="flex items-center gap-1"><Clock size={12} /> {cls.duration}</span>
                    </div>
                  </div>

                  {cls.attendanceMarked ? (
                    <span className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1.5">
                      <CheckCircle2 size={14} /> Marked
                    </span>
                  ) : (
                    <button type="button" onClick={() => navigate(`/faculty/mark?schedule=${cls.id}`)}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-full px-3.5 py-1.5 transition-colors">
                      Mark now <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyPage;