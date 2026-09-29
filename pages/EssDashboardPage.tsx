import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, CalendarCheck, FileText, BookOpen, ArrowUpRight,
  Sparkles, TrendingUp, TrendingDown, User, ArrowLeft, Minus,
  Target, Wallet,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { sidebarConfig, getIcon } from "../config/layout.config";
import { AttendancePage } from "./AttendancePage";
import { LeavePage } from "./LeavePage";
import { SalarySlipPage } from "./SalarySlipPage";
import { useEmployee } from "../hooks/useEmployee";
import { useAttendance } from "../hooks/useAttendance";
import { useLeave } from "../hooks/useLeave";
import { useSalarySlip } from "../hooks/useSalarySlip";

interface EssDashboardPageProps {
  designation?: string;
  employeeName?: string;
  stats?: {
    attendanceScore?: number;
    leaveBalance?: number;
    pendingLeaves?: number;
    latestNetPay?: string | number;
  };
}

type InlineTab = "overview" | "attendance" | "leave" | "salary-slip";

const MODULE_META: Record<
  string,
  { description: string; accent: string; accentLight: string; gradient: string; glow: string; emoji: string }
> = {
  "/attendance": {
    description: "View your monthly attendance log, check-in/out times, and score.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#22c55e 0%,#16a34a 100%)",
    glow: "rgba(34,197,94,0.35)", emoji: "⏰",
  },
  "/leave": {
    description: "Apply for leave, track applications, and check remaining balances.",
    accent: "#0ea5e9", accentLight: "#e0f2fe",
    gradient: "linear-gradient(135deg,#38bdf8 0%,#0284c7 100%)",
    glow: "rgba(14,165,233,0.35)", emoji: "🌴",
  },
  "/salary-slip": {
    description: "Download payslips, review gross/net pay, and request official letters.",
    accent: "#8b5cf6", accentLight: "#ede9fe",
    gradient: "linear-gradient(135deg,#a78bfa 0%,#7c3aed 100%)",
    glow: "rgba(139,92,246,0.35)", emoji: "💰",
  },
  "/directory": {
    description: "Search colleagues by name, find contact details and department info.",
    accent: "#f59e0b", accentLight: "#fef3c7",
    gradient: "linear-gradient(135deg,#fbbf24 0%,#d97706 100%)",
    glow: "rgba(245,158,11,0.35)", emoji: "👥",
  },
  "/todo": {
    description: "Manage your personal tasks and to-do lists efficiently.",
    accent: "#ec4899", accentLight: "#fce7f3",
    gradient: "linear-gradient(135deg,#f472b6 0%,#db2777 100%)",
    glow: "rgba(236,72,153,0.35)", emoji: "✅",
  },
  "/calendar": {
    description: "View your schedule, upcoming events, and academic calendar.",
    accent: "#14b8a6", accentLight: "#ccfbf1",
    gradient: "linear-gradient(135deg,#2dd4bf 0%,#0d9488 100%)",
    glow: "rgba(20,184,166,0.35)", emoji: "📅",
  },
  "/profile": {
    description: "Update personal information, view employment details and documents.",
    accent: "#6366f1", accentLight: "#e0e7ff",
    gradient: "linear-gradient(135deg,#818cf8 0%,#4f46e5 100%)",
    glow: "rgba(99,102,241,0.35)", emoji: "👤",
  },
  "/faculty": {
    description: "Manage courses, take attendance, and assess student performance.",
    accent: "#ef4444", accentLight: "#fee2e2",
    gradient: "linear-gradient(135deg,#f87171 0%,#dc2626 100%)",
    glow: "rgba(239,68,68,0.35)", emoji: "🎓",
  },
};

const INLINE_ROUTES: Record<string, InlineTab> = {
  "/attendance": "attendance",
  "/leave": "leave",
  "/salary-slip": "salary-slip",
};

const TAB_LABELS: Record<InlineTab, string> = {
  overview: "Overview",
  attendance: "My Attendance",
  leave: "Leave Applications",
  "salary-slip": "Salary Slips",
};

const STATUS_COLORS = {
  present: "#22c55e",
  absent: "#ef4444",
  late: "#f59e0b",
  halfDay: "#14b8a6",
} as const;

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function slipNetPay(slip: any): number | null {
  return num(slip?.net_pay ?? slip?.netPay);
}

