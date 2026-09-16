import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users, CalendarCheck, Clock,
  ArrowUpRight, ShieldCheck, TrendingUp,
  UserCheck, UserX, RefreshCw, Banknote,
  GraduationCap, ReceiptText, Briefcase, Wallet,
} from "lucide-react";
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAdmin } from "../hooks/Useadmin";
import { AdminChartsSection } from "./Adminchartssection";

// ─── Sub-page imports ──────────────────────────────────────────────────────────
import { AdminEmployeesPage }    from "./Adminemp";
import { AdminLeaveApprovalPage } from "./Adminleaveapprovalpage";
import Adminattendancepage       from "./Adminattdenpage";
// import AdminDepartmentPage       from "./Admindepartmentpage";
import { AdminReportsPage }      from "./Adminreportspage";
import { AdminSalarySlipPage }   from "./Adminsalaryslippage";
import AdminStudentGroupsPage    from "./Adminstudentgroupspage";
import AdminRevenuePage          from "./Adminrevenuepage";

import AdminStudentAttendancePage from "./AdminStudentAttendancePage";

const AdminAttendancePage = Adminattendancepage as React.ComponentType<{ onBack: () => void }>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminDashboardPageProps {
  designation?: string;
  employeeName?: string;
}

type InlineTab =
  | "overview"
  | "employees"
  | "leave"
  | "attendance"
  | "student-attendance"
  // | "departments"
  | "student-groups"
  | "reports"
  | "salary-slips"
  | "revenue"

const INLINE_ROUTES: Partial<Record<string, InlineTab>> = {
  "/admin/employees":          "employees",
  "/admin/leave":              "leave",
  "/admin/attendance":         "attendance",
  "/admin/student-attendance": "student-attendance",
  // "/admin/departments":        "departments",
  "/admin/student-groups":     "student-groups",
  "/admin/reports":            "reports",
  "/admin/salary-slips":       "salary-slips",
  "/admin/revenue":            "revenue",
};

const TAB_LABELS: Record<InlineTab, string> = {
  overview:    "Overview",
  employees:   "Employees",
  leave:       "Leave Approvals",
  attendance:  "Attendance",
  "student-attendance": "Student Attendance",
  // departments: "Departments",
  "student-groups": "Student Groups",
  reports:     "Reports",
  "salary-slips": "Salary Slips",
  revenue:     "Total Revenue",
};

// Recent Leave avatars ke liye consistent color-per-person palette (naam ke hash se)
const AVATAR_PALETTE = ["#6366f1", "#f43f5e", "#f59e0b", "#0d9488", "#8b5cf6", "#0ea5e9"];
const colorForName = (name: string) => {
  const sum = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
};

// Hero ke quick-action buttons ko icon dene ke liye chota mapping
const QUICK_ACTION_ICONS: Partial<Record<InlineTab, React.ReactNode>> = {
  leave: <CalendarCheck size={13} />,
  attendance: <Clock size={13} />,
  "student-attendance": <GraduationCap size={13} />,
  reports: <TrendingUp size={13} />,
  revenue: <Banknote size={13} />,
};

// Threshold ke hisab se color — 80%+ hara, 60%+ amber, warna red
const pctColor = (pct: number, goodColor = "#16a34a") =>
  pct >= 80 ? goodColor : pct >= 60 ? "#d97706" : "#dc2626";

// ─── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, color, action }: {
  icon: React.ReactNode; title: string; color: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: color + "18", color }}>
          {icon}
        </span>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">{title}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-[10px] font-bold text-green-600 hover:text-green-800 flex items-center gap-1"
        >
          {action.label} <ArrowUpRight size={10} />
        </button>
      )}
    </div>
  );
}

// ─── GaugeChart & DonutChart ────────────────────────────────────────────────────
// NAYE chota reusable chart components — expandable stat card ke andar dikhne
// ke liye. GaugeChart ek single percentage ke liye (circular progress ring),
// DonutChart do connected values ka composition dikhane ke liye (jaise
// Active vs Inactive, ya Collected vs Outstanding).

function GaugeChart({ pct, color }: { pct: number; color: string }) {
  const safePct = Math.max(0, Math.min(100, pct || 0));
  const data = [{ name: "pct", value: safePct, fill: color }];
  return (
    <div className="relative h-40">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "#f3f4f6" }} dataKey="value" cornerRadius={30} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-black" style={{ color }}>{safePct}%</span>
      </div>
    </div>
  );
}

