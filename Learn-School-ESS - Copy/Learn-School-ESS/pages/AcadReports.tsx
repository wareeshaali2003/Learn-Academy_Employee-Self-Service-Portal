// pages/AcadReports.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAcadReports } from '../hooks/UseAcadReports';
import type { ReportTabId } from '../hooks/UseAcadReports';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════
const I = {
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  teacher:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  warning:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  video:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  shield:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  layers:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  refresh:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  prev:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  next:     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  chart:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
};

type TabId = ReportTabId;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const riskColor = (r: string) => {
  if (r === 'critical' || r === 'high') return '#dc2626';
  if (r === 'medium') return '#d97706';
  return '#16a34a';
};
const riskLabel = (r: string) => {
  if (r === 'critical') return '🔴 Critical';
  if (r === 'high')     return '🔴 High';
  if (r === 'medium')   return '🟡 Medium';
  return '🟢 Low';
};

// Plain‑text risk label for exports (no emoji) – avoids garbled text in Excel, CSV & PDF
const pdfRiskLabel = (risk: string) => {
  if (risk === 'critical') return 'Critical';
  if (risk === 'high')     return 'High';
  if (risk === 'medium')   return 'Medium';
  return 'Low';
};

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');

// Compliance action badge colors
const complianceActionStyle = (action: string) => {
  switch (action) {
    case 'Status Change':    return { bg: '#fef3c7', color: '#92400e' };
    case 'Section Transfer': return { bg: '#dcfce7', color: '#166534' };
    case 'Link Update':      return { bg: '#dbeafe', color: '#1e40af' };
    case 'Create':           return { bg: '#f0fdf4', color: '#16a34a' };
    case 'Delete':           return { bg: '#fee2e2', color: '#dc2626' };
    case 'Submit/Cancel':    return { bg: '#ede9fe', color: '#6d28d9' };
    default:                 return { bg: '#f1f5f9', color: '#475569' };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ProgCell({ pct, color }: { pct: number; color: 'teal' | 'amber' | 'red' }) {
  const barColor = color === 'teal' ? '#16a34a' : color === 'amber' ? '#d97706' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 64, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: barColor, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: barColor, minWidth: 34 }}>{pct}%</span>
    </div>
  );
}

function progColor(pct: number): 'teal' | 'amber' | 'red' {
  return pct >= 80 ? 'teal' : pct >= 65 ? 'amber' : 'red';
}

function Pagination({ page, totalPages, onPageChange, total }: {
  page: number; totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, color: '#64748b', flexWrap: 'wrap', gap: 10 }}>
      <span>{total} records</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.2s ease' }}
          onMouseEnter={e => { if (page !== 1) e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          {I.prev} Prev
        </button>
        <span>Page <b>{page}</b> / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
          style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 10px', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.2s ease' }}
          onMouseEnter={e => { if (page !== totalPages) e.currentTarget.style.background = '#f1f5f9'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          Next {I.next}
        </button>
      </div>
    </div>
  );
}

function EmptyRow({ cols, msg = 'No data found' }: { cols: number; msg?: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: 13 }}>
        {msg}
      </td>
    </tr>
  );
}

