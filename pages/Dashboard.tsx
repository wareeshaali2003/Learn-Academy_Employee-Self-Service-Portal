import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Umbrella, UserCheck, Building2, Fingerprint,
  CalendarDays, ExternalLink, ChevronRight, Inbox,
  Bell, CheckSquare, Users, Phone, Mail,
  Trash2, Plus, RefreshCw, Clock, CheckCircle2, Circle,
  Minus, XCircle,
} from "lucide-react";

import { useAttendance } from "../hooks/useAttendance";
import { useLeave } from "../hooks/useLeave";
import { useDashboard } from "../hooks/useDashboard";
import { AttendanceRegularizationModal } from "../components/AttendanceRegularizationModal";
import type { AttendanceRecord } from "../hooks/useAttendance";
import type { LeaveBalance } from "../types";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 SINGLE SOURCE OF TRUTH — status colors (SAME as AttendancePage)
// ═══════════════════════════════════════════════════════════════════════════
const STATUS_COLORS = {
  present: {
    accent: "#10b981",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    label: "#15803d",
    number: "#14532d",
  },
  late: {
    accent: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
    label: "#b45309",
    number: "#78350f",
  },
  halfDay: {
    accent: "#0ea5e9",
    bg: "#f0f9ff",
    border: "#bae6fd",
    label: "#0369a1",
    number: "#0c4a6e",
  },
  absent: {
    accent: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
    label: "#b91c1c",
    number: "#7f1d1d",
  },
} as const;

type StatusKey = keyof typeof STATUS_COLORS;

// ─────────────────────────────────────────────
// API HELPERS (unchanged)
// ─────────────────────────────────────────────
function getAuthHeader(): Record<string, string> {
  const t = localStorage.getItem("erpnext_auth_token");
  return t ? { Authorization: t.startsWith("token ") ? t : `token ${t}` } : {};
}
function getCsrf(): Record<string, string> {
  if (localStorage.getItem("erpnext_auth_token")) return {};
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? { "X-Frappe-CSRF-Token": decodeURIComponent(m[1]) } : {};
}
const _isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const _RES = _isLocal ? "/api/resource" : "https://learnschool.online/api/resource";

async function erpFetch<T>(doctype: string, fields: string[], filters?: any[], limit = 50): Promise<T[]> {
  const url = new URL(`${_RES}/${encodeURIComponent(doctype)}`, window.location.origin);
  url.searchParams.set("fields", JSON.stringify(fields));
  url.searchParams.set("limit_page_length", String(limit));
  if (filters?.length) url.searchParams.set("filters", JSON.stringify(filters));
  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { Accept: "application/json", ...getAuthHeader() },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const j = await res.json();
  return Array.isArray(j.data) ? j.data : [];
}

function fmtDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
}

// ─────────────────────────────────────────────
// ATTENDANCE HELPERS — UPDATED to include Half Day
// ─────────────────────────────────────────────
function normStatus(raw: string): StatusKey | "other" {
  const s = (raw || "").toLowerCase();
  if (s.includes("half")) return "halfDay";
  if (s.includes("present")) return "present";
  if (s.includes("absent")) return "absent";
  if (s.includes("late")) return "late";
  return "other";
}

function canRegularize(statusRaw: string) {
  const s = normStatus(statusRaw);
  return s === "late" || s === "absent";
}

// ─────────────────────────────────────────────
// STATUS PILL — same design as AttendancePage
// ─────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const s = (status || "").toLowerCase();

  const base =
    "inline-flex items-center gap-1.5 justify-center min-w-[100px] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border";

  if (s.includes("present")) {
    const t = STATUS_COLORS.present;
    return (
      <span className={base} style={{ background: t.bg, color: t.label, borderColor: t.border }}>
        <CheckCircle2 size={11} strokeWidth={2.5} /> Present
      </span>
    );
  }
  if (s.includes("late")) {
    const t = STATUS_COLORS.late;
    return (
      <span className={base} style={{ background: t.bg, color: t.label, borderColor: t.border }}>
        <Clock size={11} strokeWidth={2.5} /> Late
      </span>
    );
  }
  if (s.includes("half")) {
    const t = STATUS_COLORS.halfDay;
    return (
      <span className={base} style={{ background: t.bg, color: t.label, borderColor: t.border }}>
        <Minus size={11} strokeWidth={3} /> Half Day
      </span>
    );
  }
  if (s.includes("absent")) {
    const t = STATUS_COLORS.absent;
    return (
      <span className={base} style={{ background: t.bg, color: t.label, borderColor: t.border }}>
        <XCircle size={11} strokeWidth={2.5} /> Absent
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

// ─────────────────────────────────────────────
// TYPES (unchanged)
// ─────────────────────────────────────────────
type CalEvent  = { name: string; subject: string; starts_on: string; ends_on?: string; color?: string; event_type?: string };
type ErpNotif  = { name: string; subject: string; document_type?: string; document_name?: string; creation?: string; read?: number };
type TodoItem  = { name: string; description: string; status: string; priority?: string; date?: string };
type Contact   = { name: string; first_name?: string; last_name?: string; full_name?: string; mobile_no?: string; email_id?: string; company_name?: string };

// ─────────────────────────────────────────────
// HOOKS (unchanged)
// ─────────────────────────────────────────────
function useCalendarEvents() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today  = new Date().toISOString().slice(0, 10);
      const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const list = await erpFetch<CalEvent>("Event",
        ["name", "subject", "starts_on", "ends_on", "color", "event_type"],
        [["starts_on", ">=", today], ["starts_on", "<=", future]], 20
      );
      setEvents(list.sort((a, b) => a.starts_on.localeCompare(b.starts_on)));
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { events, loading, refetch: load };
}

function useNotifications() {
  const [notifs, setNotifs] = useState<ErpNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await erpFetch<ErpNotif>("Notification Log",
        ["name", "subject", "document_type", "document_name", "creation", "read"], [], 15
      );
      setNotifs(list);
    } catch { setNotifs([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const unreadCount = notifs.filter((n) => !n.read).length;
  return { notifs, loading, unreadCount, refetch: load };
}

function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    erpFetch<TodoItem>("ToDo",
      ["name", "description", "status", "priority", "date"],
      [["status", "!=", "Cancelled"]], 30
    )
      .then((list) => setTodos(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (todo: TodoItem) => {
    const next = todo.status === "Closed" ? "Open" : "Closed";
    setTodos((p) => p.map((t) => t.name === todo.name ? { ...t, status: next } : t));
    try {
      await fetch(`${_RES}/ToDo/${encodeURIComponent(todo.name)}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeader(), ...getCsrf() },
        body: JSON.stringify({ status: next }),
      });
    } catch {
      setTodos((p) => p.map((t) => t.name === todo.name ? { ...t, status: todo.status } : t));
    }
  };

  const addTodo = async () => {
    if (!newText.trim() || adding) return;
    const savedText = newText.trim();
    const tempId = `temp-${Date.now()}`;
    const newItem: TodoItem = { name: tempId, description: savedText, status: "Open", priority: "Medium" };

    setTodos((p) => [newItem, ...p]);
    setNewText("");
    setAdding(true);

    try {
      const res = await fetch(`${_RES}/ToDo`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeader(), ...getCsrf() },
        body: JSON.stringify({ description: savedText, status: "Open", priority: "Medium" }),
      });
      const json = await res.json().catch(() => ({}));
      const realName = json?.data?.name;
      if (realName) {
        setTodos((p) => p.map((t) => t.name === tempId ? { ...t, name: realName } : t));
      }
    } catch {
      setTodos((p) => p.filter((t) => t.name !== tempId));
    } finally {
      setAdding(false);
    }
  };

  const deleteTodo = async (name: string) => {
    setTodos((p) => p.filter((t) => t.name !== name));
    try {
      await fetch(`${_RES}/ToDo/${encodeURIComponent(name)}`, {
        method: "DELETE", credentials: "include",
        headers: { Accept: "application/json", ...getAuthHeader(), ...getCsrf() },
      });
    } catch { /* silent */ }
  };

  return { todos, loading, toggle, addTodo, deleteTodo, newText, setNewText, adding };
}

function useContacts() {
  const [all, setAll] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await erpFetch<Contact>("Contact",
        ["name", "first_name", "last_name", "full_name", "mobile_no", "email_id", "company_name"], [], 40
      );
      setAll(list);
    } catch { setAll([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const contacts = useMemo(() =>
    all.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.full_name || `${c.first_name} ${c.last_name}`).toLowerCase().includes(q)
        || (c.company_name || "").toLowerCase().includes(q)
        || (c.email_id || "").toLowerCase().includes(q);
    }), [all, search]);
  return { contacts, loading, search, setSearch, refetch: load, total: all.length };
}

// ─────────────────────────────────────────────
// STAT CARD (unchanged, still uses light border + colored bar)
// ─────────────────────────────────────────────
const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode;
  footer: string; iconBg: string; barColor: string; borderColor: string;
}> = ({ title, value, icon, footer, iconBg, barColor, borderColor }) => (
  <div className={`relative bg-white p-5 rounded-2xl shadow-sm border ${borderColor} overflow-hidden group hover:-translate-y-1 hover:shadow-md transition-all`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-800 leading-none mt-1">{value ?? "N/A"}</p>
        <p className="text-xs text-gray-400 mt-2">{footer}</p>
      </div>
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
    <div className={`absolute bottom-0 left-0 h-1 w-3/4 ${barColor} rounded-full opacity-80`} />
  </div>
);

// ─────────────────────────────────────────────
// ATTENDANCE TABLE — UPDATED with new StatusPill
// ─────────────────────────────────────────────
const AttendanceTable: React.FC = () => {
  const navigate = useNavigate();
  const { records, loading, error, stats, regularize } = useAttendance();
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const monthLabel = stats?.monthLabel || "This Month";

  const handleModalSubmit = async (data: any) => {
    const result = await regularize(data);
    if (result.success) { alert(`Request submitted for ${data.date}.`); setSelectedRecord(null); }
    else { alert(result.error || "Failed to submit request."); }
  };

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center gap-3 text-gray-400 text-sm font-medium">
      <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
      Loading biometric logs…
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center"><Fingerprint size={18} className="text-green-600" /></div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Biometric History</p>
              <p className="text-[11px] text-gray-400">Records for {monthLabel}</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/attendance")}
            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-green-600 transition-colors">
            View All <ChevronRight size={13} />
          </button>
        </div>
        {error && <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-green-50 text-green-700 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">In</th>
                <th className="px-6 py-3.5">Out</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 ? (
                <tr><td colSpan={5} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <Fingerprint size={28} className="opacity-30" />
                    <p className="text-sm font-semibold text-gray-400">No biometric records</p>
                  </div>
                </td></tr>
              ) : records.slice(0, 8).map((record) => (
                <tr key={record.id} className="hover:bg-green-50/20 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-semibold text-gray-800">{record.date || "N/A"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500 font-medium">{record.inTime || "—"}</td>
                  <td className="px-6 py-3.5 text-sm text-gray-500 font-medium">{record.outTime || "—"}</td>
                  <td className="px-6 py-3.5">
                    <StatusPill status={record.status} />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {canRegularize(record.status) ? (
                      <button type="button" onClick={() => setSelectedRecord(record)}
                        className="text-[10px] font-bold text-green-600 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-500 hover:text-white hover:border-green-500 transition-all inline-flex items-center gap-1.5">
                        <ExternalLink size={11} /> Regularize
                      </button>
                    ) : <span className="text-gray-300 text-[10px] italic">No Action</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AttendanceRegularizationModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onSubmit={handleModalSubmit} />
    </>
  );
};

// ─────────────────────────────────────────────
// CALENDAR WIDGET (unchanged)
// ─────────────────────────────────────────────
const EVENT_COLOR: Record<string, string> = {
  red:    "bg-red-100 text-red-700 border-red-200",
  blue:   "bg-blue-100 text-blue-700 border-blue-200",
  green:  "bg-green-100 text-green-700 border-green-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
};
function evColorClass(c?: string) { return EVENT_COLOR[(c || "").toLowerCase()] || "bg-green-100 text-green-700 border-green-200"; }

const CalendarWidget: React.FC = () => {
  const { events, loading, refetch } = useCalendarEvents();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center"><CalendarDays size={18} className="text-green-600" /></div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Upcoming Events</p>
            <p className="text-[11px] text-gray-400">Next 30 days · {events.length} events</p>
          </div>
        </div>
        <button type="button" onClick={refetch} className="p-1.5 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition-colors"><RefreshCw size={13} /></button>
      </div>
      <div className="overflow-y-auto max-h-72">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-300 text-xs">
            <div className="w-4 h-4 rounded-full border-2 border-green-300 border-t-transparent animate-spin" /> Loading…
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CalendarDays size={30} className="text-gray-200 mb-2" />
            <p className="text-xs font-bold text-gray-400">No upcoming events</p>
            <p className="text-[11px] text-gray-300 mt-1">Clear schedule for next 30 days</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((ev) => {
              const isToday = ev.starts_on?.slice(0, 10) === today;
              const evDate  = new Date(ev.starts_on);
              return (
                <div key={ev.name} className={`px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 transition-colors ${isToday ? "bg-green-50/40" : ""}`}>
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isToday ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                    <span className="text-[8px] font-bold uppercase leading-none">{evDate.toLocaleDateString("en-US", { month: "short" })}</span>
                    <span className="text-sm font-black leading-tight">{evDate.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-xs truncate">{ev.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={9} />{ev.starts_on?.slice(11, 16) || "All day"}
                      </span>
                      {isToday && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">TODAY</span>}
                    </div>
                    {ev.event_type && (
                      <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${evColorClass(ev.color)}`}>{ev.event_type}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TODO WIDGET (unchanged)
// ─────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  High:   "text-red-500 bg-red-50 border-red-200",
  Medium: "text-amber-500 bg-amber-50 border-amber-200",
  Low:    "text-green-500 bg-green-50 border-green-200",
};

const TodoWidget: React.FC = () => {
  const { todos, loading, toggle, addTodo, deleteTodo, newText, setNewText, adding } = useTodos();
  const open   = todos.filter((t) => t.status !== "Closed");
  const closed = todos.filter((t) => t.status === "Closed");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center"><CheckSquare size={18} className="text-purple-600" /></div>
          <div>
            <p className="font-bold text-gray-800 text-sm">To-Do</p>
            <p className="text-[11px] text-gray-400">{open.length} open · {closed.length} done</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-50 flex gap-2">
        <input
          type="text"
          placeholder="Add a task… (Enter to save)"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 font-medium"
        />
        <button type="button" onClick={addTodo} disabled={adding || !newText.trim()}
          className="px-3 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold disabled:opacity-40 transition-colors flex items-center gap-1">
          {adding
            ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            : <Plus size={13} />}
        </button>
      </div>

      <div className="overflow-y-auto max-h-64">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-300 text-xs">
            <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-transparent animate-spin" /> Loading…
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare size={28} className="text-gray-200 mb-2" />
            <p className="text-xs font-bold text-gray-400">No tasks yet</p>
            <p className="text-[11px] text-gray-300 mt-1">Add your first task above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...open, ...closed].map((todo) => {
              const done = todo.status === "Closed";
              return (
                <div key={todo.name} className={`px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 transition-colors group ${done ? "opacity-50" : ""}`}>
                  <button type="button" onClick={() => toggle(todo)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-purple-500 transition-colors">
                    {done ? <CheckCircle2 size={16} className="text-purple-400" /> : <Circle size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${done ? "line-through text-gray-400" : "text-gray-800"}`}>{todo.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {todo.priority && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_COLOR[todo.priority] || "text-gray-500 bg-gray-50 border-gray-200"}`}>
                          {todo.priority}
                        </span>
                      )}
                      {todo.date && <span className="text-[10px] text-gray-300">{fmtDate(todo.date)}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => deleteTodo(todo.name)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// CONTACTS WIDGET (unchanged)
// ─────────────────────────────────────────────
const AVATAR_COLORS = ["bg-green-500","bg-blue-500","bg-purple-500","bg-amber-500","bg-pink-500","bg-cyan-500","bg-green-500","bg-indigo-500"];
function avatarBg(n: string) { let h = 0; for (const c of n) h = c.charCodeAt(0) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }
function displayName(c: Contact) { return c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.name; }
function initials(c: Contact)    { return displayName(c).slice(0, 2).toUpperCase(); }

const ContactsWidget: React.FC = () => {
  const { contacts, loading, search, setSearch, refetch, total } = useContacts();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Users size={18} className="text-blue-600" /></div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Contacts</p>
            <p className="text-[11px] text-gray-400">{total} total</p>
          </div>
        </div>
        <button type="button" onClick={refetch} className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"><RefreshCw size={13} /></button>
      </div>

      <div className="px-4 py-2.5 border-b border-gray-50">
        <input type="text" placeholder="Search by name, company, email…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-medium"
        />
      </div>

      <div className="overflow-y-auto max-h-64">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-300 text-xs">
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-transparent animate-spin" /> Loading…
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users size={28} className="text-gray-200 mb-2" />
            <p className="text-xs font-bold text-gray-400">{search ? "No contacts match" : "No contacts yet"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {contacts.map((c) => (
              <div key={c.name} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/60 transition-colors">
                <div className={`w-9 h-9 rounded-full ${avatarBg(c.name)} text-white flex items-center justify-center text-[11px] font-bold uppercase flex-shrink-0`}>
                  {initials(c)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-xs truncate">{displayName(c)}</p>
                  {c.company_name && <p className="text-[10px] text-gray-400 truncate">{c.company_name}</p>}
                  <div className="flex flex-wrap gap-x-3 mt-0.5">
                    {c.mobile_no && (
                      <a href={`tel:${c.mobile_no}`} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">
                        <Phone size={8} className="inline" /> {c.mobile_no}
                      </a>
                    )}
                    {c.email_id && (
                      <a href={`mailto:${c.email_id}`} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 truncate">
                        <Mail size={8} className="inline" /> {c.email_id}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { data: dashData, loading: dashLoading } = useDashboard();
  const { balances, leaves, loading: leaveLoading, error: leaveError } = useLeave();

  const casualLeave = useMemo(() => {
    const list = Array.isArray(balances) ? (balances as LeaveBalance[]) : [];
    return list.find((b) => (b.type || "").toLowerCase().includes("casual"));
  }, [balances]);

  const todayStatus = dashLoading ? "..."
    : dashData?.last_log_type === "IN"  ? "Checked In"
    : dashData?.last_log_type === "OUT" ? "Checked Out"
    : "N/A";

  const statCards = [
    {
      title: "Status Today",
      value: todayStatus,
      icon: <UserCheck size={20} className="text-green-600" />,
      footer: dashData?.last_log_time ? `Last: ${dashData.last_log_time}` : "No log today",
      iconBg: "bg-green-50", barColor: "bg-green-500", borderColor: "border-green-100",
    },
    {
      title: "Company",
      value: dashLoading ? "..." : (dashData?.company || "N/A"),
      icon: <Building2 size={20} className="text-green-600" />,
      footer: dashData?.employee_name || "",
      iconBg: "bg-green-50", barColor: "bg-green-500", borderColor: "border-green-100",
    },
    {
      title: "Leave Applications",
      value: leaveLoading ? "..." : (Array.isArray(leaves) ? leaves.length : 0),
      icon: <CalendarDays size={20} className="text-green-600" />,
      footer: "Total applications submitted",
      iconBg: "bg-green-50", barColor: "bg-green-500", borderColor: "border-green-100",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((s) => <StatCard key={s.title} {...s} />)}
      </div>

      {/* Row 2: To-Do + Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoWidget />
        <ContactsWidget />
      </div>

      {/* Row 3: Biometric History + Notice Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><AttendanceTable /></div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center"><CalendarDays size={18} className="text-green-600" /></div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Notice Board</p>
              <p className="text-[11px] text-gray-400">Latest announcements</p>
            </div>
          </div>
          <div className="flex-grow p-4 space-y-3 overflow-y-auto">
            {dashData?.notice_board?.length ? (
              dashData.notice_board.map((notice: any, i: number) => (
                <div key={i} className="p-3.5 bg-green-50/50 border border-green-100 rounded-xl">
                  <p className="font-semibold text-gray-800 text-xs mb-1">{notice.title || `Notice ${i + 1}`}</p>
                  <p className="text-xs text-gray-500">{notice.message || JSON.stringify(notice)}</p>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3"><Inbox size={22} className="text-gray-300" /></div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Notices</p>
                <p className="text-xs text-gray-300 mt-1">All clear for now</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};