/* ── Premium Stat card ───────────────────────────────────────────────── */
function StatCard({
  label, value, icon, color, sub, trend, onClick, loading, gradient,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  onClick?: () => void;
  loading?: boolean;
  gradient?: string;
}) {
  const TrendIcon =
    trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor =
    trend?.direction === "up" ? "#16a34a" : trend?.direction === "down" ? "#dc2626" : "#94a3b8";

  return (
    <div
      onClick={onClick}
      className={`group relative h-full bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 overflow-hidden transition-all duration-300 ${
        onClick ? "cursor-pointer" : ""
      } hover:-translate-y-1.5`}
      style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 20px 40px -12px ${color}55, 0 0 0 1px ${color}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)";
      }}
    >
      <div
        className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10 blur-2xl transition-all duration-500 group-hover:opacity-25 group-hover:scale-125 pointer-events-none"
        style={{ background: gradient || color }}
      />
      <div
        className="absolute top-0 left-0 h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: gradient || `linear-gradient(90deg,${color},${color}88)` }}
      />
      <div className="flex items-start justify-between relative z-10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          style={{ background: gradient || color, boxShadow: `0 8px 20px -6px ${color}80` }}
        >
          <span className="text-white">{icon}</span>
        </div>
        {trend && !loading && (
          <span
            className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full backdrop-blur-sm tracking-wide"
            style={{ color: trendColor, backgroundColor: trendColor + "18", border: `1px solid ${trendColor}30` }}
          >
            <TrendIcon size={12} strokeWidth={3} /> {trend.label}
          </span>
        )}
      </div>
      <div className="min-w-0 relative z-10 mt-auto">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 truncate">
          {label}
        </p>
        {loading ? (
          <div className="h-8 w-24 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] rounded-lg animate-pulse mt-1.5" />
        ) : (
          <p
            className="text-[30px] font-black leading-tight mt-1 tracking-tight"
            style={{
              background: gradient || `linear-gradient(135deg, #1f2937, ${color})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {value}
          </p>
        )}
        {sub && (
          <p className="text-[11px] text-gray-500 font-semibold mt-1.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

/* ── Equal-size Module Card (Bigger, Clearer Headings) ──────────────── */
function ModuleCard({
  label, iconName, description, meta, onClick,
}: {
  label: string;
  iconName: string;
  description: string;
  meta: (typeof MODULE_META)[string];
  onClick: () => void;
}) {
  const Icon = getIcon(iconName);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col h-full w-full text-left bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:-translate-y-1.5"
      style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 24px 48px -16px ${meta.glow}, 0 0 0 1px ${meta.accent}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)";
      }}
    >
      {/* Top gradient bar */}
      <div className="h-1.5 w-full relative overflow-hidden shrink-0">
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-x-110"
          style={{ background: meta.gradient }}
        />
      </div>

      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${meta.accentLight}, transparent 70%)` }}
      />

      {/* Content */}
      <div className="p-6 relative z-10 flex flex-col flex-1 min-h-[220px]">
        <div className="flex items-start justify-between mb-5 shrink-0">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg"
            style={{ background: meta.gradient, boxShadow: `0 10px 24px -8px ${meta.glow}` }}
          >
            <Icon size={26} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-3xl opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300">
            {meta.emoji}
          </span>
        </div>

        {/* Title + Description */}
        <div className="flex-1 flex flex-col">
          <h3
            className="font-black text-gray-900 text-[19px] leading-tight mb-2.5 tracking-tight transition-colors duration-200"
            onMouseEnter={(e) => (e.currentTarget.style.color = meta.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "")}
          >
            {label}
          </h3>
          <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2 mb-4 font-medium min-h-[40px]">
            {description}
          </p>
        </div>

        {/* CTA pinned to bottom */}
        <span
          className="inline-flex items-center gap-2 text-[13px] font-extrabold px-4 py-2.5 rounded-xl transition-all duration-300 group-hover:shadow-lg self-start shrink-0 tracking-wide"
          style={{
            background: meta.gradient,
            color: "white",
            boxShadow: `0 4px 12px -4px ${meta.glow}`,
          }}
        >
          Open Module
          <ArrowUpRight
            size={15}
            strokeWidth={3}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>
    </button>
  );
}

/* ── Glass Chart Panel (Bigger Titles) ──────────────────────────────── */
function ChartPanel({
  title, action, children, accent = "#16a34a", icon,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="relative h-full flex flex-col bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group"
      style={{ boxShadow: "0 2px 12px rgba(15,23,42,0.06)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 20px 40px -16px ${accent}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)";
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-500 pointer-events-none"
        style={{ background: accent }}
      />
      <div className="flex items-center justify-between mb-5 relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${accent}15`, color: accent }}
            >
              {icon}
            </div>
          )}
          <p className="text-[13px] font-black text-gray-700 uppercase tracking-wider">
            {title}
          </p>
        </div>
        {action}
      </div>
      <div className="relative z-10 flex-1">{children}</div>
    </div>
  );
}