function InlineSpinner({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY BAR
// ═══════════════════════════════════════════════════════════════════════════════
function SummaryBar({ tab, data }: { tab: TabId; data: any }) {
  const configs: Record<TabId, Array<{ label: string; value: any; color: string; bg: string }>> = {
    teacher:    [
      { label: 'Total Teachers',   value: data.total,          color: '#2563EB', bg: '#EFF6FF'  },
      { label: 'Avg Compliance',   value: `${data.avgCompliance}%`, color: '#16a34a', bg: '#dcfce7' },
      { label: 'Schedule Conflicts', value: data.conflicts,    color: '#dc2626', bg: '#fee2e2'  },
      { label: 'Avg Classes/Month', value: data.avgClasses,    color: '#3b82f6', bg: '#dbeafe'  },
    ],
    student:    [
      { label: 'At-Risk Students', value: data.totalAtRisk, color: '#dc2626', bg: '#fee2e2'  },
      { label: 'Critical',         value: data.critical,    color: '#dc2626', bg: '#fee2e2'  },
      { label: 'High Risk',        value: data.high,        color: '#d97706', bg: '#fef3c7'  },
      { label: 'Medium Risk',      value: data.medium,      color: '#d97706', bg: '#fef3c7'  },
    ],
    ops:        [
      { label: 'Total Sections',   value: data.totalSections, color: '#8B5CF6', bg: '#F5F3FF' },
      { label: 'Ghost Classes',    value: data.ghost,          color: '#dc2626', bg: '#fee2e2' },
      { label: 'Unassigned',       value: data.unassigned,     color: '#d97706', bg: '#fef3c7' },
      { label: 'At Capacity',      value: data.atCapacity,     color: '#dc2626', bg: '#fee2e2' },
    ],
    online:     [
      { label: 'Scheduled',   value: data.scheduled,            color: '#D97706', bg: '#FFFBEB' },
      { label: 'Conducted',   value: data.conducted,            color: '#16a34a', bg: '#dcfce7' },
      { label: 'Not Held',    value: data.notHeld,              color: '#dc2626', bg: '#fee2e2' },
      { label: 'Avg Join Rate', value: `${data.avgJoinRate}%`,  color: '#16a34a', bg: '#dcfce7' },
    ],
    compliance: [
      { label: 'Total Actions',   value: data.total,         color: '#8B5CF6', bg: '#F5F3FF' },
      { label: 'Status Changes',  value: data.statusChanges, color: '#d97706', bg: '#fef3c7' },
      { label: 'Transfers',       value: data.transfers,     color: '#3b82f6', bg: '#dbeafe' },
      { label: 'Link Updates',    value: data.linkUpdates,   color: '#16a34a', bg: '#dcfce7' },
    ],
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
      {configs[tab].map(c => (
        <div
          key={c.label}
          style={{ background: c.bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${c.color}22`, transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: 10, color: c.color, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: c.color, letterSpacing: '-1px' }}>{c.value ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AcadReports() {
  const {
    loading, coreLoaded, error,
    dateRange, setDateRange,
    fetchAllReports, onTabActivate,
    teacherData, teacherSummary,
    atRiskStudents, studentSummary,
    sectionOccupancy, operationalGaps, opsSummary,
    onlineClasses, onlineSummary,
    complianceLogs, complianceLoading, complianceLoaded, complianceSummary,
    exportToExcel, exportToPDF, exportToCSV,
  } = useAcadReports();

  const [activeTab, setActiveTabRaw] = useState<TabId>('teacher');
  const setActiveTab = (tab: TabId) => {
    setActiveTabRaw(tab);
    onTabActivate(tab);
  };

  // ── Filters ──────────────────────────────────────────────────────────────
  const [teacherFilter,    setTeacherFilter]    = useState('All Teachers');
  const [riskFilter,       setRiskFilter]       = useState('All');
  const [searchStudent,    setSearchStudent]    = useState('');
  const [searchCompliance, setSearchCompliance] = useState('');
  const [subjectFilter,    setSubjectFilter]    = useState('All Subjects');
  const [statusFilter,     setStatusFilter]     = useState('All');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [teacherPage,    setTeacherPage]    = useState(1);
  const [studentPage,    setStudentPage]    = useState(1);
  const [opsPage,        setOpsPage]        = useState(1);
  const [onlinePage,     setOnlinePage]     = useState(1);
  const [compliancePage, setCompliancePage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setTeacherPage(1); setStudentPage(1); setOpsPage(1); setOnlinePage(1); setCompliancePage(1);
  }, [teacherFilter, riskFilter, searchStudent, subjectFilter, searchCompliance, statusFilter, activeTab]);

  // ── Dynamic filter options ─────────────────────────────────────────────────
  const teacherOptions = useMemo(() => ['All Teachers', ...Array.from(new Set(teacherData.map(t => t.name))).sort()], [teacherData]);
  const subjectOptions = useMemo(() => ['All Subjects', ...Array.from(new Set(onlineClasses.map(c => c.subject))).sort()], [onlineClasses]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredTeachers = useMemo(() => {
    let d = teacherData;
    if (teacherFilter !== 'All Teachers') d = d.filter(t => t.name === teacherFilter);
    return d;
  }, [teacherData, teacherFilter]);

  const filteredAtRisk = useMemo(() => {
    let d = atRiskStudents;
    if (riskFilter !== 'All') d = d.filter(s => s.risk === riskFilter.toLowerCase());
    if (searchStudent) d = d.filter(s => s.name.toLowerCase().includes(searchStudent.toLowerCase()) || s.student_id.toLowerCase().includes(searchStudent.toLowerCase()));
    return d;
  }, [atRiskStudents, riskFilter, searchStudent]);

  const filteredOnline = useMemo(() => {
    let d = onlineClasses;
    if (teacherFilter !== 'All Teachers') d = d.filter(c => c.teacher === teacherFilter);
    if (subjectFilter !== 'All Subjects') d = d.filter(c => c.subject === subjectFilter);
    if (statusFilter === 'Conducted')     d = d.filter(c => c.conducted);
    if (statusFilter === 'Not Held')      d = d.filter(c => !c.conducted);
    return d;
  }, [onlineClasses, teacherFilter, subjectFilter, statusFilter]);

  const filteredOpsGaps = useMemo(() => {
    let d = operationalGaps;
    if (subjectFilter !== 'All Subjects') d = d.filter(g => g.subject === subjectFilter);
    if (statusFilter !== 'All') d = d.filter(g => g.status === statusFilter.toLowerCase());
    return d;
  }, [operationalGaps, subjectFilter, statusFilter]);

  const filteredCompliance = useMemo(() => {
    let d = complianceLogs;
    if (searchCompliance) d = d.filter(l =>
      l.entity.toLowerCase().includes(searchCompliance.toLowerCase()) ||
      l.action.toLowerCase().includes(searchCompliance.toLowerCase()) ||
      l.by.toLowerCase().includes(searchCompliance.toLowerCase())
    );
    if (statusFilter !== 'All') d = d.filter(l => l.action === statusFilter);
    return d;
  }, [complianceLogs, searchCompliance, statusFilter]);

  // ── Paginated slices ──────────────────────────────────────────────────────
  const paginatedTeachers   = useMemo(() => filteredTeachers.slice((teacherPage - 1) * PAGE_SIZE, teacherPage * PAGE_SIZE), [filteredTeachers, teacherPage]);
  const paginatedStudents   = useMemo(() => filteredAtRisk.slice((studentPage - 1) * PAGE_SIZE, studentPage * PAGE_SIZE), [filteredAtRisk, studentPage]);
  const paginatedOpsGaps    = useMemo(() => filteredOpsGaps.slice((opsPage - 1) * PAGE_SIZE, opsPage * PAGE_SIZE), [filteredOpsGaps, opsPage]);
  const paginatedOnline     = useMemo(() => filteredOnline.slice((onlinePage - 1) * PAGE_SIZE, onlinePage * PAGE_SIZE), [filteredOnline, onlinePage]);
  const paginatedCompliance = useMemo(() => filteredCompliance.slice((compliancePage - 1) * PAGE_SIZE, compliancePage * PAGE_SIZE), [filteredCompliance, compliancePage]);

  const teacherTotalPages    = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));
  const studentTotalPages    = Math.max(1, Math.ceil(filteredAtRisk.length / PAGE_SIZE));
  const opsTotalPages        = Math.max(1, Math.ceil(filteredOpsGaps.length / PAGE_SIZE));
  const onlineTotalPages     = Math.max(1, Math.ceil(filteredOnline.length / PAGE_SIZE));
  const complianceTotalPages = Math.max(1, Math.ceil(filteredCompliance.length / PAGE_SIZE));

  // ── Export handlers ───────────────────────────────────────────────────────
  const currentExportRows = (): { forSheet: any[]; forPdfHeaders: string[]; forPdfRows: any[][]; filename: string } => {
    switch (activeTab) {
      case 'teacher':
        return {
          filename: 'teacher_performance',
          forSheet: filteredTeachers.map(t => ({ Teacher: t.name, Sections: t.sections, 'Hrs/Wk': t.hrsPerWeek, 'Att Compliance %': t.attCompliance, 'Assessment Sub %': t.assessSubmission, 'Conducted/Total': `${t.conducted}/${t.total}`, Conflict: t.conflict ? 'Yes' : 'No' })),
          forPdfHeaders: ['Teacher', 'Sections', 'Hrs/Wk', 'Att Comp%', 'Assess Sub%', 'Conducted', 'Total'],
          forPdfRows: filteredTeachers.map(t => [t.name, t.sections, t.hrsPerWeek, `${t.attCompliance}%`, `${t.assessSubmission}%`, t.conducted, t.total]),
        };
      case 'student':
        return {
          filename: 'at_risk_students',
          // 👇 Plain‑text risk for Excel/CSV
          forSheet: filteredAtRisk.map(s => ({ 
            Student: s.name, 
            ID: s.student_id, 
            Section: s.section, 
            'Attendance %': s.attendance, 
            'Avg Score %': s.avgScore ?? '—', 
            'Risk Level': pdfRiskLabel(s.risk)   // ✅ plain text
          })),
          forPdfHeaders: ['Student', 'ID', 'Section', 'Att%', 'Avg Score%', 'Risk'],
          // 👇 Plain‑text risk for PDF
          forPdfRows: filteredAtRisk.map(s => [
            s.name,
            s.student_id,
            s.section,
            `${s.attendance}%`,
            s.avgScore ? `${s.avgScore}%` : '—',
            pdfRiskLabel(s.risk),   // ✅ plain text
          ]),
        };
      case 'ops':
        return {
          filename: 'operational_gaps',
          forSheet: filteredOpsGaps,
          forPdfHeaders: ['Section', 'Subject', 'Issue', 'Status'],
          forPdfRows: filteredOpsGaps.map(g => [g.section, g.subject, g.issue, g.status]),
        };
      case 'online':
        return {
          filename: 'online_classes',
          forSheet: filteredOnline.map(c => ({ Date: c.date, Subject: c.subject, Section: c.section, Teacher: c.teacher, Conducted: c.conducted ? 'Yes' : 'No', 'Join Rate': c.joinRate !== null ? `${c.joinRate}%` : '—' })),
          forPdfHeaders: ['Date', 'Subject', 'Section', 'Teacher', 'Conducted', 'Join Rate'],
          forPdfRows: filteredOnline.map(c => [c.date, c.subject, c.section, c.teacher, c.conducted ? 'Yes' : 'No', c.joinRate !== null ? `${c.joinRate}%` : '—']),
        };
      case 'compliance':
      default:
        return {
          filename: 'compliance_audit',
          forSheet: filteredCompliance,
          forPdfHeaders: ['Time', 'Action', 'Entity', 'By', 'IP', 'Before', 'After'],
          forPdfRows: filteredCompliance.map(l => [l.time, l.action, l.entity, l.by, l.ip, l.before, l.after]),
        };
    }
  };

  const handleExportExcel = () => { const e = currentExportRows(); exportToExcel(e.forSheet, e.filename); };
  const handleExportPDF   = () => { const e = currentExportRows(); exportToPDF(e.forPdfHeaders, e.forPdfRows, e.filename); };
  const handleExportCSV   = () => { const e = currentExportRows(); exportToCSV(e.forSheet, e.filename); };

  const applyFilters = () => {
    fetchAllReports({ from_date: dateRange.from || undefined, to_date: dateRange.to || undefined });
  };

  const resetFilters = () => {
    setDateRange({ from: '', to: '' });
    setTeacherFilter('All Teachers');
    setRiskFilter('All');
    setSearchStudent('');
    setSearchCompliance('');
    setSubjectFilter('All Subjects');
    setStatusFilter('All');
    fetchAllReports();
  };

  const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'teacher',    label: 'Teacher Performance', icon: I.teacher, color: '#16a34a' },
    { id: 'student',    label: 'Student Progress',    icon: I.warning, color: '#dc2626' },
    { id: 'ops',        label: 'Operational',         icon: I.layers,  color: '#3b82f6' },
    { id: 'online',     label: 'Online Classes',      icon: I.video,   color: '#d97706' },
    { id: 'compliance', label: 'Compliance',          icon: I.shield,  color: '#8b5cf6' },
  ];

  const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const };
  const th: React.CSSProperties  = { textAlign: 'left', padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '.7px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' as const };
  const td: React.CSSProperties  = { padding: '12px 14px', fontSize: 13, color: '#334155', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' as const };

  const summaryData =
    activeTab === 'teacher'    ? teacherSummary    :
    activeTab === 'student'    ? studentSummary    :
    activeTab === 'ops'        ? opsSummary        :
    activeTab === 'online'     ? onlineSummary     : complianceSummary;

  // ── Initial load only ──
  if (loading && !coreLoaded) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>Loading reports from ERPNext…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error && !coreLoaded) return (
    <div style={{ background: '#fee2e2', padding: 20, borderRadius: 12, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>⚠ {error}</span>
      <button onClick={() => fetchAllReports()} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}>Retry</button>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", padding: '0 24px 24px' }}>

      {/* ── Header Card ── */}
      <div style={{
        background: 'linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)',
        borderRadius: '0 0 22px 22px',
        padding: '26px 28px',
        marginBottom: 22,
        marginLeft: -24,
        marginRight: -24,
        boxShadow: '0 14px 32px -14px rgba(22,163,74,0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, right: 140, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.10), transparent 55%)', pointerEvents: 'none' }} />

        <div style={{
          maxWidth: 1600, margin: '0 auto',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13,
              background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', flexShrink: 0,
            }}>
              <span style={{ color: '#fff', display: 'flex' }}>{I.chart}</span>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: '-0.3px' }}>Reports & Analytics</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>Insights across teaching, students, operations & compliance</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Refresh', icon: I.refresh, onClick: () => fetchAllReports({ from_date: dateRange.from || undefined, to_date: dateRange.to || undefined }) },
              { label: 'CSV',     icon: I.download, onClick: handleExportCSV },
              { label: 'Excel',   icon: I.download, onClick: handleExportExcel },
              { label: 'PDF',     icon: I.download, onClick: handleExportPDF },
            ].map(btn => (
              <button key={btn.label} onClick={btn.onClick} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 15px', background: 'rgba(255,255,255,0.14)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, cursor: 'pointer',
                fontSize: 12.5, fontWeight: 500, backdropFilter: 'blur(6px)', transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}>
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs (segmented pill nav) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 6, boxShadow: '0 2px 10px -6px rgba(0,0,0,0.06)' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '9px 16px', fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? '#fff' : '#64748b',
              background: active ? tab.color : 'transparent',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'all .18s ease',
              boxShadow: active ? `0 6px 14px -6px ${tab.color}88` : 'none',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ display: 'flex', opacity: active ? 1 : 0.6 }}>{tab.icon}</span>
              {tab.label}
              {tab.id === 'compliance' && complianceLoading && (
                <span style={{ fontSize: 10, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Summary Bar ── */}
      <SummaryBar tab={activeTab} data={summaryData} />

      {/* ── Filters ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'flex-end', background: '#fff', padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px -6px rgba(0,0,0,0.06)' }}>
        {/* ... filters JSX identical to original ... */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Date Range</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
              style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, transition: 'border-color 0.2s ease' }} />
            <span style={{ color: '#94a3b8' }}>–</span>
            <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
              style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, transition: 'border-color 0.2s ease' }} />
          </div>
        </div>

        {(activeTab === 'teacher' || activeTab === 'online') && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Teacher</label>
            <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 150 }}>
              {teacherOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {(activeTab === 'online' || activeTab === 'ops') && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Subject</label>
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 150 }}>
              {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {activeTab === 'student' && (
          <>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Risk Level</label>
              <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 130 }}>
                {['All', 'Critical', 'High', 'Medium'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Search Student</label>
              <input type="text" placeholder="Name or ID…" value={searchStudent} onChange={e => setSearchStudent(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }} />
            </div>
          </>
        )}

        {activeTab === 'online' && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 130 }}>
              {['All', 'Conducted', 'Not Held'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {activeTab === 'ops' && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Gap Type</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 130 }}>
              {['All', 'ghost', 'unassigned'].map(s => <option key={s} value={s}>{s === 'ghost' ? 'Ghost' : s === 'unassigned' ? 'Unassigned' : s}</option>)}
            </select>
          </div>
        )}

        {activeTab === 'compliance' && (
          <>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Search Entity / Action</label>
              <input type="text" placeholder="Entity name, action, user…" value={searchCompliance} onChange={e => setSearchCompliance(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Action</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 13, minWidth: 150 }}>
                {['All', 'Status Change', 'Section Transfer', 'Link Update', 'Field Update', 'Submit/Cancel', 'Create', 'Delete'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={applyFilters}
            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 14px -6px rgba(22,163,74,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
            Apply
          </button>
          <button onClick={resetFilters}
            style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, transition: 'background 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
            Reset
          </button>
        </div>
      </div>

      {/* ══════════════ TEACHER PERFORMANCE TAB ══════════════ */}
      {activeTab === 'teacher' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Teacher Performance Overview</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{filteredTeachers.length} teachers</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Teacher</th>
                  <th style={{ ...th, textAlign: 'center' }}>Sections</th>
                  <th style={{ ...th, textAlign: 'center' }}>Hrs/Mo</th>
                  <th style={th}>Att Compliance</th>
                  <th style={{ ...th, textAlign: 'center' }}>Assess Sub</th>
                  <th style={{ ...th, textAlign: 'center' }}>Classes</th>
                  <th style={{ ...th, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTeachers.length === 0
                  ? <EmptyRow cols={7} msg="No teacher data found. Try adjusting your date range." />
                  : paginatedTeachers.map(t => (
                    <tr key={t.name} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: t.conflict ? '#fee2e2' : '#dcfce7', color: t.conflict ? '#dc2626' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {initials(t.name)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{t.name}</span>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{t.sections}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{t.hrsPerWeek}h</td>
                      <td style={td}><ProgCell pct={t.attCompliance} color={progColor(t.attCompliance)} /></td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ background: t.assessSubmission >= 75 ? '#dcfce7' : '#fee2e2', color: t.assessSubmission >= 75 ? '#16a34a' : '#dc2626', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>
                          {t.assessSubmission}%
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: t.conducted > 0 ? '#16a34a' : '#94a3b8' }}>{t.conducted}</span>
                        <span style={{ color: '#94a3b8' }}>/{t.total}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ background: t.conflict ? '#fef3c7' : '#dcfce7', color: t.conflict ? '#d97706' : '#16a34a', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>
                          {t.conflict ? '⚠ Conflict' : '✓ OK'}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <Pagination page={teacherPage} totalPages={teacherTotalPages} onPageChange={setTeacherPage} total={filteredTeachers.length} />
        </div>
      )}

      {/* ══════════════ STUDENT PROGRESS TAB ══════════════ */}
      {activeTab === 'student' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>At-Risk Students Report</span>
            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>
              {filteredAtRisk.length} flagged
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Student</th>
                  <th style={{ ...th, textAlign: 'center' }}>ID</th>
                  <th style={{ ...th, textAlign: 'center' }}>Section</th>
                  <th style={th}>Attendance</th>
                  <th style={{ ...th, textAlign: 'center' }}>Avg Score</th>
                  <th style={{ ...th, textAlign: 'center' }}>Risk Level</th>
                  <th style={{ ...th, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0
                  ? <EmptyRow cols={7} msg="No at-risk students found. 🎉 All students are on track!" />
                  : paginatedStudents.map(s => (
                    <tr key={s.student_id} style={{ background: s.risk === 'critical' ? 'rgba(220,38,38,0.02)' : 'transparent', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = s.risk === 'critical' ? 'rgba(220,38,38,0.05)' : '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = s.risk === 'critical' ? 'rgba(220,38,38,0.02)' : 'transparent'}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: riskColor(s.risk) + '22', color: riskColor(s.risk), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {initials(s.name)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{s.student_id}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{s.section}</span>
                      </td>
                      <td style={td}><ProgCell pct={s.attendance} color={progColor(s.attendance)} /></td>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: s.avgScore ? (s.avgScore >= 60 ? '#16a34a' : '#dc2626') : '#94a3b8' }}>
                        {s.avgScore !== null ? `${s.avgScore}%` : '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: riskColor(s.risk) + '18', color: riskColor(s.risk), border: `1px solid ${riskColor(s.risk)}44` }}>
                          {riskLabel(s.risk)}   {/* Screen display still uses emoji */}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {(s.risk === 'critical' || s.risk === 'high')
                          ? <button onClick={() => toast.error(`Intervention initiated for ${s.name}`)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>Intervene</button>
                          : <button onClick={() => toast(`Contact parent of ${s.name}`)} style={{ background: '#d97706', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>Contact</button>
                        }
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <Pagination page={studentPage} totalPages={studentTotalPages} onPageChange={setStudentPage} total={filteredAtRisk.length} />
        </div>
      )}

      {/* ══════════════ OPERATIONAL TAB ══════════════ */}
{activeTab === 'ops' && (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span>Section Occupancy — {sectionOccupancy.length} sections</span>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#16a34a', marginRight: 4 }} /> Low (&lt;65%)</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#d97706', marginRight: 4 }} /> Medium (65-84%)</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#dc2626', marginRight: 4 }} /> Full (≥85%)</span>
        </div>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>Section</th>
              <th style={{ ...th, textAlign: 'center' }}>Enrolled</th>
              <th style={{ ...th, textAlign: 'center' }}>Capacity</th>
              <th style={th}>Occupancy</th>
              <th style={{ ...th, textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {sectionOccupancy.length === 0
              ? <EmptyRow cols={5} msg="No sections found" />
              : sectionOccupancy.map((s: any) => {
                  const pct = s.pct || Math.round((s.enrolled / Math.max(s.capacity, 1)) * 100);
                  
                  // ── Color based on percentage ──
                  let color = '#16a34a'; // Green (default)
                  let bgColor = '#dcfce7';
                  let statusLabel = '🟢 Available';
                  
                  if (pct >= 85) {
                    color = '#dc2626'; // Red
                    bgColor = '#fee2e2';
                    statusLabel = '🔴 Full';
                  } else if (pct >= 65) {
                    color = '#d97706'; // Amber
                    bgColor = '#fef3c7';
                    statusLabel = '🟡 Medium';
                  }
                  
                  return (
                    <tr key={s.section} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...td, fontWeight: 700 }}>{s.section}</td>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700, color }}>{s.enrolled}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>{s.capacity}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ 
                            width: 100, 
                            height: 8, 
                            background: '#e2e8f0', 
                            borderRadius: 4, 
                            overflow: 'hidden',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                          }}>
                            <div style={{ 
                              width: `${Math.min(pct, 100)}%`, 
                              height: '100%', 
                              background: `linear-gradient(90deg, ${color}88, ${color})`,
                              borderRadius: 4,
                              transition: 'width 0.5s ease',
                              boxShadow: `0 0 12px ${color}44`,
                            }} />
                          </div>
                          <span style={{ 
                            fontSize: 12, 
                            fontWeight: 700, 
                            color: color,
                            minWidth: 40,
                          }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ 
                          padding: '3px 12px', 
                          borderRadius: 20, 
                          fontSize: 11, 
                          fontWeight: 700,
                          background: bgColor,
                          color: color,
                          border: `1px solid ${color}33`,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
    </div>

    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>Operational Gaps</span>
        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>
          {filteredOpsGaps.length} issues
        </span>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>Section</th>
              <th style={th}>Subject</th>
              <th style={th}>Issue</th>
              <th style={{ ...th, textAlign: 'center' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOpsGaps.length === 0
              ? <EmptyRow cols={4} msg="No operational gaps detected! ✓" />
              : paginatedOpsGaps.map((g, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, fontWeight: 700 }}>{g.section}</td>
                  <td style={td}>{g.subject}</td>
                  <td style={{ ...td, fontSize: 12, color: '#64748b' }}>{g.issue}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: g.status === 'ghost' ? '#fee2e2' : g.status === 'unassigned' ? '#fef3c7' : '#dbeafe', color: g.status === 'ghost' ? '#dc2626' : g.status === 'unassigned' ? '#d97706' : '#3b82f6' }}>
                      {g.status === 'ghost' ? '👻 Ghost' : g.status === 'unassigned' ? '⚠ Unassigned' : '🕐 Unmarked'}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <Pagination page={opsPage} totalPages={opsTotalPages} onPageChange={setOpsPage} total={filteredOpsGaps.length} />
    </div>
  </div>
)}

      {/* ══════════════ ONLINE CLASSES TAB ══════════════ */}
      {activeTab === 'online' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Online Class Report — Student Join Rates</span>
            <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>
              {onlineSummary.conducted}/{onlineSummary.scheduled} conducted
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={tbl}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Subject</th>
                  <th style={th}>Section</th>
                  <th style={th}>Teacher</th>
                  <th style={{ ...th, textAlign: 'center' }}>Status</th>
                  <th style={th}>Join Rate</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOnline.length === 0
                  ? <EmptyRow cols={6} msg="No online class records found for selected filters." />
                  : paginatedOnline.map((c, i) => (
                    <tr key={i} style={{ background: !c.conducted ? 'rgba(220,38,38,0.02)' : 'transparent', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                        onMouseEnter={e => e.currentTarget.style.background = !c.conducted ? 'rgba(220,38,38,0.05)' : '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = !c.conducted ? 'rgba(220,38,38,0.02)' : 'transparent'}>
                      <td style={{ ...td, fontSize: 12, color: '#64748b' }}>{c.date}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{c.subject}</td>
                      <td style={td}>
                        <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{c.section}</span>
                      </td>
                      <td style={{ ...td, color: c.teacher === '—' ? '#dc2626' : '#334155' }}>{c.teacher}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, background: c.conducted ? '#dcfce7' : '#fee2e2', color: c.conducted ? '#16a34a' : '#dc2626' }}>
                          {c.conducted ? '✓ Conducted' : '✗ Not Held'}
                        </span>
                      </td>
                      <td style={td}>
                        {c.joinRate !== null
                          ? <ProgCell pct={c.joinRate} color={progColor(c.joinRate)} />
                          : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        }
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <Pagination page={onlinePage} totalPages={onlineTotalPages} onPageChange={setOnlinePage} total={filteredOnline.length} />
        </div>
      )}

      {/* ══════════════ COMPLIANCE TAB ══════════════ */}
      {activeTab === 'compliance' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Compliance & Audit Trail</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{filteredCompliance.length} records</span>
          </div>

          {complianceLoading && !complianceLoaded ? (
            <InlineSpinner label="Loading compliance audit trail…" />
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, whiteSpace: 'nowrap' }}>Timestamp</th>
                      <th style={th}>Action</th>
                      <th style={th}>Entity</th>
                      <th style={th}>Changed By</th>
                      <th style={th}>IP</th>
                      <th style={th}>Before</th>
                      <th style={th}>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCompliance.length === 0
                      ? <EmptyRow cols={7} msg="No audit records found for the selected filters." />
                      : paginatedCompliance.map((l, i) => {
                          const as = complianceActionStyle(l.action);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ ...td, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{l.time}</td>
                              <td style={td}>
                                <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: as.bg, color: as.color }}>
                                  {l.action}
                                </span>
                              </td>
                              <td style={{ ...td, fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{l.entity}</td>
                              <td style={td}>{l.by}</td>
                              <td style={{ ...td, fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{l.ip}</td>
                              <td style={{ ...td, fontSize: 12, color: '#94a3b8', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.before}>{l.before}</td>
                              <td style={{ ...td, fontSize: 12, color: '#475569', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.after}>{l.after}</td>
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
              <Pagination page={compliancePage} totalPages={complianceTotalPages} onPageChange={setCompliancePage} total={filteredCompliance.length} />
            </>
          )}
        </div>
      )}
    </div>
  );
}