import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api"; // ⚠️ adjust this path to wherever your api.ts actually lives
import type {
  EmployeeDetail,
  LeaveApplicationDetail,
  AttendanceDetail,
  DepartmentDetail,
  StudentDetail,
  StudentAttendanceRow,
  SalesInvoiceDetail,
  ProgramEnrollmentDetail,
} from "../services/api"; // ⚠️ same here

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminEmployee {
  name: string;
  employee_name: string;
  designation?: string;
  department?: string;
  status?: string;
  date_of_joining?: string;
  image?: string;
}

export interface AdminLeaveApplication {
  name: string;
  employee: string;
  employee_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  total_leave_days?: number;
  status?: string;
  workflow_state?: string;
  reason?: string;
  department?: string;
}

export interface AdminAttendanceSummary {
  employee: string;
  employee_name?: string;
  department?: string;
  present: number;
  absent: number;
  late: number;
  total_working_days: number;
  percentage?: number;
}

export interface AdminDepartment {
  name: string;
  department_name?: string;
  parent_department?: string;
  employee_count?: number;
}

export interface AdminStudent {
  name: string;
  student_name: string;
  student_email_id?: string;
  gender?: string;
  enabled?: number;
  image?: string;
}

export interface AdminStudentAttendanceRecord {
  student: string;
  student_name?: string;
  status?: string;
  date: string;
  student_group?: string;
}

// ── Fee / Sales Invoice ───────────────────────────────────────────────────────
export interface AdminFee {
  name: string;
  student?: string;
  student_name?: string;
  customer?: string;
  customer_name?: string;
  fee_schedule?: string;
  posting_date?: string;
  due_date?: string;
  docstatus?: number;
  grand_total?: number;
  outstanding_amount?: number;
  paid_amount?: number;
  status?: string;
}

export interface DepartmentHeadcount {
  department: string;
  count: number;
}

export interface DailyAttendancePoint {
  date: string; // YYYY-MM-DD
  employeesPresent: number;
  employeesAbsent: number;
  studentsPresent: number;
  studentsAbsent: number;
}

export interface FeesStatusBreakdown {
  status: string;
  count: number;
  amount: number;
}

export interface AdminStats {
  // Employees
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  approvedLeavesToday: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  workFromHomeToday: number;
  halfDayToday: number;
  totalDepartments: number;
  attendancePct: number | null;

  // Monthly employee attendance average (month-to-date)
  monthlyAttendancePct: number | null;
  monthlyPresentCount: number;
  monthlyTotalCount: number;

  // Students (now sourced from Program Enrollment, not Student doctype)
  totalStudents: number;
  activeStudents: number;
  presentStudentsToday: number;
  absentStudentsToday: number;
  studentAttendancePct: number | null;

  // Monthly student attendance average (month-to-date)
  monthlyStudentAttendancePct: number | null;
  monthlyStudentPresentCount: number;
  monthlyStudentTotalCount: number;

  // Fees / Invoices
  totalFeesInvoices: number;
  totalFeesAmount: number;
  totalFeesCollected: number;
  totalFeesOutstanding: number;
  feesCollectionPct: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// FIX: toISOString() uses UTC. In UTC+5 (Pakistan), between 12:00am–5:00am
// local time, the UTC date is still "yesterday" — so "today's" attendance
// query silently asked the server for the wrong day and came back empty,
// which is what made Present/Absent Today show "—" on the dashboard.
// Build the date string from local getFullYear/getMonth/getDate instead.
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Cancelled Sales Invoices (docstatus 2) should never count toward fee totals.
function isActiveInvoice(f: AdminFee) {
  return f.docstatus !== 2;
}

// Cancelled Attendance records (docstatus 2) should never count toward
// present/absent totals or charts — same rule as Sales Invoice above.
function isActiveAttendance(a: AttendanceDetail) {
  return (a as any).docstatus !== 2;
}

function isActiveStudentAttendance(a: StudentAttendanceRow) {
  return (a as any).docstatus !== 2;
}

function normalizeStatus(s?: string) {
  return (s || "").trim().toLowerCase();
}

// ── Program Enrollment → Total/Active student counts ─────────────────────
// Total  = distinct students with a non-cancelled Program Enrollment
//          (getAllProgramEnrollments already filters out docstatus 2).
// Active = distinct students whose Program Enrollment is docstatus 1
//          (submitted / confirmed enrollment).
function computeStudentCountsFromEnrollment(
  enrollments: ProgramEnrollmentDetail[]
): { total: number; active: number } {
  const totalSet = new Set<string>();
  const activeSet = new Set<string>();

  for (const e of enrollments) {
    if (!e.student) continue;
    totalSet.add(e.student);
    if (e.docstatus === 1) activeSet.add(e.student);
  }

  return { total: totalSet.size, active: activeSet.size };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdmin() {
  const [employees, setEmployees]     = useState<AdminEmployee[]>([]);
  const [leaveApps, setLeaveApps]     = useState<AdminLeaveApplication[]>([]);
  const [attendance, setAttendance]   = useState<AdminAttendanceSummary[]>([]);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);

  const [students, setStudents]                   = useState<AdminStudent[]>([]);
  const [studentAttendance, setStudentAttendance]  = useState<AdminStudentAttendanceRecord[]>([]);
  const [fees, setFees]                           = useState<AdminFee[]>([]);
  const [programEnrollments, setProgramEnrollments] = useState<ProgramEnrollmentDetail[]>([]);

  const [departmentHeadcount, setDepartmentHeadcount]         = useState<DepartmentHeadcount[]>([]);
  const [weeklyAttendanceTrend, setWeeklyAttendanceTrend]     = useState<DailyAttendancePoint[]>([]);
  const [feesStatusBreakdown, setFeesStatusBreakdown]         = useState<FeesStatusBreakdown[]>([]);

  // Full per-employee attendance report for "today" — used to render a
  // status table on the dashboard (Present / Absent / Leave / WFH / Half Day).
  const [todayEmployeeReport, setTodayEmployeeReport] = useState<AdminAttendanceSummary[]>([]);
  const [todayStudentReport, setTodayStudentReport]   = useState<AdminStudentAttendanceRecord[]>([]);

  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    approvedLeavesToday: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    workFromHomeToday: 0,
    halfDayToday: 0,
    totalDepartments: 0,
    attendancePct: null,

    monthlyAttendancePct: null,
    monthlyPresentCount: 0,
    monthlyTotalCount: 0,

    totalStudents: 0,
    activeStudents: 0,
    presentStudentsToday: 0,
    absentStudentsToday: 0,
    studentAttendancePct: null,

    monthlyStudentAttendancePct: null,
    monthlyStudentPresentCount: 0,
    monthlyStudentTotalCount: 0,

    totalFeesInvoices: 0,
    totalFeesAmount: 0,
    totalFeesCollected: 0,
    totalFeesOutstanding: 0,
    feesCollectionPct: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Main loader ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const todayStr = toDateStr(today);
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 6);
      const weekAgoStr = toDateStr(weekAgo);

      // Month-to-date range, e.g. 1st of current month through today —
      // used for the "Monthly Attendance Average" stat cards.
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStartStr = toDateStr(monthStart);

      const [
        empRes,
        leaveRes,
        attTodayRes,
        attWeekRes,
        attMonthRes,
        deptRes,
        studentRes,
        studentAttTodayRes,
        studentAttWeekRes,
        studentAttMonthRes,
        feesRes,
        programEnrollmentRes,
      ] = await Promise.all([
        api.getAllEmployees(),
        api.getAllLeaveApplications(),
        api.getAllAttendance({ from_date: todayStr, to_date: todayStr }),
        api.getAllAttendance({ from_date: weekAgoStr, to_date: todayStr }),
        api.getAllAttendance({ from_date: monthStartStr, to_date: todayStr }),
        api.getAllDepartments(),
        api.getAllStudents(),
        api.getAllStudentAttendance({ from_date: todayStr, to_date: todayStr }),
        api.getAllStudentAttendance({ from_date: weekAgoStr, to_date: todayStr }),
        api.getAllStudentAttendance({ from_date: monthStartStr, to_date: todayStr }),
        api.getAllFees(),
        api.getAllProgramEnrollments(),
      ]);

      const empData: EmployeeDetail[] = empRes.ok ? empRes.data : [];
      const leaveData: LeaveApplicationDetail[] = leaveRes.ok ? leaveRes.data : [];

      // Drop cancelled (docstatus 2) attendance rows before anything else touches them.
      const attTodayData: AttendanceDetail[] = (attTodayRes.ok ? attTodayRes.data : []).filter(isActiveAttendance);
      const attWeekData: AttendanceDetail[] = (attWeekRes.ok ? attWeekRes.data : []).filter(isActiveAttendance);
      const attMonthData: AttendanceDetail[] = (attMonthRes.ok ? attMonthRes.data : []).filter(isActiveAttendance);

      const deptData: DepartmentDetail[] = deptRes.ok ? (deptRes.data as any) : [];
      const studentData: StudentDetail[] = studentRes.ok ? studentRes.data : [];

      const studentAttTodayData: StudentAttendanceRow[] = (studentAttTodayRes.ok ? studentAttTodayRes.data : []).filter(isActiveStudentAttendance);
      const studentAttWeekData: StudentAttendanceRow[] = (studentAttWeekRes.ok ? studentAttWeekRes.data : []).filter(isActiveStudentAttendance);
      const studentAttMonthData: StudentAttendanceRow[] = (studentAttMonthRes.ok ? studentAttMonthRes.data : []).filter(isActiveStudentAttendance);

      // Sales Invoice rows — filter out cancelled (docstatus 2) invoices up front
      // so every downstream total/chart is automatically correct.
      const rawFeesData: SalesInvoiceDetail[] = feesRes.ok ? feesRes.data : [];
      const feesData: AdminFee[] = (rawFeesData as unknown as AdminFee[]).filter(isActiveInvoice);

      // Program Enrollment — asal source for Total/Active Students count.
      const programEnrollmentData: ProgramEnrollmentDetail[] = programEnrollmentRes.ok
        ? programEnrollmentRes.data
        : [];

      setEmployees(empData as AdminEmployee[]);
      setLeaveApps(leaveData as AdminLeaveApplication[]);
      setDepartments(deptData as AdminDepartment[]);
      setStudents(studentData as AdminStudent[]);
      setStudentAttendance(studentAttTodayData as AdminStudentAttendanceRecord[]);
      setTodayStudentReport(studentAttTodayData as AdminStudentAttendanceRecord[]);
      setFees(feesData);
      setProgramEnrollments(programEnrollmentData);

      // Quick lookup so the report table can show department alongside each employee.
      const empDeptMap: Record<string, string | undefined> = {};
      for (const e of empData) empDeptMap[e.name] = e.department;

