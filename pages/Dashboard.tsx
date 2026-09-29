import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Umbrella, UserCheck, Building2, Fingerprint,
  CalendarDays, ExternalLink, ChevronRight, Inbox,
  Bell, CheckSquare, Users, Phone, Mail,
  Trash2, Plus, RefreshCw, Clock, CheckCircle2, Circle,
  Minus, XCircle, Sparkles, TrendingUp, Activity, MapPin,
  Zap, Award, Target, LayoutDashboard, Rocket,
  Waves, Droplets, Sun,
} from "lucide-react";

import { useAttendance } from "../hooks/useAttendance";
import { useLeave } from "../hooks/useLeave";
import { useDashboard } from "../hooks/useDashboard";
import { AttendanceRegularizationModal } from "../components/AttendanceRegularizationModal";
import type { AttendanceRecord } from "../hooks/useAttendance";
import type { LeaveBalance } from "../types";
import { useNavigate } from "react-router-dom";

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 GLOBAL ANIMATION KEYFRAMES
// ═══════════════════════════════════════════════════════════════════════════
const GLOBAL_STYLES = `
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
    50% { transform: translateY(-30px) translateX(20px) scale(1.05); }
  }
  @keyframes float-reverse {
    0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
    50% { transform: translateY(25px) translateX(-15px) scale(0.95); }
  }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes pulse-ring {
    0% { transform: scale(0.95); opacity: 0.7; }
    50% { transform: scale(1.05); opacity: 0.3; }
    100% { transform: scale(0.95); opacity: 0.7; }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  /* 🌊 OCEAN WAVE ANIMATIONS */
  @keyframes wave-move-1 {
    0% { transform: translateX(0) translateZ(0); }
    100% { transform: translateX(-50%) translateZ(0); }
  }
  @keyframes wave-move-2 {
    0% { transform: translateX(-50%) translateZ(0); }
    100% { transform: translateX(0) translateZ(0); }
  }
  @keyframes wave-move-3 {
    0% { transform: translateX(0) translateZ(0); }
    100% { transform: translateX(-50%) translateZ(0); }
  }
  @keyframes ocean-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  @keyframes bubble-rise {
    0% { transform: translateY(0) scale(0.8); opacity: 0; }
    20% { opacity: 0.6; }
    100% { transform: translateY(-200px) scale(1.2); opacity: 0; }
  }
  @keyframes caustic-shift {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
    50% { transform: translate(-30px, -20px) scale(1.1); opacity: 0.55; }
  }
  @keyframes sun-rays {
    0%, 100% { transform: rotate(0deg); opacity: 0.15; }
    50% { transform: rotate(8deg); opacity: 0.25; }
  }
  .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
  .animate-float-reverse { animation: float-reverse 15s ease-in-out infinite; }
  .animate-gradient-shift { background-size: 200% 200%; animation: gradient-shift 8s ease infinite; }
  .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
  .animate-spin-slow { animation: spin-slow 20s linear infinite; }
  .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
  .animate-wave-1 { animation: wave-move-1 20s linear infinite; }
  .animate-wave-2 { animation: wave-move-2 24s linear infinite; }
  .animate-wave-3 { animation: wave-move-3 32s linear infinite; }
  .animate-ocean-shift { background-size: 400% 400%; animation: ocean-shift 18s ease-in-out infinite; }
  .animate-bubble { animation: bubble-rise 8s ease-in infinite; }
  .animate-caustic { animation: caustic-shift 14s ease-in-out infinite; }
  .animate-sun-rays { animation: sun-rays 10s ease-in-out infinite; }
`;

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 STATUS COLORS
// ═══════════════════════════════════════════════════════════════════════════
const STATUS_COLORS = {
  present: { accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", label: "#15803d" },
  late: { accent: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "#b45309" },
  halfDay: { accent: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", label: "#0369a1" },
  absent: { accent: "#ef4444", bg: "#fef2f2", border: "#fecaca", label: "#b91c1c" },
} as const;

type StatusKey = keyof typeof STATUS_COLORS;

// ─────────────────────────────────────────────
// API HELPERS
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
// STATUS PILL
// ─────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const base =
    "inline-flex items-center gap-1.5 justify-center min-w-[100px] px-3 py-1.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider border shadow-sm";

  if (s.includes("present")) {
    const t = STATUS_COLORS.present;
    return (
      <span className={base} style={{ background: t.bg, color: t.label, borderColor: t.border }}>
        <CheckCircle2 size={11} strokeWidth={3} /> Present
      </span>
    );
  }
  if (s.includes("late")) {
    const t = STATUS_COLORS.late;
    return (
      <span className={base} style={{ background: t.bg, color: t.label, borderColor: t.border }}>
        <Clock size={11} strokeWidth={3} /> Late
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
        <XCircle size={11} strokeWidth={3} /> Absent
      </span>
    );
  }
  if (s.includes("leave")) {
    return <span className={`${base} bg-sky-50 text-sky-700 border-sky-200`}>On Leave</span>;
  }
  return <span className={`${base} bg-gray-50 text-gray-600 border-gray-200`}>{status || "—"}</span>;
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type CalEvent = { name: string; subject: string; starts_on: string; ends_on?: string; color?: string; event_type?: string };
type ErpNotif = { name: string; subject: string; document_type?: string; document_name?: string; creation?: string; read?: number };
type TodoItem = { name: string; description: string; status: string; priority?: string; date?: string };
type Contact = { name: string; first_name?: string; last_name?: string; full_name?: string; mobile_no?: string; email_id?: string; company_name?: string };

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────
function useCalendarEvents() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
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
      .catch(() => { })
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
      if (realName) setTodos((p) => p.map((t) => t.name === tempId ? { ...t, name: realName } : t));
    } catch {
      setTodos((p) => p.filter((t) => t.name !== tempId));
    } finally { setAdding(false); }
  };

  const deleteTodo = async (name: string) => {
    setTodos((p) => p.filter((t) => t.name !== name));
    try {
      await fetch(`${_RES}/ToDo/${encodeURIComponent(name)}`, {
        method: "DELETE", credentials: "include",
        headers: { Accept: "application/json", ...getAuthHeader(), ...getCsrf() },
      });
    } catch { }
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
// ✨ GlassCard
// ─────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  glow?: string;
  delay?: number;
}
const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", gradient = "linear-gradient(135deg,#22c55e,#16a34a)", glow = "rgba(34,197,94,0.35)", delay = 0 }) => (
  <div
    className={`group relative bg-white rounded-2xl border border-gray-100/80 overflow-hidden transition-all duration-500 hover:-translate-y-1.5 ${className}`}
    style={{
      boxShadow: "0 2px 12px rgba(15,23,42,0.06), 0 0 0 1px rgba(255,255,255,0.5) inset",
      animation: `slide-up 0.5s ease-out ${delay}ms both`,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = `0 24px 48px -16px ${glow}, 0 0 0 1px ${glow}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06), 0 0 0 1px rgba(255,255,255,0.5) inset";
    }}
  >
    <div className="h-1.5 w-full relative overflow-hidden">
      <div className="absolute inset-0 animate-gradient-shift" style={{ background: gradient }} />
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────
// ✨ STAT CARD — Bigger footer + value fonts
// ─────────────────────────────────────────────
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  footer: string;
  gradient: string;
  accent: string;
  glow: string;
  delay?: number;
}> = ({ title, value, icon, footer, gradient, accent, glow, delay = 0 }) => (
  <div
    className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-500 hover:-translate-y-2"
    style={{
      boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
      animation: `slide-up 0.5s ease-out ${delay}ms both`,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = `0 28px 56px -16px ${glow}, 0 0 0 1px ${accent}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)";
    }}
  >
    <div className="h-1.5 w-full" style={{ background: gradient }} />
    <div
      className="absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-10 blur-3xl transition-all duration-700 group-hover:opacity-30 group-hover:scale-150 pointer-events-none animate-float-slow"
      style={{ background: gradient }}
    />
    <div className="relative p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
            <p className="text-[11.5px] font-black text-gray-500 uppercase tracking-[0.15em] truncate">
              {title}
            </p>
          </div>
          <p
            className="text-[24px] md:text-[28px] font-black leading-none tracking-tight truncate"
            style={{
              background: gradient,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {value ?? "N/A"}
          </p>
          <p className="text-[13.5px] text-gray-600 mt-3.5 font-bold truncate flex items-center gap-2 leading-snug">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
            <span className="truncate">{footer}</span>
          </p>
        </div>
        <div
          className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 relative"
          style={{ background: gradient, boxShadow: `0 12px 28px -8px ${glow}` }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 animate-pulse-ring"
            style={{ background: gradient }}
          />
          <span className="text-white relative z-10">{icon}</span>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// 🌿 GREEN-ONLY OCEAN WAVE HERO BANNER
// (Animated gradient — all greens, no blue)
// ─────────────────────────────────────────────
const OceanWaveBanner: React.FC<{
  employeeName?: string;
  company?: string;
}> = ({ employeeName, company }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (employeeName || "there").split(" ")[0];

  return (
    <div
      className="relative rounded-3xl overflow-hidden px-5 md:px-8 py-8 md:py-12 text-white"
      style={{
        // ✅ GREEN-ONLY GRADIENT (no blue) — smoothly animates
        background:
          "linear-gradient(120deg, #15803d 0%, #16a34a 14%, #22c55e 28%, #10b981 42%, #14b8a6 56%, #0d9488 70%, #14b8a6 84%, #16a34a 100%)",
        backgroundSize: "400% 400%",
        boxShadow:
          "0 30px 60px -20px rgba(22,163,74,0.5), 0 0 0 1px rgba(255,255,255,0.15) inset, 0 -1px 0 rgba(0,0,0,0.12) inset",
        animation: "ocean-shift 18s ease-in-out infinite",
      }}
    >
      {/* ☀️ Soft light glows — green-tinted */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 pointer-events-none animate-sun-rays"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute -top-20 right-1/3 w-80 h-80 pointer-events-none animate-caustic"
        style={{
          background: "radial-gradient(ellipse, rgba(167,243,208,0.30) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      {/* 🫧 Rising bubbles */}
      <div className="absolute bottom-0 left-10 w-2 h-2 rounded-full bg-white/40 pointer-events-none animate-bubble" style={{ animationDelay: "0s" }} />
      <div className="absolute bottom-0 left-1/4 w-1.5 h-1.5 rounded-full bg-white/50 pointer-events-none animate-bubble" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-0 left-1/2 w-2.5 h-2.5 rounded-full bg-white/30 pointer-events-none animate-bubble" style={{ animationDelay: "4s" }} />
      <div className="absolute bottom-0 right-1/3 w-1.5 h-1.5 rounded-full bg-white/60 pointer-events-none animate-bubble" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-0 right-1/4 w-2 h-2 rounded-full bg-white/40 pointer-events-none animate-bubble" style={{ animationDelay: "3s" }} />
      <div className="absolute bottom-0 right-10 w-1.5 h-1.5 rounded-full bg-white/50 pointer-events-none animate-bubble" style={{ animationDelay: "5s" }} />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, white 1.2px, transparent 1.2px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ✨ Decorative rotating icon — subtle grey */}
      <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 pointer-events-none animate-spin-slow opacity-[0.08]">
        <Waves size={180} strokeWidth={0.6} className="text-gray-900" />
      </div>

      {/* CONTENT */}
      <div className="relative flex items-start justify-between flex-wrap gap-5 z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* ✨ Dashboard Overview Badge — better Sparkles icon */}
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 shadow-lg">
              <Sparkles
                size={13}
                strokeWidth={2.5}
                className="text-yellow-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
              />
              <span className="text-[10.5px] font-black uppercase tracking-[0.15em]">
                Dashboard Overview
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-200 animate-pulse" />
              <span className="text-[10.5px] font-black uppercase tracking-widest">Live</span>
            </div>
          </div>
          <h1 className="text-[26px] md:text-[36px] font-black leading-tight tracking-tight drop-shadow-md">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-[13px] md:text-[15px] text-white/90 mt-2 font-medium max-w-lg drop-shadow-sm">
            Your personalized workspace — stay on top of attendance, tasks, and team updates.
          </p>
        </div>

        {/* ✨ Profile Pill — Bigger + positioned higher + better UserCheck icon */}
        <div className="flex items-start gap-3.5 bg-white/15 backdrop-blur-xl px-5 py-4 rounded-2xl border border-white/30 shadow-2xl hover:bg-white/25 transition-all duration-300 hover:scale-[1.02] -mt-2 md:-mt-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/50 to-white/10 flex items-center justify-center border border-white/40 shadow-inner flex-shrink-0">
            <UserCheck
              size={26}
              className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
              strokeWidth={2.4}
            />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[14.5px] font-black text-white leading-tight truncate max-w-[160px] md:max-w-[220px]">
              {employeeName || "Employee"}
            </p>
            <p className="text-[11.5px] text-white/90 font-black mt-1.5 uppercase tracking-wider truncate max-w-[160px] md:max-w-[220px]">
              {company || "Organization"}
            </p>
          </div>
        </div>
      </div>

      {/* 🌊 DEEP SMOOTH WAVE LAYERS — Bottom of banner */}
      <div className="absolute bottom-0 left-0 right-0 h-28 md:h-36 pointer-events-none overflow-hidden">
        {/* Deepest wave (back, slow) */}
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-full animate-wave-3"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: "32s" }}
        >
          <path
            d="M0,70 C180,110 360,30 540,70 C720,110 900,30 1080,70 C1260,110 1440,30 1620,70 L1620,140 L0,140 Z"
            fill="rgba(255,255,255,0.06)"
          />
        </svg>

        {/* Mid-deep wave */}
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-full animate-wave-2"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: "24s" }}
        >
          <path
            d="M0,90 C180,50 360,130 540,90 C720,50 900,130 1080,90 C1260,50 1440,130 1620,90 L1620,140 L0,140 Z"
            fill="rgba(255,255,255,0.10)"
          />
        </svg>

        {/* Mid wave */}
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-full animate-wave-1"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: "20s" }}
        >
          <path
            d="M0,100 C180,70 360,130 540,100 C720,70 900,130 1080,100 C1260,70 1440,130 1620,100 L1620,140 L0,140 Z"
            fill="rgba(255,255,255,0.14)"
          />
        </svg>

        {/* Front wave (brightest, fastest) */}
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-full animate-wave-2"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: "16s" }}
        >
          <path
            d="M0,115 C180,90 360,140 540,115 C720,90 900,140 1080,115 C1260,90 1440,140 1620,115 L1620,140 L0,140 Z"
            fill="rgba(255,255,255,0.20)"
          />
        </svg>

        {/* Foam line (thin white curve on top of front wave) */}
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-full animate-wave-2"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animationDuration: "16s" }}
        >
          <path
            d="M0,115 C180,90 360,140 540,115 C720,90 900,140 1080,115 C1260,90 1440,140 1620,115"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ✨ ATTENDANCE TABLE
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center gap-3 text-gray-400 text-sm font-semibold">
      <div className="w-5 h-5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
      Loading biometric logs…
    </div>
  );

  return (
    <>
      <GlassCard gradient="linear-gradient(135deg,#22c55e,#0d9488)" glow="rgba(34,197,94,0.35)">
        <div className="px-5 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 8px 20px -6px rgba(34,197,94,0.6)" }}
            >
              <Fingerprint size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-black text-gray-900 text-[15px] md:text-[16px] tracking-tight">Biometric History</p>
              <p className="text-[11.5px] text-gray-500 font-semibold">Records for {monthLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/attendance")}
            className="flex items-center gap-1 text-[12px] font-extrabold text-gray-500 hover:text-green-600 transition-colors px-3 py-2 rounded-lg hover:bg-green-50"
          >
            View All <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>

        {error && (
          <div className="mx-5 md:mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-semibold">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 text-[11px] uppercase tracking-wider font-black">
              <tr>
                <th className="px-5 md:px-6 py-4">Date</th>
                <th className="px-5 md:px-6 py-4">In</th>
                <th className="px-5 md:px-6 py-4">Out</th>
                <th className="px-5 md:px-6 py-4">Status</th>
                <th className="px-5 md:px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-300">
                      <Fingerprint size={32} className="opacity-30" />
                      <p className="text-sm font-bold text-gray-500">No biometric records</p>
                    </div>
                  </td>
                </tr>
              ) : records.slice(0, 8).map((record) => (
                <tr key={record.id} className="hover:bg-green-50/40 transition-colors">
                  <td className="px-5 md:px-6 py-4 text-[13px] font-bold text-gray-800">{record.date || "N/A"}</td>
                  <td className="px-5 md:px-6 py-4 text-[13px] text-gray-600 font-semibold">{record.inTime || "—"}</td>
                  <td className="px-5 md:px-6 py-4 text-[13px] text-gray-600 font-semibold">{record.outTime || "—"}</td>
                  <td className="px-5 md:px-6 py-4"><StatusPill status={record.status} /></td>
                  <td className="px-5 md:px-6 py-4 text-right">
                    {canRegularize(record.status) ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                        className="text-[11px] font-extrabold text-green-600 border-2 border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-500 hover:text-white hover:border-green-500 transition-all inline-flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <ExternalLink size={12} strokeWidth={2.5} /> Regularize
                      </button>
                    ) : (
                      <span className="text-gray-300 text-[11px] italic font-semibold">No Action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      <AttendanceRegularizationModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onSubmit={handleModalSubmit} />
    </>
  );
};

// ─────────────────────────────────────────────
// ✨ CALENDAR WIDGET
// ─────────────────────────────────────────────
const EVENT_COLOR: Record<string, string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
  yellow: "bg-amber-100 text-amber-700 border-amber-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
};
function evColorClass(c?: string) {
  return EVENT_COLOR[(c || "").toLowerCase()] || "bg-green-100 text-green-700 border-green-200";
}

const CalendarWidget: React.FC = () => {
  const { events, loading, refetch } = useCalendarEvents();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <GlassCard gradient="linear-gradient(135deg,#22c55e,#16a34a)" glow="rgba(34,197,94,0.35)">
      <div className="px-5 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 8px 20px -6px rgba(34,197,94,0.6)" }}
          >
            <CalendarDays size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-black text-gray-900 text-[15px] md:text-[16px] tracking-tight">Upcoming Events</p>
            <p className="text-[11.5px] text-gray-500 font-semibold">Next 30 days · {events.length} events</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
        >
          <RefreshCw size={15} strokeWidth={2.5} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-72">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-xs font-semibold">
            <div className="w-4 h-4 rounded-full border-2 border-green-300 border-t-transparent animate-spin" /> Loading…
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CalendarDays size={32} className="text-gray-200 mb-2" />
            <p className="text-sm font-bold text-gray-500">No upcoming events</p>
            <p className="text-[12px] text-gray-400 mt-1 font-medium">Clear schedule for next 30 days</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((ev) => {
              const isToday = ev.starts_on?.slice(0, 10) === today;
              const evDate = new Date(ev.starts_on);
              return (
                <div
                  key={ev.name}
                  className={`px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/80 transition-colors ${isToday ? "bg-gradient-to-r from-green-50/60 to-transparent" : ""}`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-md ${isToday ? "text-white" : "bg-gray-100 text-gray-700"}`}
                    style={isToday ? { background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 8px 20px -6px rgba(34,197,94,0.6)" } : {}}
                  >
                    <span className="text-[9px] font-black uppercase leading-none">
                      {evDate.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-[15px] font-black leading-tight mt-0.5">{evDate.getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-[13px] truncate">{ev.subject}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                        <Clock size={10} strokeWidth={2.5} />
                        {ev.starts_on?.slice(11, 16) || "All day"}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">TODAY</span>
                      )}
                    </div>
                    {ev.event_type && (
                      <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${evColorClass(ev.color)}`}>
                        {ev.event_type}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ─────────────────────────────────────────────
// ✨ TODO WIDGET
// ─────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  High: "text-red-600 bg-red-50 border-red-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  Low: "text-green-600 bg-green-50 border-green-200",
};

const TodoWidget: React.FC = () => {
  const { todos, loading, toggle, addTodo, deleteTodo, newText, setNewText, adding } = useTodos();
  const open = todos.filter((t) => t.status !== "Closed");
  const closed = todos.filter((t) => t.status === "Closed");

  return (
    <GlassCard gradient="linear-gradient(135deg,#a855f7,#ec4899)" glow="rgba(168,85,247,0.35)" className="h-full flex flex-col">
      <div className="px-5 md:px-6 py-5 border-b border-gray-100 flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow: "0 8px 20px -6px rgba(168,85,247,0.6)" }}
        >
          <CheckSquare size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-black text-gray-900 text-[15px] md:text-[16px] tracking-tight">My To-Do</p>
          <p className="text-[11.5px] text-gray-500 font-semibold">
            <span className="text-purple-600 font-extrabold">{open.length}</span> open ·{" "}
            <span>{closed.length}</span> done
          </p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-50 flex gap-2">
        <input
          type="text"
          placeholder="Add a task… (Enter to save)"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          className="flex-1 text-[13px] px-3.5 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 font-semibold text-gray-700 placeholder:text-gray-400 placeholder:font-medium transition-all"
        />
        <button
          type="button"
          onClick={addTodo}
          disabled={adding || !newText.trim()}
          className="px-3.5 py-2.5 rounded-xl text-white text-xs font-black disabled:opacity-40 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}
        >
          {adding ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus size={15} strokeWidth={3} />
          )}
        </button>
      </div>

      <div className="overflow-y-auto max-h-64 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-xs font-semibold">
            <div className="w-4 h-4 rounded-full border-2 border-purple-300 border-t-transparent animate-spin" /> Loading…
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare size={30} className="text-gray-200 mb-2" />
            <p className="text-sm font-bold text-gray-500">No tasks yet</p>
            <p className="text-[12px] text-gray-400 mt-1 font-medium">Add your first task above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {[...open, ...closed].map((todo) => {
              const done = todo.status === "Closed";
              return (
                <div
                  key={todo.name}
                  className={`px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50/80 transition-colors group/row ${done ? "opacity-60" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(todo)}
                    className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-purple-500 transition-colors"
                  >
                    {done ? (
                      <CheckCircle2 size={18} className="text-purple-500" strokeWidth={2.5} />
                    ) : (
                      <Circle size={18} strokeWidth={2.5} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-bold ${done ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {todo.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {todo.priority && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${PRIORITY_COLOR[todo.priority] || "text-gray-500 bg-gray-50 border-gray-200"}`}>
                          {todo.priority}
                        </span>
                      )}
                      {todo.date && (
                        <span className="text-[11px] text-gray-400 font-semibold">{fmtDate(todo.date)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.name)}
                    className="opacity-0 group-hover/row:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ─────────────────────────────────────────────
// ✨ CONTACTS WIDGET
// ─────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-emerald-500", "bg-indigo-500",
];
function avatarBg(n: string) {
  let h = 0;
  for (const c of n) h = c.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function displayName(c: Contact) {
  return c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.name;
}
function initials(c: Contact) {
  return displayName(c).slice(0, 2).toUpperCase();
}

const ContactsWidget: React.FC = () => {
  const { contacts, loading, search, setSearch, refetch, total } = useContacts();

  return (
    <GlassCard gradient="linear-gradient(135deg,#3b82f6,#06b6d4)" glow="rgba(59,130,246,0.35)" className="h-full flex flex-col">
      <div className="px-5 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg,#3b82f6,#0891b2)", boxShadow: "0 8px 20px -6px rgba(59,130,246,0.6)" }}
          >
            <Users size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-black text-gray-900 text-[15px] md:text-[16px] tracking-tight">Contacts</p>
            <p className="text-[11.5px] text-gray-500 font-semibold">{total} total</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refetch}
          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <RefreshCw size={15} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-50">
        <input
          type="text"
          placeholder="Search by name, company, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-[13px] px-3.5 py-2.5 rounded-xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 font-semibold text-gray-700 placeholder:text-gray-400 placeholder:font-medium transition-all"
        />
      </div>

      <div className="overflow-y-auto max-h-64 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-xs font-semibold">
            <div className="w-4 h-4 rounded-full border-2 border-blue-300 border-t-transparent animate-spin" /> Loading…
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users size={30} className="text-gray-200 mb-2" />
            <p className="text-sm font-bold text-gray-500">
              {search ? "No contacts match" : "No contacts yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {contacts.map((c) => (
              <div key={c.name} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50/80 transition-colors">
                <div className={`w-10 h-10 rounded-full ${avatarBg(c.name)} text-white flex items-center justify-center text-[12px] font-black uppercase flex-shrink-0 shadow-md`}>
                  {initials(c)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-[13px] truncate">{displayName(c)}</p>
                  {c.company_name && (
                    <p className="text-[11px] text-gray-500 font-semibold truncate">{c.company_name}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {c.mobile_no && (
                      <a href={`tel:${c.mobile_no}`} className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold">
                        <Phone size={9} strokeWidth={2.5} /> {c.mobile_no}
                      </a>
                    )}
                    {c.email_id && (
                      <a href={`mailto:${c.email_id}`} className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate font-semibold">
                        <Mail size={9} strokeWidth={2.5} /> {c.email_id}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ─────────────────────────────────────────────
// ✨ MAIN DASHBOARD
// ─────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { data: dashData, loading: dashLoading } = useDashboard();
  const { balances, leaves, loading: leaveLoading } = useLeave();

  const casualLeave = useMemo(() => {
    const list = Array.isArray(balances) ? (balances as LeaveBalance[]) : [];
    return list.find((b) => (b.type || "").toLowerCase().includes("casual"));
  }, [balances]);

  const todayStatus = dashLoading
    ? "..."
    : dashData?.last_log_type === "IN"
      ? "Checked In"
      : dashData?.last_log_type === "OUT"
        ? "Checked Out"
        : "N/A";

  const statCards = [
    {
      title: "Status Today",
      value: todayStatus,
      icon: <UserCheck size={24} strokeWidth={2.5} />,
      footer: dashData?.last_log_time ? `Last: ${dashData.last_log_time}` : "No log today",
      gradient: "linear-gradient(135deg,#22c55e,#0d9488)",
      accent: "#16a34a",
      glow: "rgba(34,197,94,0.5)",
    },
    {
      title: "Company",
      value: dashLoading ? "..." : dashData?.company || "N/A",
      icon: <Building2 size={24} strokeWidth={2.5} />,
      footer: dashData?.employee_name || "",
      gradient: "linear-gradient(135deg,#3b82f6,#06b6d4)",
      accent: "#0891b2",
      glow: "rgba(59,130,246,0.5)",
    },
    {
      title: "Leave Applications",
      value: leaveLoading ? "..." : Array.isArray(leaves) ? leaves.length : 0,
      icon: <CalendarDays size={24} strokeWidth={2.5} />,
      footer: "Total applications submitted",
      gradient: "linear-gradient(135deg,#a855f7,#ec4899)",
      accent: "#7c3aed",
      glow: "rgba(168,85,247,0.5)",
    },
  ];

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      {/* ✨ Ambient mesh background — green theme */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-green-200/30 blur-[120px] animate-float-slow" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-200/30 blur-[120px] animate-float-reverse" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-teal-200/30 blur-[120px] animate-float-slow" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-green-200/20 blur-[140px] animate-float-reverse" style={{ animationDelay: "5s" }} />
      </div>

      <div className="space-y-6 animate-fade-in relative">
        {/* 🌊 GREEN-ONLY OCEAN WAVE HERO BANNER */}
        <OceanWaveBanner
          employeeName={dashData?.employee_name}
          company={dashData?.company}
        />

        {/* ✨ STAT CARDS */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-green-400 to-teal-600 shadow-sm" />
            <p className="text-[12.5px] font-black uppercase tracking-[0.15em] text-gray-600">
              Quick Stats
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {statCards.map((s, i) => (
              <StatCard key={s.title} {...s} delay={i * 80} />
            ))}
          </div>
        </div>

        {/* ✨ PRODUCTIVITY ROW */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-400 to-pink-600 shadow-sm" />
            <p className="text-[12.5px] font-black uppercase tracking-[0.15em] text-gray-600">
              Productivity
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            <TodoWidget />
            <ContactsWidget />
          </div>
        </div>

        {/* ✨ ACTIVITY & NOTICES ROW */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 shadow-sm" />
            <p className="text-[12.5px] font-black uppercase tracking-[0.15em] text-gray-600">
              Activity & Notices
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            <div className="lg:col-span-2">
              <AttendanceTable />
            </div>

            <GlassCard gradient="linear-gradient(135deg,#22c55e,#16a34a)" glow="rgba(34,197,94,0.35)" className="h-full flex flex-col">
              <div className="px-5 md:px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 8px 20px -6px rgba(34,197,94,0.6)" }}
                >
                  <Bell size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-[15px] md:text-[16px] tracking-tight">
                    Notice Board
                  </p>
                  <p className="text-[11.5px] text-gray-500 font-semibold">Latest announcements</p>
                </div>
              </div>

              <div className="flex-grow p-4 space-y-3 overflow-y-auto">
                {dashData?.notice_board?.length ? (
                  dashData.notice_board.map((notice: any, i: number) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                      style={{
                        background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
                        borderColor: "#bbf7d0",
                      }}
                    >
                      <p className="font-black text-gray-900 text-[13px] mb-1.5 tracking-tight flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {notice.title || `Notice ${i + 1}`}
                      </p>
                      <p className="text-[12px] text-gray-600 leading-relaxed font-medium">
                        {notice.message || JSON.stringify(notice)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-3 border border-gray-100">
                      <Inbox size={24} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-black text-gray-500 uppercase tracking-wider">
                      No Notices
                    </p>
                    <p className="text-[12px] text-gray-400 mt-1.5 font-semibold">
                      All clear for now
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ✨ Calendar — mobile + desktop */}
        <div className="lg:hidden">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600 shadow-sm" />
            <p className="text-[12.5px] font-black uppercase tracking-[0.15em] text-gray-600">
              Events
            </p>
          </div>
          <CalendarWidget />
        </div>

        <div className="hidden lg:block">
          <CalendarWidget />
        </div>
      </div>
    </>
  );
};