export const EssDashboardPage: React.FC<EssDashboardPageProps> = ({
  designation = "",
  employeeName: propName = "",
  stats: propStats = {},
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<InlineTab>("overview");

  const { employee } = useEmployee();
  const employeeName =
    String((employee as any)?.employee_name || "").trim() || propName || "Employee";

  const now = new Date();
  const attendance = useAttendance(now.getFullYear(), now.getMonth() + 1);
  const { leaves, balances, loading: leaveLoading } = useLeave();
  const { slips, loading: slipsLoading } = useSalarySlip();

  const attendanceLoading = Boolean(attendance?.loading);
  const attStats = attendance?.stats ?? {
    present: 0, absent: 0, late: 0, halfDay: 0, totalDays: 0, percentage: 0,
  };

  const attendancePct =
    attendance?.stats?.percentage != null
      ? `${Math.round(Number(attendance.stats.percentage))}%`
      : propStats.attendanceScore != null
      ? `${propStats.attendanceScore}%`
      : "—";

  const safeBalances = useMemo(() => (Array.isArray(balances) ? balances : []), [balances]);

  const totalLeaveBalance = useMemo(() => {
    if (safeBalances.length === 0) return null;
    const total = safeBalances.reduce((acc: number, b: any) => {
      const avail = Number(b.available ?? b.balance ?? 0);
      return acc + (Number.isFinite(avail) ? avail : 0);
    }, 0);
    return total;
  }, [safeBalances]);

  const leaveBalance =
    totalLeaveBalance != null
      ? totalLeaveBalance
      : propStats.leaveBalance != null
      ? propStats.leaveBalance
      : "—";

  const safeLeaves = useMemo(() => (Array.isArray(leaves) ? leaves : []), [leaves]);

  const pendingCount = useMemo(() => {
    return safeLeaves.filter((l: any) => {
      const s = ((l.status || l.workflow_state || "")).toLowerCase();
      return s.includes("pending") || s.includes("open") || s.includes("applied");
    }).length;
  }, [safeLeaves]);

  const pendingLeaves =
    pendingCount > 0
      ? pendingCount
      : propStats.pendingLeaves != null
      ? propStats.pendingLeaves
      : leaveLoading
      ? "—"
      : 0;

  const safeSlips = useMemo(() => (Array.isArray(slips) ? slips : []), [slips]);
  const latestSlip = safeSlips[0];
  const latestNetPayNum = latestSlip ? slipNetPay(latestSlip) : null;

  const netPay =
    latestNetPayNum != null
      ? `₹${latestNetPayNum.toLocaleString()}`
      : propStats.latestNetPay != null
      ? typeof propStats.latestNetPay === "number"
        ? `₹${propStats.latestNetPay.toLocaleString()}`
        : propStats.latestNetPay
      : slipsLoading
      ? "—"
      : "No slips";

  const attendanceChartData = useMemo(() => {
    const data = [
      { name: "Present", value: Number(attStats.present ?? 0), color: STATUS_COLORS.present },
      { name: "Absent", value: Number(attStats.absent ?? 0), color: STATUS_COLORS.absent },
      { name: "Late", value: Number(attStats.late ?? 0), color: STATUS_COLORS.late },
      { name: "Half Day", value: Number((attStats as any).halfDay ?? 0), color: STATUS_COLORS.halfDay },
    ];
    return data.filter((d) => d.value > 0);
  }, [attStats]);

  const hasAttendanceData = attendanceChartData.length > 0;

  const attendanceSubText = useMemo(() => {
    const total = Number((attStats as any).totalDays ?? 0);
    if (!total) return "This month";
    const present = Number(attStats.present ?? 0);
    const late = Number(attStats.late ?? 0);
    const halfDay = Number((attStats as any).halfDay ?? 0);
    const parts: string[] = [`${present}/${total} present`];
    if (late > 0) parts.push(`${late} late`);
    if (halfDay > 0) parts.push(`${halfDay} half-day`);
    return parts.join(" · ");
  }, [attStats]);

  const leaveChartData = useMemo(() => {
    return safeBalances.map((b: any) => ({
      name: (b.type || "Leave").replace(/\s*Leave\s*$/i, "").trim() || b.type,
      used: Number(b.used ?? 0),
      available: Number(b.available ?? b.balance ?? 0),
    }));
  }, [safeBalances]);

  const hasLeaveData = leaveChartData.length > 0;

  const essModules = useMemo(() => {
    const essItem = sidebarConfig.find((item) => item.to === "/ess");
    return essItem?.children || [];
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = employeeName.split(" ")[0] || "there";

  const handleModuleClick = (to: string) => {
    const inlineTab = INLINE_ROUTES[to];
    if (inlineTab) setActiveTab(inlineTab);
    else navigate(to);
  };

  const isInlinePage = activeTab !== "overview";

  const pctNum = Number(attStats.percentage ?? 0);
  const attendanceTrendDirection: "up" | "down" | "flat" =
    pctNum >= 75 ? "up" : pctNum >= 50 ? "flat" : "down";

  const attendanceTrend =
    Number((attStats as any).totalDays ?? 0) > 0
      ? {
          direction: attendanceTrendDirection,
          label: pctNum >= 75 ? "On track" : pctNum >= 50 ? "Watch" : "Low",
        }
      : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero Banner ── */}
      {!isInlinePage && (
        <div
          className="relative rounded-3xl overflow-hidden px-7 py-8 text-white shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #16a34a 0%, #059669 30%, #0d9488 60%, #0f766e 100%)",
            boxShadow: "0 24px 48px -16px rgba(16,163,74,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        >
          <div className="absolute right-0 top-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none blur-2xl animate-pulse" />
          <div className="absolute right-32 bottom-0 w-48 h-48 bg-emerald-300/20 rounded-full translate-y-1/2 pointer-events-none blur-3xl" />
          <div className="absolute left-1/3 -top-12 w-40 h-40 bg-cyan-300/10 rounded-full pointer-events-none blur-2xl" />
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
            <BookOpen size={140} strokeWidth={0.8} />
          </div>
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/25">
                  <Sparkles size={13} className="text-yellow-200" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Employee Self Service</span>
                </div>
              </div>
              <h1 className="text-[32px] font-black leading-tight tracking-tight drop-shadow-sm">
                {greeting}, {firstName}! 👋
              </h1>
              <p className="text-[15px] text-white/90 mt-2 font-medium max-w-lg">
                {designation ? `${designation} · ` : ""}
                Manage attendance, leaves, payroll and more — all in one place.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/25 shadow-2xl hover:bg-white/20 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/40 to-white/10 flex items-center justify-center border border-white/30 shadow-inner">
                <User size={19} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[13px] font-black text-white leading-none">{employeeName}</p>
                <p className="text-[11px] text-white/85 font-bold mt-1 uppercase tracking-wide">
                  {designation || "Employee"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Back button ── */}
      {isInlinePage && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-xl text-sm font-bold transition-all group shadow-sm hover:shadow-md"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <p className="text-sm font-bold text-gray-500">{TAB_LABELS[activeTab]}</p>
        </div>
      )}

      {/* ── Inline pages ── */}
      {activeTab === "attendance" && <AttendancePage onBack={() => setActiveTab("overview")} />}
      {activeTab === "leave" && <LeavePage onBack={() => setActiveTab("overview")} />}
      {activeTab === "salary-slip" && <SalarySlipPage onBack={() => setActiveTab("overview")} />}

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Stat cards */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-green-400 to-emerald-600" />
              <p className="text-[13px] font-black uppercase tracking-wider text-gray-600">
                Quick Overview
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
              <StatCard
                label="Attendance Score"
                value={attendancePct}
                icon={<Clock size={20} strokeWidth={2.5} />}
                color="#16a34a"
                gradient="linear-gradient(135deg,#22c55e,#16a34a)"
                sub={attendanceSubText}
                trend={attendanceTrend}
                loading={attendanceLoading}
                onClick={() => setActiveTab("attendance")}
              />
              <StatCard
                label="Leave Balance"
                value={leaveBalance}
                icon={<CalendarCheck size={20} strokeWidth={2.5} />}
                color="#0ea5e9"
                gradient="linear-gradient(135deg,#38bdf8,#0284c7)"
                sub="Days remaining"
                loading={leaveLoading}
                onClick={() => setActiveTab("leave")}
              />
              <StatCard
                label="Pending Leaves"
                value={pendingLeaves}
                icon={<TrendingUp size={20} strokeWidth={2.5} />}
                color="#f59e0b"
                gradient="linear-gradient(135deg,#fbbf24,#d97706)"
                sub="Awaiting approval"
                loading={leaveLoading}
                onClick={() => setActiveTab("leave")}
              />
              <StatCard
                label="Latest Net Pay"
                value={netPay}
                icon={<Wallet size={20} strokeWidth={2.5} />}
                color="#8b5cf6"
                gradient="linear-gradient(135deg,#a78bfa,#7c3aed)"
                sub={latestSlip ? "Most recent slip" : "No slip on record yet"}
                loading={slipsLoading}
                onClick={() => setActiveTab("salary-slip")}
              />
            </div>
          </div>

          {/* Charts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-sky-400 to-blue-600" />
              <p className="text-[13px] font-black uppercase tracking-wider text-gray-600">
                This Month at a Glance
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
              {/* Attendance donut */}
              <div className="lg:col-span-2">
                <ChartPanel
                  title="Attendance Breakdown"
                  accent="#16a34a"
                  icon={<Target size={16} strokeWidth={2.5} />}
                >
                  {attendanceLoading ? (
                    <div className="h-[180px] flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full border-[6px] border-gray-100 border-t-green-500 animate-spin" />
                    </div>
                  ) : hasAttendanceData ? (
                    <div className="flex items-center gap-4">
                      <div style={{ width: 150, height: 170 }}>
                        <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <Pie
                              data={attendanceChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                            >
                              {attendanceChartData.map((entry, index) => (
                                <Cell
                                  key={`att-cell-${index}`}
                                  fill={entry.color}
                                  style={{ filter: `drop-shadow(0 4px 8px ${entry.color}60)` }}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: 12,
                                border: "1px solid #f0fdf4",
                                fontSize: 13,
                                fontWeight: 600,
                                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-3">
                        {attendanceChartData.map((d) => (
                          <div key={d.name} className="flex items-center justify-between text-[13px] group/row">
                            <span className="flex items-center gap-2 font-bold text-gray-700">
                              <span
                                className="w-3 h-3 rounded-full ring-2 ring-offset-1 transition-transform group-hover/row:scale-125"
                                style={{ background: d.color, boxShadow: `0 0 8px ${d.color}80` }}
                              />
                              {d.name}
                            </span>
                            <span className="font-black text-gray-900 text-[14px]">{d.value}</span>
                          </div>
                        ))}
                        <div className="pt-2.5 mt-2.5 border-t border-dashed border-gray-200 flex items-center justify-between">
                          <span className="font-black text-gray-500 uppercase tracking-wider text-[11px]">
                            Score
                          </span>
                          <span className="font-black text-[16px]" style={{ color: "#16a34a" }}>
                            {attendancePct}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[170px] flex flex-col items-center justify-center text-center text-gray-400">
                      <Clock size={28} className="mb-2 opacity-30" />
                      <p className="text-xs font-bold">No attendance records yet</p>
                    </div>
                  )}
                </ChartPanel>
              </div>

              {/* Leave bar chart */}
              <div className="lg:col-span-3">
                <ChartPanel
                  title="Leave Balances by Type"
                  accent="#0ea5e9"
                  icon={<CalendarCheck size={16} strokeWidth={2.5} />}
                >
                  {leaveLoading ? (
                    <div className="h-[180px] flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full border-[6px] border-gray-100 border-t-sky-500 animate-spin" />
                    </div>
                  ) : hasLeaveData ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={leaveChartData} barGap={6} margin={{ left: -12 }}>
                        <defs>
                          <linearGradient id="barAvailable" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0284c7" />
                          </linearGradient>
                          <linearGradient id="barUsed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#64748b", fontWeight: 700 }}
                          axisLine={{ stroke: "#f1f5f9" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e0f2fe",
                            fontSize: 13,
                            fontWeight: 600,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                          }}
                          cursor={{ fill: "#f8fafc" }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 8 }}
                          iconType="circle"
                        />
                        <Bar dataKey="available" name="Available" fill="url(#barAvailable)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="used" name="Used" fill="url(#barUsed)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[170px] flex flex-col items-center justify-center text-center text-gray-400">
                      <CalendarCheck size={28} className="mb-2 opacity-30" />
                      <p className="text-xs font-bold">No leave balance data available</p>
                    </div>
                  )}
                </ChartPanel>
              </div>
            </div>
          </div>

          {/* Modules — Equal size, bigger headings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-400 to-pink-600" />
              <p className="text-[13px] font-black uppercase tracking-wider text-gray-600">
                Access Your Modules
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr items-stretch">
              {essModules.map((item, idx) => {
                const meta = MODULE_META[item.to] ?? {
                  accent: "#22c55e",
                  accentLight: "#dcfce7",
                  gradient: "linear-gradient(135deg,#22c55e,#16a34a)",
                  glow: "rgba(34,197,94,0.35)",
                  description: "Open this module to get started.",
                  emoji: "🚀",
                };
                return (
                  <div
                    key={item.to}
                    className="animate-fade-in h-full"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <ModuleCard
                      label={item.label}
                      iconName={item.iconName}
                      description={meta.description}
                      meta={meta}
                      onClick={() => handleModuleClick(item.to)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};