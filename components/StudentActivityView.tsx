// components/StudentActivityView.tsx
// Shared UI: student list (search + select) + login/logout session table.
// Used by both the CEO/Admin page and the Teacher/Faculty page — only the
// student list source differs between the two.
//
// NEW: "Daily Activity" panel — pick a date to see that day's total time
// spent, plus a bar chart of daily time-spent (login/logout duration) over
// the recent days, and a "daily average" stat computed across the days
// present in the fetched sessions.

import React, { useEffect, useMemo, useState } from "react";
import {
  Search, LogIn, LogOut, Timer, History, RefreshCw, Radio, AlertTriangle, Users,
  Calendar, BarChart3, X,
} from "lucide-react";
import { api } from "../services/api";
import { useStudentActivityLog, formatDuration, LoginSession, SessionStatus } from "../hooks/useStudentActivityLog";
import { Skeleton, avatarColor } from "./Shared";

export interface StudentPickerEntry {
  id: string;           // Student doctype name (e.g. STU-0001)
  name: string;          // Display name
  email?: string;        // student_email_id, when already known
  meta?: string;         // e.g. class/group/batch, shown as a small tag
}

interface Props {
  students: StudentPickerEntry[];
  loadingStudents: boolean;
  errorStudents?: string | null;
  emptyStudentsLabel?: string; // shown when the resolved list is empty (e.g. "Select a group first")
}

function StatCard({
  icon, iconClass, label, value,
}: { icon: React.ReactNode; iconClass: string; label: string; value: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${iconClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-extrabold text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  switch (status) {
    case "Active":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full whitespace-nowrap">
          <Radio size={12} className="animate-pulse" /> Active now
        </span>
      );
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full whitespace-nowrap">
          Completed
        </span>
      );
    case "No logout recorded":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full whitespace-nowrap">
          <AlertTriangle size={12} /> No logout recorded
        </span>
      );
    case "Orphan logout":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap">
          <AlertTriangle size={12} /> Login not found
        </span>
      );
  }
}

function SessionRow({ session }: { session: LoginSession }) {
  const dateSource = session.loginTime || session.logoutTime;
  return (
    <tr className="hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {dateSource ? dateSource.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {session.loginTime ? session.loginTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {session.logoutTime ? session.logoutTime.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
        {formatDuration(session.durationMs)}
      </td>
      <td className="px-4 py-3"><StatusBadge status={session.status} /></td>
    </tr>
  );
}

// ── Daily aggregation helpers ────────────────────────────────────────────

/** yyyy-mm-dd key in local time (avoids UTC day-shift from toISOString). */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DailyTotal {
  dateKey: string;   // yyyy-mm-dd
  totalMs: number;
  sessionCount: number;
}

