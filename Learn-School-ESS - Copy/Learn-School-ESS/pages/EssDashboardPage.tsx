import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, CalendarCheck, FileText, BookOpen, ArrowUpRight,
  Sparkles, TrendingUp, TrendingDown, User, ArrowLeft, Minus,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { sidebarConfig, getIcon, isNavItemVisible } from "../config/layout.config";
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
  { description: string; accent: string; accentLight: string; gradient: string }
> = {
  "/attendance": {
    description: "View your monthly attendance log, check-in/out times, and score.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
  "/leave": {
    description: "Apply for leave, track applications, and check remaining balances.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
  "/salary-slip": {
    description: "Download payslips, review gross/net pay, and request official letters.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
  "/directory": {
    description: "Search colleagues by name, find contact details and department info.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
  "/todo": {
    description: "Manage your personal tasks and to-do lists efficiently.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
  "/calendar": {
    description: "View your schedule, upcoming events, and academic calendar.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
  "/profile": {
    description: "Update personal information, view employment details and documents.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
  "/faculty": {
    description: "Manage courses, take attendance, and assess student performance.",
    accent: "#16a34a", accentLight: "#dcfce7",
    gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)",
  },
};

const INLINE_ROUTES: Record<string, InlineTab> = {
  "/attendance":  "attendance",
  "/leave":       "leave",
  "/salary-slip": "salary-slip",
};

const TAB_LABELS: Record<InlineTab, string> = {
  "overview":    "Overview",
  "attendance":  "My Attendance",
  "leave":       "Leave Applications",
  "salary-slip": "Salary Slips",
};

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function slipNetPay(slip: any): number | null {
  return num(slip?.net_pay ?? slip?.netPay);
}

/* ── Stat card with trend + shadow polish ─────────────────────────────── */
function StatCard({ label, value, icon, color, sub, trend, onClick, loading }: {
  label: string; value: string | number;
  icon: React.ReactNode; color: string; sub?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  onClick?: () => void;
  loading?: boolean;
}) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend?.direction === "up" ? "#16a34a" : trend?.direction === "down" ? "#dc2626" : "#94a3b8";

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] p-5 flex flex-col gap-3 overflow-hidden hover:shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:-translate-y-1 transition-all duration-200 ${onClick ? "cursor-pointer" : ""}`}
    >
      <div
        className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between relative">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{ backgroundColor: color + "18", border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && !loading && (
          <span
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ color: trendColor, backgroundColor: trendColor + "15" }}
          >
            <TrendIcon size={11} /> {trend.label}
          </span>
        )}
      </div>
      <div className="min-w-0 relative">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{label}</p>
        {loading ? (
          <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse mt-1" />
        ) : (
          <p className="text-[26px] font-black text-gray-800 leading-tight mt-0.5">{value}</p>
        )}
        {sub && <p className="text-[10px] text-gray-400 font-medium mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function ModuleCard({ label, iconName, description, meta, onClick }: {
  label: string; iconName: string; description: string;
  meta: (typeof MODULE_META)[string]; onClick: () => void;
}) {
  const Icon = getIcon(iconName);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left bg-white border border-gray-100 rounded-2xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden hover:shadow-[0_14px_32px_rgba(15,23,42,0.14)] hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-300"
    >
      <div className="h-1.5 w-full" style={{ background: meta.accent }} />
      <div className="p-5">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-200"
          style={{ background: meta.gradient, border: `1.5px solid ${meta.accentLight}` }}
        >
          <Icon size={22} style={{ color: meta.accent }} />
        </div>
        <h3 className="font-black text-gray-800 text-sm mb-1.5 group-hover:text-green-700 transition-colors">{label}</h3>
        <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 mb-4">{description}</p>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl"
          style={{ background: meta.accentLight, color: meta.accent }}
        >
          Open Module
          <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </button>
  );
}

/* ── Reusable panel wrapper for charts ────────────────────────────────── */
function ChartPanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(15,23,42,0.06)] p-6 hover:shadow-[0_10px_30px_rgba(15,23,42,0.1)] transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        {action}
      </div>
      {children}
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
  const employeeName = String((employee as any)?.employee_name || "").trim() || propName || "Employee";

  // ── Pull live data from hooks ──────────────────────────────────────────────
  const now = new Date();
  const attendance = useAttendance(now.getFullYear(), now.getMonth() + 1);
  const { leaves, balances, loading: leaveLoading } = useLeave();
  const { slips, loading: slipsLoading } = useSalarySlip();

  const attendanceLoading = Boolean(attendance?.loading);
  const attStats = attendance?.stats ?? { present: 0, absent: 0, late: 0, totalDays: 0, percentage: 0 };

  const attendancePct = attendance?.stats?.percentage != null
    ? `${Math.round(Number(attendance.stats.percentage))}%`
    : propStats.attendanceScore != null
      ? `${propStats.attendanceScore}%`
      : "—";

  const safeBalances = useMemo(() =>
    Array.isArray(balances) ? balances : [], [balances]);

  const totalLeaveBalance = useMemo(() => {
    if (safeBalances.length === 0) return null;
    const total = safeBalances.reduce((acc: number, b: any) => {
      const avail = Number(b.available ?? b.balance ?? 0);
      return acc + (Number.isFinite(avail) ? avail : 0);
    }, 0);
    return total;
  }, [safeBalances]);

  const leaveBalance = totalLeaveBalance != null
    ? totalLeaveBalance
    : propStats.leaveBalance != null
      ? propStats.leaveBalance
      : "—";

  const safeLeaves = useMemo(() =>
    Array.isArray(leaves) ? leaves : [], [leaves]);

  const pendingCount = useMemo(() => {
    return safeLeaves.filter((l: any) => {
      const s = ((l.status || l.workflow_state || "")).toLowerCase();
      return s.includes("pending") || s.includes("open") || s.includes("applied");
    }).length;
  }, [safeLeaves]);

  const pendingLeaves = pendingCount > 0
    ? pendingCount
    : propStats.pendingLeaves != null
      ? propStats.pendingLeaves
      : (leaveLoading ? "—" : 0);

  // ── Net Pay: now wired to the real salary-slip hook (was always "—") ──────
  const safeSlips = useMemo(() => (Array.isArray(slips) ? slips : []), [slips]);
  const latestSlip = safeSlips[0];
  const latestNetPayNum = latestSlip ? slipNetPay(latestSlip) : null;

  const netPay = latestNetPayNum != null
    ? latestNetPayNum.toLocaleString()
    : propStats.latestNetPay != null
      ? (typeof propStats.latestNetPay === "number"
          ? propStats.latestNetPay.toLocaleString()
          : propStats.latestNetPay)
      : (slipsLoading ? "—" : "No slips");

  // ── Chart data ──────────────────────────────────────────────────────────
  const attendanceChartData = useMemo(() => {
    const data = [
      { name: "Present", value: attStats.present, color: "#16a34a" },
      { name: "Absent", value: attStats.absent, color: "#dc2626" },
      { name: "Late", value: attStats.late, color: "#f59e0b" },
    ];
    return data.filter(d => d.value > 0);
  }, [attStats]);

  const hasAttendanceData = attendanceChartData.length > 0;

  const leaveChartData = useMemo(() => {
    return safeBalances.map((b: any) => ({
      name: (b.type || "Leave").replace(/\s*Leave\s*$/i, "").trim() || b.type,
      used: Number(b.used ?? 0),
      available: Number(b.available ?? b.balance ?? 0),
    }));
  }, [safeBalances]);

  const hasLeaveData = leaveChartData.length > 0;

  // ── ESS modules from sidebarConfig children ───────────────────────────────
  const essModules = useMemo(() => {
    const essItem = sidebarConfig.find(item => item.to === '/ess');
    return essItem?.children || [];
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = employeeName.split(" ")[0] || "there";

  const handleModuleClick = (to: string) => {
    const inlineTab = INLINE_ROUTES[to];
    if (inlineTab) setActiveTab(inlineTab);
    else navigate(to);
  };

  const isInlinePage = activeTab !== "overview";

  const attendanceTrendDirection: "up" | "down" | "flat" =
    attStats.percentage >= 75 ? "up" : attStats.percentage >= 50 ? "flat" : "down";

  const attendanceTrend = attStats.totalDays > 0
    ? { direction: attendanceTrendDirection,
        label: attStats.percentage >= 75 ? "On track" : attStats.percentage >= 50 ? "Watch" : "Low" }
    : undefined;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero banner (only on overview) ── */}
      {!isInlinePage && (
        <div
          className="relative rounded-2xl overflow-hidden px-7 py-7 text-white shadow-[0_12px_36px_rgba(22,163,74,0.28)]"
          style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)" }}
        >
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute right-20 bottom-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <BookOpen size={100} strokeWidth={1} />
          </div>

          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="opacity-70" />
                <span className="text-xs font-semibold opacity-70 uppercase tracking-widest">Employee Self Service</span>
              </div>
              <h1 className="text-2xl font-black leading-snug">{greeting}, {firstName}! 👋</h1>
              <p className="text-sm text-white/70 mt-1 font-medium">
                {designation ? `${designation} · ` : ""}
                Manage attendance, leaves, payroll and more.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm px-4 py-3 rounded-2xl border border-white/20 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center">
                <User size={17} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-white leading-none">{employeeName}</p>
                <p className="text-[10px] text-white/70 font-medium mt-0.5">{designation || "Employee"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Back button (shown when inline page is open) ── */}
      {isInlinePage && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-600 rounded-xl text-sm font-bold transition-all group shadow-sm"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <p className="text-sm font-bold text-gray-500">{TAB_LABELS[activeTab]}</p>
        </div>
      )}

      {/* ── Inline pages ── */}
      {activeTab === "attendance"  && <AttendancePage  onBack={() => setActiveTab("overview")} />}
      {activeTab === "leave"       && <LeavePage        onBack={() => setActiveTab("overview")} />}
      {activeTab === "salary-slip" && <SalarySlipPage   onBack={() => setActiveTab("overview")} />}

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Quick Overview</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Attendance Score"
                value={attendancePct}
                icon={<Clock size={20} />}
                color="#16a34a"
                sub={attStats.totalDays ? `${attStats.present}/${attStats.totalDays} days present` : "This month"}
                trend={attendanceTrend}
                loading={attendanceLoading}
                onClick={() => setActiveTab("attendance")}
              />
              <StatCard
                label="Leave Balance"
                value={leaveBalance}
                icon={<CalendarCheck size={20} />}
                color="#0ea5e9"
                sub="Days remaining"
                loading={leaveLoading}
                onClick={() => setActiveTab("leave")}
              />
              <StatCard
                label="Pending Leaves"
                value={pendingLeaves}
                icon={<TrendingUp size={20} />}
                color="#f59e0b"
                sub="Awaiting approval"
                loading={leaveLoading}
                onClick={() => setActiveTab("leave")}
              />
              <StatCard
                label="Latest Net Pay"
                value={netPay}
                icon={<FileText size={20} />}
                color="#8b5cf6"
                sub={latestSlip ? "Most recent slip" : "No slip on record yet"}
                loading={slipsLoading}
                onClick={() => setActiveTab("salary-slip")}
              />
            </div>
          </div>

          {/* ── Charts ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">This Month at a Glance</p>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

              {/* Attendance donut */}
              <div className="lg:col-span-2">
                <ChartPanel title="Attendance Breakdown">
                  {attendanceLoading ? (
                    <div className="h-[180px] flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full border-8 border-gray-100 border-t-green-400 animate-spin" />
                    </div>
                  ) : hasAttendanceData ? (
                    <div className="flex items-center gap-4">
                      <div style={{ width: 150, height: 170 }}>
                        <ResponsiveContainer width="100%" height={170}>
                          <PieChart>
                            <Pie
                              data={attendanceChartData}
                              cx="50%" cy="50%"
                              innerRadius={48} outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {attendanceChartData.map((entry, index) => (
                                <Cell key={`att-cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0fdf4", fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2.5">
                        {attendanceChartData.map((d) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 font-semibold text-gray-600">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                              {d.name}
                            </span>
                            <span className="font-black text-gray-800">{d.value}</span>
                          </div>
                        ))}
                        <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-400">Score</span>
                          <span className="font-black" style={{ color: "#16a34a" }}>{attendancePct}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[170px] flex flex-col items-center justify-center text-center text-gray-400">
                      <Clock size={26} className="mb-2 opacity-40" />
                      <p className="text-xs font-semibold">No attendance records yet this month</p>
                    </div>
                  )}
                </ChartPanel>
              </div>

              {/* Leave balances bar chart */}
              <div className="lg:col-span-3">
                <ChartPanel title="Leave Balances by Type">
                  {leaveLoading ? (
                    <div className="h-[180px] flex items-center justify-center">
                      <div className="w-28 h-28 rounded-full border-8 border-gray-100 border-t-sky-400 animate-spin" />
                    </div>
                  ) : hasLeaveData ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={leaveChartData} barGap={6} margin={{ left: -12 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                          axisLine={{ stroke: "#f1f5f9" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #f0fdf4", fontSize: 12 }}
                          cursor={{ fill: "#f8fafc" }}
                        />
                        <Bar dataKey="available" name="Available" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="used" name="Used" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[170px] flex flex-col items-center justify-center text-center text-gray-400">
                      <CalendarCheck size={26} className="mb-2 opacity-40" />
                      <p className="text-xs font-semibold">No leave balance data available</p>
                    </div>
                  )}
                </ChartPanel>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Access Your Modules</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {essModules.map((item) => {
                const meta = MODULE_META[item.to] ?? {
                  accent: "#22c55e", accentLight: "#dcfce7",
                  gradient: "linear-gradient(135deg,#f0fdf4,#dcfce7)",
                  description: "Open this module to get started.",
                };
                return (
                  <ModuleCard
                    key={item.to}
                    label={item.label}
                    iconName={item.iconName}
                    description={meta.description}
                    meta={meta}
                    onClick={() => handleModuleClick(item.to)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};