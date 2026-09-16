// hooks/UseAcadReports.ts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TeacherPerformance {
  name: string;
  sections: number;
  hrsPerWeek: number;
  attCompliance: number;
  assessSubmission: number;
  conducted: number;
  total: number;
  stdDev: number;
  engagement: number;
  conflict: boolean;
}

export interface AtRiskStudent {
  name: string;
  student_id: string;
  grade: number;
  section: string;
  attendance: number;
  avgScore: number | null;
  risk: 'critical' | 'high' | 'medium' | 'low';
}

export interface SectionOccupancy {
  section: string;
  enrolled: number;
  capacity: number;
  color?: 'green' | 'amber' | 'red';
  pct?: number;
}

export interface OperationalGap {
  section: string;
  subject: string;
  issue: string;
  status: 'ghost' | 'unassigned' | 'unmarked';
}

export interface OnlineClass {
  date: string;
  subject: string;
  section: string;
  teacher: string;
  conducted: boolean;
  joinRate: number | null;
}

export interface ComplianceLog {
  time: string;
  action: string;
  entity: string;
  by: string;
  ip: string;
  before: string;
  after: string;
}

export type ReportTabId = 'teacher' | 'student' | 'ops' | 'online' | 'compliance';

// ─────────────────────────────────────────────────────────────────────────────
// Generic CSV export
// ─────────────────────────────────────────────────────────────────────────────
function downloadCSV(data: any[], filename: string) {
  if (!data.length) { toast.error('No data to export'); return; }
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported');
}