/** Sum durationMs per calendar day, keyed off login time (fallback logout time). */
function buildDailyTotals(sessions: LoginSession[]): DailyTotal[] {
  const map = new Map<string, DailyTotal>();
  for (const s of sessions) {
    const d = s.loginTime || s.logoutTime;
    if (!d || !s.durationMs) continue;
    const key = toLocalDateKey(d);
    const existing = map.get(key);
    if (existing) {
      existing.totalMs += s.durationMs;
      existing.sessionCount += 1;
    } else {
      map.set(key, { dateKey: key, totalMs: s.durationMs, sessionCount: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

// ── Daily activity bar chart (no external chart lib — plain SVG/CSS) ────

const CHART_HEIGHT = 120;
const CHART_MAX_DAYS = 14;

function DailyActivityChart({
  data, selectedDateKey, onSelectDate,
}: { data: DailyTotal[]; selectedDateKey: string; onSelectDate: (key: string) => void }) {
  const recent = data.slice(-CHART_MAX_DAYS);
  const maxMs = Math.max(1, ...recent.map((d) => d.totalMs));

  if (recent.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">
        No daily activity to chart yet.
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 px-2 pt-6" style={{ height: CHART_HEIGHT + 40 }}>
      {recent.map((d) => {
        const barPx = Math.max(4, Math.round((d.totalMs / maxMs) * CHART_HEIGHT));
        const isSelected = d.dateKey === selectedDateKey;
        return (
          <button
            key={d.dateKey}
            onClick={() => onSelectDate(isSelected ? "" : d.dateKey)}
            className="flex-1 flex flex-col items-center gap-1.5 group min-w-0"
            title={`${formatDayLabel(d.dateKey)}: ${formatDuration(d.totalMs)}`}
          >
            <span
              className={`text-[10px] font-semibold whitespace-nowrap transition-opacity ${
                isSelected ? "opacity-100 text-indigo-600" : "opacity-0 group-hover:opacity-100 text-gray-500"
              }`}
            >
              {formatDuration(d.totalMs)}
            </span>
            <div
              className={`w-full max-w-[28px] rounded-t-md transition-colors ${
                isSelected ? "bg-indigo-600" : "bg-indigo-300 group-hover:bg-indigo-400"
              }`}
              style={{ height: barPx }}
            />
            <span className={`text-[10px] whitespace-nowrap ${isSelected ? "font-bold text-indigo-600" : "text-gray-400"}`}>
              {formatDayLabel(d.dateKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const StudentActivityView: React.FC<Props> = ({
  students, loadingStudents, errorStudents, emptyStudentsLabel,
}) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentPickerEntry | null>(null);
  const [resolvedEmail, setResolvedEmail] = useState<string | undefined>(undefined);
  const [resolvingEmail, setResolvingEmail] = useState(false);

  // Date filter for the "Daily Activity" panel — "" means "show everything".
  const [dateFilter, setDateFilter] = useState<string>("");

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.id.toLowerCase().includes(search.toLowerCase())
      ),
    [students, search]
  );

  // Group students often don't carry an email — resolve it from Student doctype
  // the moment a student without one is selected.
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!selected) { setResolvedEmail(undefined); return; }
      if (selected.email) { setResolvedEmail(selected.email); return; }
      setResolvingEmail(true);
      try {
        const res = await api.getStudentDetail(selected.id);
        if (!cancelled) setResolvedEmail(res.ok ? (res.data as any)?.student_email_id : undefined);
      } finally {
        if (!cancelled) setResolvingEmail(false);
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, [selected]);

  // Reset the date filter whenever the selected student changes.
  useEffect(() => { setDateFilter(""); }, [selected?.id]);

  const {
    sessions, isLoading, error, isCurrentlyOnline,
    lastLogin, lastLogout, totalSessionsCount, totalTimeTodayMs, averageSessionMs, refetch,
  } = useStudentActivityLog(resolvedEmail);

  // ── Daily aggregation (derived client-side from whatever `sessions` the
  //    hook returns — if you need a wider history window, extend
  //    useStudentActivityLog to accept a date range). ──────────────────
  const dailyTotals = useMemo(() => buildDailyTotals(sessions), [sessions]);

  const dailyAverageMs = useMemo(() => {
    if (dailyTotals.length === 0) return 0;
    const sum = dailyTotals.reduce((acc, d) => acc + d.totalMs, 0);
    return Math.round(sum / dailyTotals.length);
  }, [dailyTotals]);

  const selectedDayTotal = useMemo(
    () => (dateFilter ? dailyTotals.find((d) => d.dateKey === dateFilter) : undefined),
    [dailyTotals, dateFilter]
  );

  const visibleSessions = useMemo(
    () => (dateFilter ? sessions.filter((s) => {
      const d = s.loginTime || s.logoutTime;
      return d ? toLocalDateKey(d) === dateFilter : false;
    }) : sessions),
    [sessions, dateFilter]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      {/* ── Student picker ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[640px]">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loadingStudents ? (
            <div className="p-4"><Skeleton rows={6} /></div>
          ) : errorStudents ? (
            <p className="text-sm text-red-500 p-4">⚠ {errorStudents}</p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <Users size={22} className="mx-auto mb-2 opacity-40" />
              {emptyStudentsLabel || "No students found."}
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors ${
                  selected?.id === s.id ? "bg-indigo-50" : "hover:bg-gray-50"
                }`}
              >
                <div className={`w-8 h-8 rounded-full ${avatarColor(s.name)} text-white flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0`}>
                  {s.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{s.meta || s.id}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Activity detail ── */}
      <div className="space-y-5">
        {!selected ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-sm text-gray-400">
            Select a student to view their login activity.
          </div>
        ) : resolvingEmail ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex justify-center">
            <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !resolvedEmail ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-amber-600">
            ⚠ Student email not found. Unable to fetch login activity.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selected.name}</h3>
                <p className="text-xs text-gray-400">{resolvedEmail}</p>
              </div>
              <button
                onClick={refetch}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<Radio size={16} className="text-green-600" />} iconClass="bg-green-50" label="Status" value={isCurrentlyOnline ? "Online" : "Offline"} />
              <StatCard icon={<Timer size={16} className="text-indigo-600" />} iconClass="bg-indigo-50" label="Logged In Today" value={formatDuration(totalTimeTodayMs)} />
              <StatCard icon={<BarChart3 size={16} className="text-purple-600" />} iconClass="bg-purple-50" label="Daily Average" value={formatDuration(dailyAverageMs)} />
              <StatCard icon={<History size={16} className="text-amber-600" />} iconClass="bg-amber-50" label="Avg. Session" value={formatDuration(averageSessionMs)} />
            </div>

            {lastLogin && (
              <p className="text-xs text-gray-500">
                Last login: <span className="font-medium text-gray-700">{lastLogin.toLocaleString()}</span>
                {lastLogout && (
                  <> · Last logout: <span className="font-medium text-gray-700">{lastLogout.toLocaleString()}</span></>
                )}
              </p>
            )}

            {/* ── Daily Activity: date picker + chart ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Calendar size={16} className="text-indigo-500" /> Daily Activity
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFilter}
                    max={toLocalDateKey(new Date())}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter("")}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X size={12} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="py-8"><Skeleton rows={3} /></div>
              ) : (
                <>
                  {dateFilter && (
                    <div className="flex items-center gap-4 bg-indigo-50/60 rounded-xl px-4 py-3">
                      <p className="text-sm text-gray-700">
                        Time spent on <span className="font-semibold">{formatDayLabel(dateFilter)}</span>:{" "}
                        <span className="font-bold text-indigo-700">
                          {formatDuration(selectedDayTotal?.totalMs || 0)}
                        </span>
                      </p>
                      {!selectedDayTotal && (
                        <span className="text-xs text-gray-400">No activity recorded on this date.</span>
                      )}
                    </div>
                  )}
                  <DailyActivityChart
                    data={dailyTotals}
                    selectedDateKey={dateFilter}
                    onSelectDate={setDateFilter}
                  />
                  <p className="text-[11px] text-gray-400 text-center">
                    Tap a bar to filter the sessions table below to that date.
                  </p>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-8"><Skeleton rows={5} /></div>
              ) : error ? (
                <p className="text-sm text-red-500 bg-red-50 px-6 py-3">⚠ {error}</p>
              ) : visibleSessions.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-400">
                  {dateFilter ? "No sessions on this date." : "Student Login activit not found."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3"><span className="inline-flex items-center gap-1"><LogIn size={12} /> Login</span></th>
                        <th className="px-4 py-3"><span className="inline-flex items-center gap-1"><LogOut size={12} /> Logout</span></th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {visibleSessions.map((s) => <SessionRow key={s.key} session={s} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentActivityView;