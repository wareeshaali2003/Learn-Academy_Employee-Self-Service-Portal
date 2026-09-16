import React, { useState, useMemo } from "react";
import {
  BarChart2, Users, Calendar,
  Download, RefreshCw, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, AlertCircle, Printer, ArrowLeft,
} from "lucide-react";
import { useAdminReports } from "../hooks/Useadminreports";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function pctColor(pct: number): string {
  if (pct >= 80) return "#16a34a";
  if (pct >= 60) return "#d97706";
  return "#dc2626";
}

function pctBg(pct: number): string {
  if (pct >= 80) return "bg-green-50 text-green-700";
  if (pct >= 60) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-600";
}

function PctBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pctColor(pct) }}
        />
      </div>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pctBg(pct)}`}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Status badge (matches Leave Approvals page colors) ──────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open:      "bg-amber-50 text-amber-600",
    Approved:  "bg-green-50 text-green-700",
    Rejected:  "bg-red-50 text-red-600",
    Cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ─── Leave Balance Card ────────────────────────────────────────────────────────

function LeaveBalanceCard({ l }: { l: any }) {
  const usedPct = l.total_leaves_allocated > 0
    ? Math.round((l.total_leaves_taken / l.total_leaves_allocated) * 100)
    : 0;

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <span className="text-green-700 font-black text-sm">
          {l.employee_name?.charAt(0)?.toUpperCase() ?? "?"}
        </span>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-800 truncate">{l.employee_name}</p>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
            {l.leave_type}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {l.department || "—"} · {l.employee}
        </p>

        {/* Progress bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[160px]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(usedPct, 100)}%`,
                background: usedPct >= 90 ? "#dc2626" : usedPct >= 60 ? "#d97706" : "#16a34a",
              }}
            />
          </div>
          <span className="text-[10px] text-gray-400">{usedPct}% used</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Allocated</p>
          <p className="text-base font-black text-gray-700">{l.total_leaves_allocated}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Taken</p>
          <p className="text-base font-black text-amber-500">{l.total_leaves_taken}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Balance</p>
          <p className={`text-base font-black ${l.balance > 0 ? "text-green-600" : "text-red-500"}`}>
            {l.balance}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Leave Application Card (individual application row, any status) ─────

function LeaveApplicationCard({ a }: { a: any }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
        <span className="text-blue-600 font-black text-sm">
          {a.employee_name?.charAt(0)?.toUpperCase() ?? "?"}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-800 truncate">{a.employee_name}</p>
          <StatusBadge status={a.status} />
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {a.leave_type} · {a.total_leave_days} day(s) · {a.from_date}
          {a.to_date && a.to_date !== a.from_date ? ` → ${a.to_date}` : ""}
        </p>
        <p className="text-[10px] text-gray-300 mt-0.5">{a.name}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Dept</p>
        <p className="text-xs font-semibold text-gray-600">{a.department || "—"}</p>
      </div>
    </div>
  );
}