      // ── Employee attendance summary (today) ──────────────────────────────────
      const summaryMap: Record<string, AdminAttendanceSummary> = {};
      for (const rec of attTodayData) {
        const key = rec.employee;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            employee: rec.employee,
            employee_name: rec.employee_name,
            department: empDeptMap[rec.employee],
            present: 0,
            absent: 0,
            late: 0,
            total_working_days: 0,
          };
        }
        const s = normalizeStatus(rec.status);
        if (s === "present") summaryMap[key].present++;
        else if (s === "absent") summaryMap[key].absent++;
        else if (s === "half day" || s === "late") summaryMap[key].late++;
        summaryMap[key].total_working_days++;
      }
      const summaryList = Object.values(summaryMap);
      setAttendance(summaryList);
      setTodayEmployeeReport(summaryList);

      // ── Employees by department (bar chart) ──────────────────────────────────
      const deptCountMap: Record<string, number> = {};
      for (const e of empData) {
        const dept = e.department || "Unassigned";
        deptCountMap[dept] = (deptCountMap[dept] || 0) + 1;
      }
      setDepartmentHeadcount(
        Object.entries(deptCountMap)
          .map(([department, count]) => ({ department, count }))
          .sort((a, b) => b.count - a.count)
      );

      // ── Weekly attendance trend (employees + students) ───────────────────────
      const trendMap: Record<string, DailyAttendancePoint> = {};
      const ensureDay = (date: string) => {
        if (!trendMap[date]) {
          trendMap[date] = { date, employeesPresent: 0, employeesAbsent: 0, studentsPresent: 0, studentsAbsent: 0 };
        }
        return trendMap[date];
      };
      for (const rec of attWeekData) {
        if (!rec.attendance_date) continue;
        const day = ensureDay(rec.attendance_date);
        const s = normalizeStatus(rec.status);
        if (s === "present") day.employeesPresent++;
        else if (s === "absent") day.employeesAbsent++;
      }
      for (const rec of studentAttWeekData) {
        if (!rec.date) continue;
        const day = ensureDay(rec.date);
        const s = normalizeStatus(rec.status);
        if (s === "present") day.studentsPresent++;
        else if (s === "absent") day.studentsAbsent++;
      }
      setWeeklyAttendanceTrend(
        Object.values(trendMap).sort((a, b) => (a.date > b.date ? 1 : -1))
      );

      // ── Fees status breakdown (uses grand_total, not total_amount) ───────────
      const feesStatusMap: Record<string, { count: number; amount: number }> = {};
      for (const f of feesData) {
        const status = f.status || "Unknown";
        if (!feesStatusMap[status]) feesStatusMap[status] = { count: 0, amount: 0 };
        feesStatusMap[status].count++;
        feesStatusMap[status].amount += f.grand_total ?? 0;
      }
      setFeesStatusBreakdown(
        Object.entries(feesStatusMap).map(([status, v]) => ({ status, ...v }))
      );

      // ── Stats ────────────────────────────────────────────────────────────────
      const active = empData.filter(
        (e) => normalizeStatus(e.status) === "active"
      ).length;

      const pending = leaveData.filter((l) => {
        const s = normalizeStatus(l.status);
        return s.includes("open") || s.includes("pending") || s.includes("applied");
      }).length;

      const approvedToday = leaveData.filter((l) => {
        const s = normalizeStatus(l.status);
        return s.includes("approved") && (l.from_date ?? "").startsWith(todayStr);
      }).length;

      // Every distinct status bucket, so nothing silently disappears from the count.
      const presentToday = attTodayData.filter((r) => normalizeStatus(r.status) === "present").length;
      const absentToday = attTodayData.filter((r) => normalizeStatus(r.status) === "absent").length;
      const onLeaveToday = attTodayData.filter((r) => normalizeStatus(r.status) === "on leave").length;
      const workFromHomeToday = attTodayData.filter((r) => normalizeStatus(r.status) === "work from home").length;
      const halfDayToday = attTodayData.filter((r) => normalizeStatus(r.status) === "half day").length;

      const totalToday = attTodayData.length;
      const pct = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : null;

      // Monthly average (month-to-date): weight Half Day / Work From Home as 0.5
      // presence so the average isn't just a binary present/absent split.
      const monthlyPresentWeight = attMonthData.reduce((sum, r) => {
        const s = normalizeStatus(r.status);
        if (s === "present" || s === "work from home") return sum + 1;
        if (s === "half day") return sum + 0.5;
        return sum;
      }, 0);
      const monthlyTotalCount = attMonthData.length;
      const monthlyPresentCount = Math.round(monthlyPresentWeight);
      const monthlyAttendancePct =
        monthlyTotalCount > 0
          ? Math.round((monthlyPresentWeight / monthlyTotalCount) * 100)
          : null;

      // Students — ab Program Enrollment se count ho rahe hain, Student
      // doctype se nahi. `studentData` sirf naam/detail lookups ke liye
      // (jaisa StudentGroups module use karta hai) preserve kiya gaya hai.
      const { total: totalStudentsCount, active: activeStudentsCount } =
        computeStudentCountsFromEnrollment(programEnrollmentData);

      const presentStudentsToday = studentAttTodayData.filter(
        (r) => normalizeStatus(r.status) === "present"
      ).length;
      const absentStudentsToday = studentAttTodayData.filter(
        (r) => normalizeStatus(r.status) === "absent"
      ).length;
      const totalStudentAttToday = studentAttTodayData.length;
      const studentPct =
        totalStudentAttToday > 0
          ? Math.round((presentStudentsToday / totalStudentAttToday) * 100)
          : null;

      // Monthly student average (month-to-date)
      const monthlyStudentPresentWeight = studentAttMonthData.reduce((sum, r) => {
        const s = normalizeStatus(r.status);
        if (s === "present") return sum + 1;
        if (s === "half day") return sum + 0.5;
        return sum;
      }, 0);
      const monthlyStudentTotalCount = studentAttMonthData.length;
      const monthlyStudentPresentCount = Math.round(monthlyStudentPresentWeight);
      const monthlyStudentAttendancePct =
        monthlyStudentTotalCount > 0
          ? Math.round((monthlyStudentPresentWeight / monthlyStudentTotalCount) * 100)
          : null;

      // Fees (Sales Invoice)
      const totalFeesAmount = feesData.reduce((sum, f) => sum + (f.grand_total ?? 0), 0);
      const totalFeesCollected = feesData.reduce((sum, f) => sum + (f.paid_amount ?? 0), 0);
      const totalFeesOutstanding = feesData.reduce((sum, f) => sum + (f.outstanding_amount ?? 0), 0);
      const feesPct =
        totalFeesAmount > 0 ? Math.round((totalFeesCollected / totalFeesAmount) * 100) : null;

      setStats({
        totalEmployees:      empData.length,
        activeEmployees:     active,
        pendingLeaves:       pending,
        approvedLeavesToday: approvedToday,
        presentToday,
        absentToday,
        onLeaveToday,
        workFromHomeToday,
        halfDayToday,
        totalDepartments:    deptData.length,
        attendancePct:       pct,

        monthlyAttendancePct,
        monthlyPresentCount,
        monthlyTotalCount,

        totalStudents:          totalStudentsCount,
        activeStudents:         activeStudentsCount,
        presentStudentsToday,
        absentStudentsToday,
        studentAttendancePct:   studentPct,

        monthlyStudentAttendancePct,
        monthlyStudentPresentCount,
        monthlyStudentTotalCount,

        totalFeesInvoices:     feesData.length,
        totalFeesAmount,
        totalFeesCollected,
        totalFeesOutstanding,
        feesCollectionPct:     feesPct,
      });

      // Surface a soft warning if any individual call failed, without blocking the rest
      const failed = [empRes, leaveRes, attTodayRes, attMonthRes, deptRes, studentRes, feesRes, programEnrollmentRes].find((r) => !r.ok);
      if (failed && !failed.ok) setError(failed.error);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return {
    employees,
    leaveApps,
    attendance,
    departments,
    students,
    studentAttendance,
    fees,
    programEnrollments,
    departmentHeadcount,
    weeklyAttendanceTrend,
    feesStatusBreakdown,
    todayEmployeeReport,
    todayStudentReport,
    stats,
    loading,
    error,
    refresh: loadAll,
  };
}