function DonutChart({ segments }: { segments: { name: string; value: number; color: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={segments} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3} strokeWidth={0}>
            {segments.map((s) => <Cell key={s.name} fill={s.color} />)}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) => [v.toLocaleString(), n]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-gray-500">
        {segments.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            {s.name}: <span className="font-bold text-gray-700">{s.value.toLocaleString()}</span>
          </span>
        ))}
      </div>
      {total === 0 && <p className="text-center text-[11px] text-gray-300 mt-1">No data yet</p>}
    </div>
  );
}

// ─── ExpandableStatGroup ────────────────────────────────────────────────────────
// NAYA: Faculty Dashboard wali interaction — jis card pe click karo wo left
// side bara ho jata hai (number ki jagah uska chart dikhata hai), baaki cards
// chote hoke right/neeche chale jate hain.

type ExpandableCard = {
  key: string;
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  badge?: { text: string; color: string };
  onClick?: () => void;
  renderChart: () => React.ReactNode;
};

function ExpandableStatGroup({ cards, loading }: { cards: ExpandableCard[]; loading?: boolean }) {
  const [selectedKey, setSelectedKey] = useState(cards[0]?.key);
  const selected = cards.find((c) => c.key === selectedKey) ?? cards[0];
  const others = cards.filter((c) => c.key !== selected.key);

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Expanded card — bara, chart ke sath */}
      <div key={selected.key} className="lg:w-[55%] relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-1">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{selected.label}</p>
            {loading
              ? <div className="h-7 w-16 bg-gray-100 rounded-lg animate-pulse mt-0.5" />
              : <p className="text-2xl font-black text-gray-800 leading-tight mt-0.5">{selected.value}</p>
            }
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {selected.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: selected.badge.color + "18", color: selected.badge.color }}>
                {selected.badge.text}
              </span>
            )}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selected.color + "18" }}>
              <span style={{ color: selected.color }}>{selected.icon}</span>
            </div>
          </div>
        </div>
        {selected.sub && <p className="text-[10px] text-gray-400 mb-2">{selected.sub}</p>}

        {loading
          ? <div className="h-40 flex items-center justify-center text-xs text-gray-400">Loading…</div>
          : selected.renderChart()
        }

        {selected.onClick && (
          <button type="button" onClick={selected.onClick}
            className="mt-2 text-[11px] font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
            View details <ArrowUpRight size={11} />
          </button>
        )}

        <div className="absolute bottom-0 left-0 h-1 w-full opacity-70" style={{ backgroundColor: selected.color }} />
      </div>

      {/* Baaki cards — compact, click karke expand karein */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:w-[45%] gap-3">
        {others.map((c) => (
          <button key={c.key} type="button" onClick={() => setSelectedKey(c.key)}
            className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" style={{ backgroundColor: c.color + "18" }}>
              <span style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{c.label}</p>
              {loading
                ? <div className="h-6 w-14 bg-gray-100 rounded animate-pulse mt-0.5" />
                : <p className="text-xl font-black text-gray-800 leading-tight">{c.value}</p>
              }
            </div>
            {c.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0" style={{ background: c.badge.color + "18", color: c.badge.color }}>
                {c.badge.text}
              </span>
            )}
            <div className="absolute bottom-0 left-0 h-1 w-2/3 rounded-full opacity-70 group-hover:opacity-100 group-hover:w-full transition-all duration-500" style={{ backgroundColor: c.color }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── RecentLeaveTable ─────────────────────────────────────────────────────────

function RecentLeaveTable({ leaves, onViewAll }: { leaves: any[]; onViewAll: () => void }) {
  const recent = leaves.slice(0, 6);
  if (recent.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <CalendarCheck size={24} className="text-gray-200 mx-auto mb-2" />
      <p className="text-xs text-gray-400">No recent leave applications</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-50">
        {recent.map((l) => {
          const s = (l.status || l.workflow_state || "").toLowerCase();
          const isPending  = s.includes("open") || s.includes("pending") || s.includes("applied");
          const isApproved = s.includes("approved");
          const isRejected = s.includes("rejected") || s.includes("declined");
          const name = l.employee_name || l.employee || "?";
          const avatarColor = colorForName(name);
          return (
            <div key={l.name} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors">
              <div className="min-w-0 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatarColor + "20" }}>
                  <span className="text-[10px] font-black" style={{ color: avatarColor }}>
                    {name[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{name}</p>
                  <p className="text-[10px] text-gray-400">{l.leave_type} · {l.total_leave_days ?? "?"} day(s)</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${
                isPending  ? "bg-amber-50 text-amber-600"
                : isApproved ? "bg-green-50 text-green-600"
                : isRejected ? "bg-red-50 text-red-500"
                : "bg-gray-100 text-gray-500"
              }`}>
                {isPending ? "Pending" : isApproved ? "Approved" : isRejected ? "Rejected" : l.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── QuickStat strip ──────────────────────────────────────────────────────────
function QuickStrip({ stats, loading, onDept, onLeave }: {
  stats: any; loading: boolean; onDept: () => void; onLeave: () => void;
}) {
  const items = [
    { label: "Departments", value: stats.totalDepartments, color: "#f59e0b", onClick: onDept },
    { label: "Pending Leaves", value: stats.pendingLeaves, color: "#3b82f6", onClick: onLeave },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className="relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{item.label}</p>
          {loading
            ? <div className="h-6 w-10 bg-gray-100 rounded animate-pulse" />
            : <p className="text-xl font-black" style={{ color: item.color }}>{item.value || "—"}</p>
          }
          <div
            className="absolute bottom-0 left-0 h-1 w-2/3 rounded-full opacity-70 group-hover:opacity-100 group-hover:w-full transition-all duration-500"
            style={{ backgroundColor: item.color }}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  designation = "",
  employeeName = "Admin",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = useMemo((): InlineTab => {
    return (INLINE_ROUTES[location.pathname] as InlineTab) ?? "overview";
  }, [location.pathname]);

  const setActiveTab = (tab: InlineTab) => {
    const route = Object.entries(INLINE_ROUTES).find(([, v]) => v === tab)?.[0];
    navigate(route ?? "/admin");
  };

  const {
    stats,
    leaveApps,
    loading,
    refresh,
    departmentHeadcount,
    weeklyAttendanceTrend,
    feesStatusBreakdown,
  } = useAdmin();

  const isInlinePage = activeTab !== "overview";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = employeeName.split(" ")[0] || "Admin";

  const quickActions: { label: string; tab: InlineTab }[] = [
    { label: "Review Leaves", tab: "leave" },
    { label: "View Attendance", tab: "attendance" },
    { label: "Student Attendance", tab: "student-attendance" },
    { label: "Reports", tab: "reports" },
    { label: "Total Revenue", tab: "revenue" },
  ];

  // ── Card configs — har ek apna renderChart() bhi carry karta hai ──
  const employeePct = stats.totalEmployees > 0 ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) : 0;
  const employeeCards: ExpandableCard[] = [
    {
      key: "emp-total", label: "Total Employees", value: stats.totalEmployees || "—",
      icon: <Users size={19} />, color: "#16a34a", sub: "All records",
      onClick: () => setActiveTab("employees"),
      renderChart: () => (
        <DonutChart segments={[
          { name: "Active", value: stats.activeEmployees || 0, color: "#16a34a" },
          { name: "Inactive", value: Math.max((stats.totalEmployees || 0) - (stats.activeEmployees || 0), 0), color: "#e5e7eb" },
        ]} />
      ),
    },
    {
      key: "emp-active", label: "Active", value: stats.activeEmployees || "—",
      icon: <UserCheck size={19} />, color: "#16a34a", sub: "Currently active",
      badge: stats.totalEmployees > 0 ? { text: `${employeePct}%`, color: "#16a34a" } : undefined,
      onClick: () => setActiveTab("employees"),
      renderChart: () => <GaugeChart pct={employeePct} color="#16a34a" />,
    },
    {
      key: "emp-attendance", label: "Monthly Attendance Avg",
      value: stats.monthlyAttendancePct != null ? `${stats.monthlyAttendancePct}%` : "—",
      icon: <TrendingUp size={19} />, color: "#8b5cf6",
      sub: stats.monthlyTotalCount > 0 ? `${stats.monthlyPresentCount}/${stats.monthlyTotalCount} present days` : "No records this month",
      onClick: () => setActiveTab("attendance"),
      renderChart: () => <GaugeChart pct={stats.monthlyAttendancePct ?? 0} color={pctColor(stats.monthlyAttendancePct ?? 0, "#16a34a")} />,
    },
  ];

  const studentPct = stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0;
  const studentCards: ExpandableCard[] = [
    {
      key: "stu-total", label: "Total Students", value: stats.totalStudents || "—",
      icon: <GraduationCap size={19} />, color: "#3b82f6", sub: "All records",
      onClick: () => setActiveTab("student-groups"),
      renderChart: () => (
        <DonutChart segments={[
          { name: "Active", value: stats.activeStudents || 0, color: "#3b82f6" },
          { name: "Inactive", value: Math.max((stats.totalStudents || 0) - (stats.activeStudents || 0), 0), color: "#e5e7eb" },
        ]} />
      ),
    },
    {
      key: "stu-active", label: "Active Students", value: stats.activeStudents || "—",
      icon: <UserCheck size={19} />, color: "#3b82f6", sub: "Currently enrolled",
      badge: stats.totalStudents > 0 ? { text: `${studentPct}%`, color: "#3b82f6" } : undefined,
      onClick: () => setActiveTab("student-groups"),
      renderChart: () => <GaugeChart pct={studentPct} color="#3b82f6" />,
    },
    {
      key: "stu-attendance", label: "Monthly Attendance Avg",
      value: stats.monthlyStudentAttendancePct != null ? `${stats.monthlyStudentAttendancePct}%` : "—",
      icon: <TrendingUp size={19} />, color: "#8b5cf6",
      sub: stats.monthlyStudentTotalCount > 0 ? `${stats.monthlyStudentPresentCount}/${stats.monthlyStudentTotalCount} present days` : "No records this month",
      onClick: () => setActiveTab("student-attendance"),
      renderChart: () => <GaugeChart pct={stats.monthlyStudentAttendancePct ?? 0} color={pctColor(stats.monthlyStudentAttendancePct ?? 0, "#3b82f6")} />,
    },
  ];

  const feesDonutSegments = [
    { name: "Collected", value: loading ? 0 : stats.totalFeesCollected, color: "#16a34a" },
    { name: "Outstanding", value: loading ? 0 : stats.totalFeesOutstanding, color: "#ef4444" },
  ];
  const feeCards: ExpandableCard[] = [
    {
      key: "fee-invoices", label: "Total Invoices", value: stats.totalFeesInvoices || "—",
      icon: <ReceiptText size={19} />, color: "#f59e0b", sub: "All fee records",
      onClick: () => setActiveTab("revenue"),
      renderChart: () => <DonutChart segments={feesDonutSegments} />,
    },
    {
      key: "fee-amount", label: "Total Amount", value: loading ? "—" : stats.totalFeesAmount.toLocaleString(),
      icon: <Banknote size={19} />, color: "#f59e0b", sub: "Billed to date",
      onClick: () => setActiveTab("revenue"),
      renderChart: () => <DonutChart segments={feesDonutSegments} />,
    },
    {
      key: "fee-collected", label: "Collected", value: loading ? "—" : stats.totalFeesCollected.toLocaleString(),
      icon: <TrendingUp size={19} />, color: "#16a34a", sub: "Payments received",
      badge: stats.feesCollectionPct != null ? { text: `${stats.feesCollectionPct}%`, color: "#16a34a" } : undefined,
      onClick: () => setActiveTab("revenue"),
      renderChart: () => <GaugeChart pct={stats.feesCollectionPct ?? 0} color="#16a34a" />,
    },
    {
      key: "fee-outstanding", label: "Outstanding", value: loading ? "—" : stats.totalFeesOutstanding.toLocaleString(),
      icon: <UserX size={19} />, color: "#ef4444", sub: "Yet to be collected",
      onClick: () => setActiveTab("revenue"),
      renderChart: () => <DonutChart segments={feesDonutSegments} />,
    },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── Hero ── */}
      {!isInlinePage && (
        <div
          className="relative rounded-2xl overflow-hidden px-6 py-6 text-white"
          style={{ background: "linear-gradient(135deg,#15803d 0%,#16a34a 55%,#0d9488 100%)" }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
          />
          {/* Decorative blobs — depth ke liye */}
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-0 right-32 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
            <ShieldCheck size={110} strokeWidth={1} />
          </div>

          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck size={13} className="opacity-70" />
                <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Admin Control Panel</span>
              </div>
              <h1 className="text-2xl font-black leading-snug">{greeting}, {firstName}!</h1>
              <p className="text-sm text-white/70 mt-1">
                {designation ? `${designation} · ` : ""}
                You have{" "}
                <span className="font-bold text-white">
                  {loading ? "…" : stats.pendingLeaves}
                </span>{" "}
                pending leave{stats.pendingLeaves !== 1 ? "s" : ""} to review.
              </p>

              <div className="flex flex-wrap gap-2 mt-4">
                {quickActions.map((a) => (
                  <button
                    key={a.tab}
                    type="button"
                    onClick={() => setActiveTab(a.tab)}
                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 border border-white/20 transition-all"
                  >
                    {QUICK_ACTION_ICONS[a.tab]}
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-xl border border-white/20 text-xs font-bold transition-all"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <div className="flex items-center gap-2.5 bg-white/15 px-3.5 py-2.5 rounded-2xl border border-white/20">
                <div className="w-8 h-8 rounded-xl bg-white/25 flex items-center justify-center">
                  <span className="text-sm font-black">{firstName[0]}</span>
                </div>
                <div>
                  <p className="text-xs font-black leading-none">{employeeName}</p>
                  <p className="text-[10px] text-white/70 mt-0.5">{designation || "Administrator"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inline sub-pages ── */}
      {activeTab === "employees"           && <AdminEmployeesPage    onBack={() => setActiveTab("overview")} />}
      {activeTab === "attendance"          && <AdminAttendancePage   onBack={() => setActiveTab("overview")} />}
      {activeTab === "student-attendance"  && <AdminStudentAttendancePage />}
      {activeTab === "leave"               && <AdminLeaveApprovalPage onBack={() => setActiveTab("overview")} />}
      {/* {activeTab === "departments"         && <AdminDepartmentPage />} */}
      {activeTab === "student-groups"      && <AdminStudentGroupsPage />}
      {activeTab === "reports"             && <AdminReportsPage      onBack={() => setActiveTab("overview")} />}
      {activeTab === "salary-slips"        && <AdminSalarySlipPage   onBack={() => setActiveTab("overview")} />}
      {activeTab === "revenue"             && <AdminRevenuePage />}

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-7">

          {/* ═══ Employees section ═══ */}
          <div>
            <SectionHeader
              icon={<Briefcase size={13} />}
              title="Employees"
              color="#16a34a"
              action={{ label: "View All", onClick: () => setActiveTab("employees") }}
            />
            <ExpandableStatGroup cards={employeeCards} loading={loading} />
          </div>

          {/* ═══ Students section ═══ */}
          <div>
            <SectionHeader
              icon={<GraduationCap size={13} />}
              title="Students"
              color="#3b82f6"
              action={{ label: "View Attendance", onClick: () => setActiveTab("student-attendance") }}
            />
            <ExpandableStatGroup cards={studentCards} loading={loading} />
          </div>

          {/* ═══ Fees & Invoices section ═══ */}
          <div>
            <SectionHeader
              icon={<Wallet size={13} />}
              title="Fees & Invoices"
              color="#f59e0b"
              action={{ label: "View Revenue", onClick: () => setActiveTab("revenue") }}
            />
            <ExpandableStatGroup cards={feeCards} loading={loading} />
          </div>

          {/* ═══ Charts & graphs ═══ */}
          {!loading && (
            <div>
              <SectionHeader icon={<TrendingUp size={13} />} title="Trends & Breakdown" color="#8b5cf6" />
              <AdminChartsSection
                weeklyAttendanceTrend={weeklyAttendanceTrend}
                departmentHeadcount={departmentHeadcount}
                feesStatusBreakdown={feesStatusBreakdown}
                totalFeesCollected={stats.totalFeesCollected}
                totalFeesOutstanding={stats.totalFeesOutstanding}
              />
            </div>
          )}

          {/* ═══ Recent Activity ═══ */}
          <div>
            <SectionHeader
              icon={<CalendarCheck size={13} />}
              title="Recent Leave Activity"
              color="#16a34a"
              action={{ label: "View All", onClick: () => setActiveTab("leave") }}
            />
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <RecentLeaveTable leaves={leaveApps} onViewAll={() => setActiveTab("leave")} />
            )}
          </div>

        </div>
      )}
    </div>
  );
};