type ReportTab = "attendance" | "leave";
type LeaveStatusFilter = "all" | "Open" | "Approved" | "Rejected" | "Cancelled";

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminReportsPage({ onBack }: { onBack?: () => void }) {
  const { data, loading, error, month, year, changeMonth, refresh } = useAdminReports();
  const [tab, setTab] = useState<ReportTab>("attendance");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Which leave sub-view + status filter
  const [leaveView, setLeaveView] = useState<"balances" | "applications">("balances");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<LeaveStatusFilter>("all");

  // Month navigation
  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    changeMonth(d.getMonth() + 1, d.getFullYear());
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    const now = new Date();
    if (d <= now) changeMonth(d.getMonth() + 1, d.getFullYear());
  };
  const isCurrentMonth =
    month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  // Departments for filter
  const departments = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.employeeAttendance.forEach((e) => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [data]);

  // Filtered attendance
  const filteredAttendance = useMemo(() => {
    if (!data) return [];
    return data.employeeAttendance.filter((e) => {
      const matchSearch = !search || e.employee_name.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || e.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [data, search, deptFilter]);

  // Filtered leave balances
  const filteredLeave = useMemo(() => {
    if (!data) return [];
    return data.leaveBalances.filter((l) => {
      const matchSearch = !search || l.employee_name.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || l.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [data, search, deptFilter]);

  // Filtered leave applications (search + dept + status)
  const filteredApplications = useMemo(() => {
    if (!data) return [];
    return data.leaveApplications.filter((a) => {
      const matchSearch = !search || a.employee_name.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || a.department === deptFilter;
      const matchStatus = leaveStatusFilter === "all" || a.status === leaveStatusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [data, search, deptFilter, leaveStatusFilter]);

  // Status counts for the filter pills (based on dept/search filtered set, not status itself)
  const statusCounts = useMemo(() => {
    if (!data) return { all: 0, Open: 0, Approved: 0, Rejected: 0, Cancelled: 0 };
    const base = data.leaveApplications.filter((a) => {
      const matchSearch = !search || a.employee_name.toLowerCase().includes(search.toLowerCase());
      const matchDept = deptFilter === "all" || a.department === deptFilter;
      return matchSearch && matchDept;
    });
    return {
      all: base.length,
      Open: base.filter((a) => a.status === "Open").length,
      Approved: base.filter((a) => a.status === "Approved").length,
      Rejected: base.filter((a) => a.status === "Rejected").length,
      Cancelled: base.filter((a) => a.status === "Cancelled").length,
    };
  }, [data, search, deptFilter]);

  // Summary stats — attendance
  const summary = useMemo(() => {
    if (!data) return null;
    const att = data.employeeAttendance;
    const avgPct = att.length
      ? Math.round(att.reduce((s, e) => s + e.attendance_pct, 0) / att.length)
      : 0;
    const perfect = att.filter((e) => e.attendance_pct === 100).length;
    const low = att.filter((e) => e.attendance_pct < 60).length;
    return { avgPct, perfect, low, total: att.length };
  }, [data]);

  // Summary stats — leave (balances)
  const leaveSummary = useMemo(() => {
    if (!filteredLeave.length) return { allocated: 0, taken: 0, balance: 0, employees: 0 };
    const allocated = filteredLeave.reduce((s, l) => s + (l.total_leaves_allocated || 0), 0);
    const taken = filteredLeave.reduce((s, l) => s + (l.total_leaves_taken || 0), 0);
    const balance = filteredLeave.reduce((s, l) => s + (l.balance || 0), 0);
    const employees = new Set(filteredLeave.map((l) => l.employee)).size;
    return { allocated, taken, balance, employees };
  }, [filteredLeave]);

  // CSV export
  const exportCSV = () => {
    if (!data) return;
    let csv = "";
    if (tab === "attendance") {
      csv = "Employee,Department,Designation,Present,Absent,Late,Half Day,Total Days,Attendance %\n";
      filteredAttendance.forEach((e) => {
        csv += `"${e.employee_name}","${e.department ?? ""}","${e.designation ?? ""}",${e.present},${e.absent},${e.late},${e.half_day},${e.total_days},${e.attendance_pct}\n`;
      });
    } else {
      if (leaveView === "balances") {
        csv = "Employee,Department,Leave Type,Allocated,Taken,Balance\n";
        filteredLeave.forEach((l) => {
          csv += `"${l.employee_name}","${l.department ?? ""}","${l.leave_type}",${l.total_leaves_allocated},${l.total_leaves_taken},${l.balance}\n`;
        });
      } else {
        csv = "Employee,Department,Leave Type,Days,Status,From,To\n";
        filteredApplications.forEach((a) => {
          csv += `"${a.employee_name}","${a.department ?? ""}","${a.leave_type}",${a.total_leave_days},"${a.status}","${a.from_date}","${a.to_date}"\n`;
        });
      }
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${tab}-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print
  const printReport = () => {
    if (!data) return;
    const title =
      tab === "attendance" ? "Attendance Report" :
      (leaveView === "balances" ? "Leave Balances Report" : "Leave Applications Report");
    const periodLabel = `${MONTHS[month - 1]} ${year}`;
    let rowsHtml = "";
    let headHtml = "";

    if (tab === "attendance") {
      headHtml = "<tr><th>Employee</th><th>Department</th><th>Present</th><th>Absent</th><th>Late</th><th>Half Day</th><th>Attendance %</th></tr>";
      rowsHtml = filteredAttendance.map((e) => `
        <tr><td>${e.employee_name}</td><td>${e.department ?? "—"}</td><td>${e.present}</td><td>${e.absent}</td><td>${e.late}</td><td>${e.half_day}</td><td>${e.attendance_pct}%</td></tr>`).join("");
    } else {
      if (leaveView === "balances") {
        headHtml = "<tr><th>Employee</th><th>Department</th><th>Leave Type</th><th>Allocated</th><th>Taken</th><th>Balance</th></tr>";
        rowsHtml = filteredLeave.map((l) => `
          <tr><td>${l.employee_name}</td><td>${l.department ?? "—"}</td><td>${l.leave_type}</td><td>${l.total_leaves_allocated}</td><td>${l.total_leaves_taken}</td><td>${l.balance}</td></tr>`).join("");
      } else {
        headHtml = "<tr><th>Employee</th><th>Department</th><th>Leave Type</th><th>Days</th><th>Status</th><th>From</th><th>To</th></tr>";
        rowsHtml = filteredApplications.map((a) => `
          <tr><td>${a.employee_name}</td><td>${a.department ?? "—"}</td><td>${a.leave_type}</td><td>${a.total_leave_days}</td><td>${a.status}</td><td>${a.from_date}</td><td>${a.to_date}</td></tr>`).join("");
      }
    }

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<html><head><title>${title} — ${periodLabel}</title>
      <style>* { box-sizing: border-box; } body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #1f2937; }
      h1 { font-size: 18px; margin: 0 0 2px; } p.period { font-size: 12px; color: #6b7280; margin: 0 0 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { text-align: left; background: #f3f4f6; padding: 8px 10px; border-bottom: 2px solid #d1d5db; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
      td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) td { background: #fafafa; }
      footer { margin-top: 24px; font-size: 10px; color: #9ca3af; }</style></head>
      <body><h1>${title}</h1><p class="period">${periodLabel} · Generated ${new Date().toLocaleDateString()}</p>
      <table><thead>${headHtml}</thead><tbody>${rowsHtml || `<tr><td colspan="7" style="text-align:center;color:#9ca3af;">No records found</td></tr>`}</tbody></table>
      <footer>Learn School — HR Reports</footer></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => (onBack ? onBack() : window.history.back())}
        className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 text-gray-500 flex items-center justify-center transition-all flex-shrink-0"
      >
        <ArrowLeft size={18} />
      </button>
      <div>
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
          <BarChart2 size={20} className="text-green-600" />
          HR Reports
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Monthly attendance & leave balance analytics
        </p>
      </div>
    </div>

          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <div className="px-4 py-2 bg-green-50 rounded-lg border border-green-100 min-w-[130px] text-center">
              <p className="text-sm font-black text-green-700">{MONTHS[month - 1]} {year}</p>
            </div>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-40">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
            <button onClick={refresh} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <RefreshCw size={16} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={printReport} disabled={!data} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:border-green-400 hover:text-green-600 text-gray-600 text-xs font-bold rounded-lg transition-colors disabled:opacity-40">
              <Printer size={14} />
              Print
            </button>
            <button onClick={exportCSV} disabled={!data} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40">
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Cards: Attendance ── */}
      {summary && !loading && tab === "attendance" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Avg Attendance", value: `${summary.avgPct}%`, icon: <TrendingUp size={18} />, color: "#16a34a", sub: "This month" },
            { label: "Employees Tracked", value: summary.total, icon: <Users size={18} />, color: "#3b82f6", sub: "With records" },
            { label: "Perfect Attendance", value: summary.perfect, icon: <TrendingUp size={18} />, color: "#16a34a", sub: "100% present" },
            { label: "Low Attendance", value: summary.low, icon: <TrendingDown size={18} />, color: "#dc2626", sub: "Below 60%" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.color + "15" }}>
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{c.label}</p>
                <p className="text-xl font-black text-gray-800">{c.value}</p>
                <p className="text-[10px] text-gray-400">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary Cards: Leave (balances view only) ── */}
      {data && !loading && tab === "leave" && leaveView === "balances" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Employees", value: leaveSummary.employees, icon: <Users size={18} />, color: "#3b82f6", sub: "With leave records" },
            { label: "Total Allocated", value: leaveSummary.allocated, icon: <Calendar size={18} />, color: "#16a34a", sub: "Days allocated" },
            { label: "Total Taken", value: leaveSummary.taken, icon: <TrendingDown size={18} />, color: "#d97706", sub: "Days taken" },
            { label: "Total Balance", value: leaveSummary.balance, icon: <Minus size={18} />, color: leaveSummary.balance >= 0 ? "#16a34a" : "#dc2626", sub: "Days remaining" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.color + "15" }}>
                <span style={{ color: c.color }}>{c.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{c.label}</p>
                <p className="text-xl font-black text-gray-800">{c.value}</p>
                <p className="text-[10px] text-gray-400">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary Cards: Leave (applications view only) ── */}
      {data && !loading && tab === "leave" && leaveView === "applications" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { key: "all",       label: "Total",     value: statusCounts.all,       color: "#3b82f6" },
            { key: "Open",      label: "Open",      value: statusCounts.Open,      color: "#d97706" },
            { key: "Approved",  label: "Approved",  value: statusCounts.Approved,  color: "#16a34a" },
            { key: "Rejected",  label: "Rejected",  value: statusCounts.Rejected,  color: "#dc2626" },
            { key: "Cancelled", label: "Cancelled", value: statusCounts.Cancelled, color: "#6b7280" },
          ].map((c) => (
            <div key={c.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{c.label}</p>
              <p className="text-xl font-black mt-1" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {([
            { key: "attendance", label: "Attendance", icon: <Calendar size={14} /> },
            { key: "leave",      label: "Leave Balances", icon: <Users size={14} /> },
          ] as { key: ReportTab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSearch(""); }}
              className={`flex items-center gap-1.5 px-5 py-3.5 text-xs font-bold border-b-2 transition-colors ${
                tab === t.key
                  ? "border-green-500 text-green-700 bg-green-50/50"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Leave sub-view toggle (Balances vs Applications) */}
        {tab === "leave" && (
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <button
              onClick={() => setLeaveView("balances")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                leaveView === "balances" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Balances
            </button>
            <button
              onClick={() => setLeaveView("applications")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                leaveView === "applications" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Applications
            </button>

            {/* Status filter pills — only relevant in applications view */}
            {leaveView === "applications" && (
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200">
                {([
                  { key: "all", label: "All" },
                  { key: "Open", label: "Open" },
                  { key: "Approved", label: "Approved" },
                  { key: "Rejected", label: "Rejected" },
                  { key: "Cancelled", label: "Cancelled" },
                ] as { key: LeaveStatusFilter; label: string }[]).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setLeaveStatusFilter(s.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                      leaveStatusFilter === s.key
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    {s.label}
                    {s.key !== "all" && statusCounts[s.key as keyof typeof statusCounts] > 0 && (
                      <span className="ml-1">{statusCounts[s.key as keyof typeof statusCounts]}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-50 flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400"
          />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-green-400 bg-white"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">

          {/* Loading */}
          {loading && (
            <div className="p-10 text-center">
              <RefreshCw size={24} className="animate-spin text-green-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">Loading report data…</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-8 text-center">
              <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-500 font-medium">{error}</p>
              <button onClick={refresh} className="mt-3 text-xs font-bold text-green-600 underline">Retry</button>
            </div>
          )}

          {/* ── Attendance Table ── */}
          {!loading && !error && tab === "attendance" && (
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50/70">
                <tr>
                  {["Employee", "Department", "Present", "Absent", "Late", "Half Day", "Attendance"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAttendance.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No records found for this period.</td></tr>
                ) : filteredAttendance.map((e) => (
                  <tr key={e.employee} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-800">{e.employee_name}</p>
                      <p className="text-[10px] text-gray-400">{e.designation || e.employee}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{e.department || "—"}</td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-green-600">{e.present}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-red-500">{e.absent}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-amber-500">{e.late}</span></td>
                    <td className="px-4 py-3"><span className="text-sm font-bold text-blue-500">{e.half_day}</span></td>
                    <td className="px-4 py-3 min-w-[140px]"><PctBar pct={e.attendance_pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ── Leave Balances — Card Style ── */}
          {!loading && !error && tab === "leave" && leaveView === "balances" && (
            <div>
              {filteredLeave.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-400">No leave records found.</div>
              ) : (
                filteredLeave.map((l, i) => (
                  <LeaveBalanceCard key={`${l.employee}-${l.leave_type}-${i}`} l={l} />
                ))
              )}
            </div>
          )}

          {/* ── Leave Applications — Card Style (all statuses) ── */}
          {!loading && !error && tab === "leave" && leaveView === "applications" && (
            <div>
              {filteredApplications.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-400">No leave applications found.</div>
              ) : (
                filteredApplications.map((a) => (
                  <LeaveApplicationCard key={a.name} a={a} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer row count */}
        {!loading && data && (
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[10px] text-gray-400 font-medium">
              {tab === "attendance" && `${filteredAttendance.length} employee records · ${MONTHS[month - 1]} ${year}`}
              {tab === "leave" && leaveView === "balances" && `${filteredLeave.length} leave balance records`}
              {tab === "leave" && leaveView === "applications" && `${filteredApplications.length} leave applications`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}