export function useAcadReports() {
  const [coreLoading, setCoreLoading] = useState(true);
  const [coreLoaded,  setCoreLoaded]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [dateRange,   setDateRange]   = useState({ from: '', to: '' });

  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceLoaded,  setComplianceLoaded]  = useState(false);

  // ── Raw datasets ──
  const [schedules,         setSchedules]         = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<any[]>([]);
  const [groupEnrollment,   setGroupEnrollment]   = useState<any[]>([]);
  const [complianceLogs,    setComplianceLogs]    = useState<ComplianceLog[]>([]);

  const coreFetchedRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────────────
  // CORE FETCH
  // ─────────────────────────────────────────────────────────────────────────
  const fetchCoreReports = useCallback(async (filters?: { from_date?: string; to_date?: string }) => {
    setCoreLoading(true);
    setError(null);
    try {
      const [scheduleRes, attRes, assessRes, groupsRes] = await Promise.all([
        api.getTeacherCourseSchedules(filters),
        api.getAllAttendanceRecords(filters),
        api.getAllAssessmentResults(filters),
        api.getStudentGroupsWithEnrollment(),
      ]);

      if (!scheduleRes.ok) throw new Error(scheduleRes.error || 'Failed to fetch schedules');
      setSchedules(scheduleRes.data);

      if (!attRes.ok) throw new Error(attRes.error || 'Failed to fetch attendance');
      setAttendanceRecords(attRes.data);

      if (assessRes.ok) setAssessmentResults(assessRes.data);
      else toast.error(assessRes.error || 'Failed to fetch assessment results');

      if (groupsRes.ok) {
        setGroupEnrollment(groupsRes.data);
      } else {
        toast.error(groupsRes.error || 'Failed to fetch section enrollment');
      }

      setCoreLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load reports';
      setError(msg);
      toast.error(msg);
    } finally {
      setCoreLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // COMPLIANCE FETCH
  // ─────────────────────────────────────────────────────────────────────────
  const fetchComplianceReport = useCallback(async () => {
    setComplianceLoading(true);
    try {
      const res = await api.getComplianceAudit(300);
      if (res.ok) {
        setComplianceLogs(res.data);
        setComplianceLoaded(true);
      } else {
        toast.error(res.error || 'Failed to fetch compliance audit');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch compliance audit');
    } finally {
      setComplianceLoading(false);
    }
  }, []);

  // Mount: fetch core once
  useEffect(() => {
    if (!coreFetchedRef.current) {
      coreFetchedRef.current = true;
      fetchCoreReports();
    }
  }, [fetchCoreReports]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED: attendance by schedule
  // ─────────────────────────────────────────────────────────────────────────
  const attendanceBySchedule = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();
    for (const a of attendanceRecords) {
      const cs = a.course_schedule;
      if (!cs) continue;
      if (!map.has(cs)) map.set(cs, { total: 0, present: 0 });
      const stat = map.get(cs)!;
      stat.total++;
      if (a.status === 'Present') stat.present++;
    }
    return map;
  }, [attendanceRecords]);

  // ── DERIVED: Teacher Performance ──
  const { teacherData, teacherSummary } = useMemo(() => {
    const instructorMap = new Map<string, {
      name: string; sections: Set<string>; totalClasses: number; conductedClasses: number;
      totalAttendancePct: number; attendanceCount: number; totalAssessmentPct: number; assessmentCount: number;
    }>();

    for (const s of schedules) {
      const instructor = s.instructor_name || s.instructor || 'Unknown';
      if (!instructorMap.has(instructor)) {
        instructorMap.set(instructor, {
          name: instructor, sections: new Set(), totalClasses: 0, conductedClasses: 0,
          totalAttendancePct: 0, attendanceCount: 0, totalAssessmentPct: 0, assessmentCount: 0,
        });
      }
      const rec = instructorMap.get(instructor)!;
      rec.sections.add(s.student_group);
      rec.totalClasses++;
      const attStat = attendanceBySchedule.get(s.name);
      if (attStat && attStat.total > 0) {
        rec.totalAttendancePct += (attStat.present / attStat.total) * 100;
        rec.attendanceCount++;
        rec.conductedClasses++;
      }
    }

    const courseInstructorMap = new Map<string, string>();
    for (const s of schedules) {
      if (s.course && (s.instructor_name || s.instructor)) {
        courseInstructorMap.set(s.course, s.instructor_name || s.instructor);
      }
    }
    for (const ar of assessmentResults) {
      const instructor = courseInstructorMap.get(ar.course);
      if (!instructor) continue;
      const rec = instructorMap.get(instructor);
      if (!rec || !ar.maximum_score) continue;
      rec.totalAssessmentPct += (ar.total_score / ar.maximum_score) * 100;
      rec.assessmentCount++;
    }

    const teachers: TeacherPerformance[] = Array.from(instructorMap.values()).map(t => ({
      name: t.name,
      sections: t.sections.size,
      hrsPerWeek: Math.round(t.totalClasses / 4),
      attCompliance: t.attendanceCount ? Math.round(t.totalAttendancePct / t.attendanceCount) : 0,
      assessSubmission: t.assessmentCount ? Math.round(t.totalAssessmentPct / t.assessmentCount) : 0,
      conducted: t.conductedClasses,
      total: t.totalClasses,
      stdDev: 0,
      engagement: 0,
      conflict: false,
    }));

    return {
      teacherData: teachers,
      teacherSummary: {
        total: teachers.length,
        avgCompliance: teachers.length ? Math.round(teachers.reduce((a, t) => a + t.attCompliance, 0) / teachers.length) : 0,
        conflicts: teachers.filter(t => t.conflict).length,
        avgClasses: teachers.length ? Math.round(teachers.reduce((a, t) => a + t.conducted, 0) / teachers.length) : 0,
      },
    };
  }, [schedules, attendanceBySchedule, assessmentResults]);

  // ── DERIVED: At-Risk Students ──
  const { atRiskStudents, studentSummary } = useMemo(() => {
    const studentAttMap = new Map<string, { student_name: string; student_group: string; total: number; present: number }>();
    for (const a of attendanceRecords) {
      if (!a.student) continue;
      if (!studentAttMap.has(a.student)) {
        studentAttMap.set(a.student, { student_name: a.student_name || a.student, student_group: a.student_group || '—', total: 0, present: 0 });
      }
      const stat = studentAttMap.get(a.student)!;
      stat.total++;
      if (a.status === 'Present') stat.present++;
      if (a.student_group) stat.student_group = a.student_group;
    }

    const studentScoreMap = new Map<string, { sumPct: number; count: number }>();
    for (const ar of assessmentResults) {
      if (!ar.student || !ar.maximum_score) continue;
      if (!studentScoreMap.has(ar.student)) studentScoreMap.set(ar.student, { sumPct: 0, count: 0 });
      const sc = studentScoreMap.get(ar.student)!;
      sc.sumPct += (ar.total_score / ar.maximum_score) * 100;
      sc.count++;
    }

    const atRisk: AtRiskStudent[] = [];
    for (const [sid, att] of studentAttMap.entries()) {
      const attPct = att.total ? (att.present / att.total) * 100 : 0;
      const scoreData = studentScoreMap.get(sid);
      const avgScore = scoreData && scoreData.count ? scoreData.sumPct / scoreData.count : null;

      let risk: AtRiskStudent['risk'] = 'low';
      if (attPct < 60 || (avgScore !== null && avgScore < 50)) risk = 'critical';
      else if (attPct < 70 || (avgScore !== null && avgScore < 60)) risk = 'high';
      else if (attPct < 80 || (avgScore !== null && avgScore < 70)) risk = 'medium';

      if (risk !== 'low') {
        atRisk.push({
          name: att.student_name, student_id: sid, grade: 0, section: att.student_group,
          attendance: Math.round(attPct), avgScore: avgScore !== null ? Math.round(avgScore) : null, risk,
        });
      }
    }

    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    atRisk.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);

    return {
      atRiskStudents: atRisk,
      studentSummary: {
        totalAtRisk: atRisk.length,
        critical: atRisk.filter(s => s.risk === 'critical').length,
        high: atRisk.filter(s => s.risk === 'high').length,
        medium: atRisk.filter(s => s.risk === 'medium').length,
      },
    };
  }, [attendanceRecords, assessmentResults]);

  // ── DERIVED: Online Classes ──
  const { onlineClasses, onlineSummary } = useMemo(() => {
    const online: OnlineClass[] = schedules.map((s: any) => {
      const attStat = attendanceBySchedule.get(s.name);
      const conducted = !!(attStat && attStat.total > 0);
      return {
        date: s.schedule_date || '—',
        subject: s.course || '—',
        section: s.student_group || '—',
        teacher: s.instructor_name || s.instructor || '—',
        conducted,
        joinRate: conducted && attStat ? Math.round((attStat.present / attStat.total) * 100) : null,
      };
    }).sort((a, b) => (a.date > b.date ? -1 : 1));

    const conductedCount = online.filter(o => o.conducted).length;
    const joinRates = online.filter(o => o.joinRate !== null).map(o => o.joinRate as number);
    const avgJoin = joinRates.length ? Math.round(joinRates.reduce((a, v) => a + v, 0) / joinRates.length) : 0;

    return {
      onlineClasses: online,
      onlineSummary: { scheduled: online.length, conducted: conductedCount, notHeld: online.length - conductedCount, avgJoinRate: avgJoin },
    };
  }, [schedules, attendanceBySchedule]);

  // ── DERIVED: Operational Gaps ──
  const operationalGaps = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const gaps: OperationalGap[] = [];
    const seen = new Set<string>();

    for (const s of schedules) {
      if (!s.schedule_date || s.schedule_date > today) continue;
      const hasAttendance = attendanceBySchedule.has(s.name);
      const hasInstructor = !!(s.instructor || s.instructor_name);

      let entry: OperationalGap | null = null;
      if (!hasInstructor) {
        entry = { section: s.student_group, subject: s.course, issue: `No instructor assigned (${s.schedule_date})`, status: 'unassigned' };
      } else if (!hasAttendance) {
        entry = { section: s.student_group, subject: s.course, issue: `Attendance not marked for ${s.schedule_date} by ${s.instructor_name || s.instructor}`, status: 'ghost' };
      }
      if (entry) {
        const key = `${entry.section}|${entry.subject}|${entry.status}`;
        if (!seen.has(key)) { seen.add(key); gaps.push(entry); }
      }
    }
    return gaps;
  }, [schedules, attendanceBySchedule]);

  // ── ✅ FIXED: Section Occupancy with Color Coding ──
  const sectionOccupancy: SectionOccupancy[] = useMemo(() => {
    if (!groupEnrollment || groupEnrollment.length === 0) {
      return [];
    }

    return groupEnrollment.map((g: any) => {
      const enrolled = g.enrolled || 0;
      const capacity = g.capacity || 30;
      const pct = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
      
      let color: 'green' | 'amber' | 'red' = 'green';
      if (pct >= 85) color = 'red';
      else if (pct >= 65) color = 'amber';
      else color = 'green';
      
      return {
        section: g.student_group_name || g.name || 'Unknown',
        enrolled: enrolled,
        capacity: capacity,
        color: color,
        pct: pct,
      };
    });
  }, [groupEnrollment]);

  const opsSummary = useMemo(() => ({
    totalSections: sectionOccupancy.length,
    ghost: operationalGaps.filter(g => g.status === 'ghost').length,
    unassigned: operationalGaps.filter(g => g.status === 'unassigned').length,
    atCapacity: sectionOccupancy.filter(o => o.pct && o.pct >= 85).length,
  }), [sectionOccupancy, operationalGaps]);

  const complianceSummary = useMemo(() => ({
    total: complianceLogs.length,
    statusChanges: complianceLogs.filter(l => l.action === 'Status Change').length,
    transfers: complianceLogs.filter(l => l.action === 'Section Transfer').length,
    linkUpdates: complianceLogs.filter(l => l.action === 'Link Update').length,
  }), [complianceLogs]);

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────────────────
  const fetchAllReports = useCallback(async (filters?: { from_date?: string; to_date?: string }) => {
    await fetchCoreReports(filters);
    if (complianceLoaded) await fetchComplianceReport();
  }, [fetchCoreReports, fetchComplianceReport, complianceLoaded]);

  const onTabActivate = useCallback((tab: ReportTabId) => {
    if (tab === 'compliance' && !complianceLoaded && !complianceLoading) {
      fetchComplianceReport();
    }
  }, [complianceLoaded, complianceLoading, fetchComplianceReport]);

  // ── EXPORTS ──
  const exportToExcel = useCallback((data: any[], filename: string) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exported');
    } catch (e) {
      toast.error('Export failed');
      console.error(e);
    }
  }, []);

  const exportToPDF = useCallback((headers: string[], rows: any[][], filename: string) => {
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(14);
      doc.text(filename.replace(/_/g, ' ').toUpperCase(), 14, 14);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
      autoTable(doc, { head: [headers], body: rows, startY: 26, styles: { fontSize: 8 }, headStyles: { fillColor: [22, 163, 74] } });
      doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported');
    } catch (e) {
      toast.error('PDF export failed');
      console.error(e);
    }
  }, []);

  const exportToCSV = useCallback((data: any[], filename: string) => {
    downloadCSV(data, filename);
  }, []);

  return {
    loading: coreLoading,
    coreLoaded,
    error,
    dateRange,
    setDateRange,
    fetchAllReports,
    onTabActivate,

    teacherData,
    atRiskStudents,
    sectionOccupancy,
    operationalGaps,
    onlineClasses,

    complianceLogs,
    complianceLoading,
    complianceLoaded,

    teacherSummary,
    studentSummary,
    opsSummary,
    onlineSummary,
    complianceSummary,

    exportToExcel,
    exportToPDF,
    exportToCSV,
  };
}