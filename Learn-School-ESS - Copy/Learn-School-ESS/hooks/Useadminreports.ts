import { useState, useCallback } from "react";

export interface EmployeeAttendanceSummary {
  employee: string;
  employee_name: string;
  department?: string;
  designation?: string;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  total_days: number;
  attendance_pct: number;
}

export interface LeaveBalanceSummary {
  employee: string;
  employee_name: string;
  department?: string;
  leave_type: string;
  total_leaves_allocated: number;
  total_leaves_taken: number;
  balance: number;
}

// ─── NEW: individual leave application row (all statuses) ─────────────────────
export interface LeaveApplicationSummary {
  name: string;
  employee: string;
  employee_name: string;
  department?: string;
  leave_type: string;
  total_leave_days: number;
  status: string;
  from_date: string;
  to_date: string;
}

export interface DepartmentAttendanceSummary {
  department: string;
  total_employees: number;
  present: number;
  absent: number;
  attendance_pct: number;
}

export interface ReportsData {
  employeeAttendance: EmployeeAttendanceSummary[];
  leaveBalances: LeaveBalanceSummary[];
  leaveApplications: LeaveApplicationSummary[]; // NEW
  departmentAttendance: DepartmentAttendanceSummary[];
  month: number;
  year: number;
}

export function useAdminReports() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pad = (n: number) => String(n).padStart(2, "0");

  const load = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError(null);

    try {
      const startDate = `${y}-${pad(m)}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const endDate = `${y}-${pad(m)}-${pad(lastDay)}`;

      // ── 1. Attendance for selected month ──────────────────────────────────
      const attRes = await fetch(
        `/api/resource/Attendance?fields=["employee","employee_name","department","status","attendance_date"]` +
        `&filters=[["attendance_date",">=","${startDate}"],["attendance_date","<=","${endDate}"]]` +
        `&limit_page_length=5000`,
        { headers: { "Content-Type": "application/json" } }
      );
      const attRows: any[] = (attRes.ok ? await attRes.json() : { data: [] }).data ?? [];

      // ── 2. Active employees ────────────────────────────────────────────────
      const empRes = await fetch(
        `/api/resource/Employee?fields=["name","employee_name","department","designation","status"]` +
        `&filters=[["status","=","Active"]]&limit_page_length=500`,
        { headers: { "Content-Type": "application/json" } }
      );
      const empRows: any[] = (empRes.ok ? await empRes.json() : { data: [] }).data ?? [];

      // ── 3. Leave allocations — valid within selected year ─────────────────
      // Leave allocations are ANNUAL. Filter: docstatus=1, overlaps with year.
      const yearStart = `${y}-01-01`;
      const yearEnd   = `${y}-12-31`;

      const leaveAllocRes = await fetch(
        `/api/resource/Leave Allocation` +
        `?fields=["employee","employee_name","department","leave_type","total_leaves_allocated","new_leaves_allocated","from_date","to_date"]` +
        `&filters=[["docstatus","=","1"],["from_date","<=","${yearEnd}"],["to_date",">=","${yearStart}"]]` +
        `&limit_page_length=2000`,
        { headers: { "Content-Type": "application/json" } }
      );
      const leaveAllocRows: any[] = (leaveAllocRes.ok ? await leaveAllocRes.json() : { data: [] }).data ?? [];
      if (!leaveAllocRes.ok) {
        console.error("Leave Allocation fetch failed:", leaveAllocRes.status);
      }

      // ── 4. ALL leave applications for the full year (every status) ────────
      // Previously this only fetched status="Approved". Now we fetch everything
      // (Open / Approved / Rejected / Cancelled) so the Reports page can show
      // the same full list that the Leave Approvals page shows.
      const leaveAllRes = await fetch(
        `/api/resource/Leave Application` +
        `?fields=["name","employee","employee_name","department","leave_type","total_leave_days","status","from_date","to_date"]` +
        `&filters=[["from_date",">=","${yearStart}"],["to_date","<=","${yearEnd}"]]` +
        `&limit_page_length=2000`,
        { headers: { "Content-Type": "application/json" } }
      );
      const leaveAllRows: any[] = (leaveAllRes.ok ? await leaveAllRes.json() : { data: [] }).data ?? [];
      if (!leaveAllRes.ok) {
        console.error("Leave Application fetch failed:", leaveAllRes.status);
      }

      // Only Approved + submitted rows count toward "taken" balance math
      const leaveTakenRows = leaveAllRows.filter(
        (r: any) => r.status === "Approved"
      );

      // ── Build attendance summary ───────────────────────────────────────────
      const empMap: Record<string, EmployeeAttendanceSummary> = {};
      empRows.forEach((e: any) => {
        empMap[e.name] = {
          employee: e.name,
          employee_name: e.employee_name,
          department: e.department,
          designation: e.designation,
          present: 0, absent: 0, late: 0, half_day: 0,
          total_days: 0, attendance_pct: 0,
        };
      });
      attRows.forEach((r: any) => {
        if (!empMap[r.employee]) {
          empMap[r.employee] = {
            employee: r.employee,
            employee_name: r.employee_name,
            department: r.department,
            present: 0, absent: 0, late: 0, half_day: 0,
            total_days: 0, attendance_pct: 0,
          };
        }
        const s = (r.status || "").toLowerCase();
        empMap[r.employee].total_days++;
        if (s === "present")                         empMap[r.employee].present++;
        else if (s === "absent")                     empMap[r.employee].absent++;
        else if (s === "half day")                   empMap[r.employee].half_day++;
        else if (s === "late entry" || s === "late") empMap[r.employee].late++;
      });

      const employeeAttendance = Object.values(empMap)
        .filter((e) => e.total_days > 0)
        .map((e) => ({
          ...e,
          attendance_pct: e.total_days > 0 ? Math.round((e.present / e.total_days) * 100) : 0,
        }))
        .sort((a, b) => a.employee_name.localeCompare(b.employee_name));

      // ── Build leave balance summary (Approved only) ────────────────────────
      // Sum multiple allocations for same employee+leave_type (e.g. carry-forward)
      const leaveMap: Record<string, LeaveBalanceSummary> = {};

      leaveAllocRows.forEach((r: any) => {
        const key = `${r.employee}__${r.leave_type}`;
        const allocated = Number(r.total_leaves_allocated) || Number(r.new_leaves_allocated) || 0;
        if (leaveMap[key]) {
          leaveMap[key].total_leaves_allocated += allocated;
        } else {
          leaveMap[key] = {
            employee: r.employee,
            employee_name: r.employee_name,
            department: r.department,
            leave_type: r.leave_type,
            total_leaves_allocated: allocated,
            total_leaves_taken: 0,
            balance: 0,
          };
        }
      });

      leaveTakenRows.forEach((r: any) => {
        const key = `${r.employee}__${r.leave_type}`;
        if (leaveMap[key]) {
          leaveMap[key].total_leaves_taken += Number(r.total_leave_days) || 0;
        } else {
          // Taken but no allocation record — still show it
          leaveMap[key] = {
            employee: r.employee,
            employee_name: r.employee_name,
            department: r.department,
            leave_type: r.leave_type,
            total_leaves_allocated: 0,
            total_leaves_taken: Number(r.total_leave_days) || 0,
            balance: 0,
          };
        }
      });

      const leaveBalances = Object.values(leaveMap)
        .map((l) => ({ ...l, balance: l.total_leaves_allocated - l.total_leaves_taken }))
        .sort((a, b) => a.employee_name.localeCompare(b.employee_name));

      // ── NEW: full leave applications list (every status, every row) ───────
      const leaveApplications: LeaveApplicationSummary[] = leaveAllRows
        .map((r: any) => ({
          name: r.name,
          employee: r.employee,
          employee_name: r.employee_name,
          department: r.department,
          leave_type: r.leave_type,
          total_leave_days: Number(r.total_leave_days) || 0,
          status: r.status,
          from_date: r.from_date,
          to_date: r.to_date,
        }))
        .sort((a, b) => (a.from_date < b.from_date ? 1 : -1)); // most recent first

      // ── Build department summary ───────────────────────────────────────────
      const deptMap: Record<string, DepartmentAttendanceSummary> = {};
      attRows.forEach((r: any) => {
        const dept = r.department || "Unknown";
        if (!deptMap[dept]) {
          deptMap[dept] = { department: dept, total_employees: 0, present: 0, absent: 0, attendance_pct: 0 };
        }
        deptMap[dept].total_employees++;
        const s = (r.status || "").toLowerCase();
        if (s === "present") deptMap[dept].present++;
        else if (s === "absent") deptMap[dept].absent++;
      });

      const departmentAttendance = Object.values(deptMap)
        .map((d) => ({
          ...d,
          attendance_pct: d.total_employees > 0 ? Math.round((d.present / d.total_employees) * 100) : 0,
        }))
        .sort((a, b) => b.attendance_pct - a.attendance_pct);

      setData({
        employeeAttendance,
        leaveBalances,
        leaveApplications, // NEW
        departmentAttendance,
        month: m,
        year: y,
      });

    } catch (e: any) {
      setError(e?.message ?? "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  const changeMonth = (m: number, y: number) => {
    setMonth(m);
    setYear(y);
    load(m, y);
  };

  const [fetched, setFetched] = useState(false);
  if (!fetched) {
    setFetched(true);
    load(month, year);
  }

  return { data, loading, error, month, year, changeMonth, refresh: () => load(month, year) };
}