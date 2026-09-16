// pages/AcadAttendance.tsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAcadAttendance, AttendanceRecord, StudentWithAttendance,
  AttStatus, RosterStudent, StudentGroupItem, AcademicTermItem,
  isWeekendDate,
} from '../hooks/UseAcadAttendance';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════
type TabId        = 'heatmap' | 'daily' | 'flagged' | 'mark';
type QuickRangeKey = 'this_month' | 'last_month' | 'all';

interface ProgramItem { name: string }

// ═══════════════════════════════════════════════════════════════════════════════
// DATE RANGE HELPER
// ═══════════════════════════════════════════════════════════════════════════════
function getQuickRange(key: QuickRangeKey, earliestDate?: string): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  switch (key) {
    case 'this_month':
      return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
    case 'last_month':
      return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
    case 'all':
      return { from: earliestDate || '1900-01-01', to: fmt(now) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
const Ic = {
  activity:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  calendar:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  warning:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  edit:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  save:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  close:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  refresh:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>,
  download:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  chevron:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  leftArrow:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  rightArrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  trash:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  attendance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>,
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS STYLE MAP
// ═══════════════════════════════════════════════════════════════════════════════
const STATUS_STYLE: Record<AttStatus, { bg: string; border: string; text: string; icon: string }> = {
  Present: { bg: '#dcfce7', border: '#16a34a', text: '#16a34a', icon: '✓' },
  Absent:  { bg: '#fee2e2', border: '#dc2626', text: '#dc2626', icon: '✗' },
  Leave:   { bg: '#fef3c7', border: '#d97706', text: '#d97706', icon: '◐' },
};
const STATUS_LIST: AttStatus[] = ['Present', 'Absent', 'Leave'];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const attColor = (p: number) => p >= 75 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626';
const attBg    = (p: number) => p >= 75 ? '#dcfce7' : p >= 60 ? '#fef3c7' : '#fee2e2';

const riskStyle = (level: string) => ({
  critical: { bg: '#fee2e2', color: '#dc2626', label: '🚨 Critical' },
  high:     { bg: '#fee2e2', color: '#dc2626', label: '⚠ High'     },
  medium:   { bg: '#fef3c7', color: '#d97706', label: '⚡ Medium'  },
  ok:       { bg: '#dcfce7', color: '#16a34a', label: '✓ OK'       },
}[level] ?? { bg: '#f1f5f9', color: '#64748b', label: '—' });

function getRisk(s: StudentWithAttendance): 'critical' | 'high' | 'medium' | 'ok' {
  if (s.overall < 60 || s.consecAbsences >= 5) return 'critical';
  if (s.overall < 70 || s.consecAbsences >= 3) return 'high';
  if (s.overall < 75 || s.consecAbsences >= 2) return 'medium';
  return 'ok';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPARKLINE
// ═══════════════════════════════════════════════════════════════════════════════
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const W = 60, H = 20, max = Math.max(...data, 1);
  const pts = data.map((v, i) =>
    `${(i / Math.max(data.length - 1, 1)) * W},${H - (v / max) * (H - 4) - 2}`
  ).join(' ');
  const lx = (data.length - 1) / Math.max(data.length - 1, 1) * W;
  const ly = H - (data[data.length - 1] / max) * (H - 4) - 2;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════════════════
function Spinner({ small }: { small?: boolean }) {
  const sz = small ? 18 : 44;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: small ? 0 : 400 }}>
      <div style={{
        width: sz, height: sz,
        border: `${small ? 2 : 3}px solid #e2e8f0`,
        borderTopColor: '#16a34a', borderRadius: '50%',
        animation: 'attSpin 0.75s linear infinite', flexShrink: 0,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLED SELECT
// ═══════════════════════════════════════════════════════════════════════════════
function FSelect({
  label, value, onChange, options, placeholder, loading, minW = 160,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string;
  loading?: boolean; minW?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: Math.min(minW, 160), flex: '1 1 150px' }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          style={{
            appearance: 'none', width: '100%',
            padding: '9px 36px 9px 14px',
            border: '1.5px solid #e2e8f0', borderRadius: 10,
            fontSize: 13.5, fontWeight: 500, color: '#0f172a',
            background: loading ? '#f8fafc' : '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            outline: 'none', fontFamily: 'inherit',
            transition: 'border-color .15s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#16a34a')}
          onBlur={e  => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8', display: 'flex' }}>
          {loading ? <Spinner small /> : Ic.chevron}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI STRIP
// ═══════════════════════════════════════════════════════════════════════════════
function KpiStrip({ total, present, absent, leave, rate, flagged }: {
  total: number; present: number; absent: number; leave: number; rate: number; flagged: number;
}) {
  const cards = [
    { label: 'Total Records',    value: total,        color: '#2563EB', bg: '#EFF6FF', border: 'rgba(37,99,235,.2)' },
    { label: 'Present',          value: present,      color: '#16a34a', bg: '#dcfce7', border: 'rgba(22,163,74,.2)' },
    { label: 'Absent',           value: absent,       color: '#dc2626', bg: '#fee2e2', border: 'rgba(220,38,38,.2)' },
    { label: 'Leave',            value: leave,        color: '#d97706', bg: '#fef3c7', border: 'rgba(217,119,6,.2)' },
    { label: 'Avg Attendance',   value: `${rate}%`,   color: attColor(rate), bg: attBg(rate), border: 'transparent' },
    { label: 'Below 75% (Risk)', value: flagged,      color: '#dc2626', bg: '#fee2e2', border: 'rgba(220,38,38,.2)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
      {cards.map(c => (
        <div
          key={c.label}
          style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: '14px 16px', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(0,0,0,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: 10, color: c.color, textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 700, marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: c.color, letterSpacing: '-1px' }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER BAR (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
interface FilterBarProps {
  onFilterChange: (prog: string, group: string, from: string, to: string) => void;
  exportRecords: AttendanceRecord[];
  fetchAllGroups: () => Promise<StudentGroupItem[]>;
  fetchAcademicTerms: () => Promise<AcademicTermItem[]>;
}

function FilterBar({ onFilterChange, exportRecords, fetchAllGroups, fetchAcademicTerms }: FilterBarProps) {
  const [programs,  setPrograms]  = useState<ProgramItem[]>([]);
  const [allGroups, setAllGroups] = useState<StudentGroupItem[]>([]);
  const [terms,     setTerms]     = useState<AcademicTermItem[]>([]);
  const [loadingP,  setLoadingP]  = useState(false);
  const [loadingG,  setLoadingG]  = useState(false);
  const [loadingT,  setLoadingT]  = useState(false);

  const [program,   setProgram]   = useState('');
  const [group,     setGroup]     = useState('');
  const [dateRange, setDateRange] = useState<string>('');

  const loadPrograms = useCallback(async () => {
    setLoadingP(true);
    try {
      const params = new URLSearchParams();
      params.set('fields', JSON.stringify(['name']));
      params.set('limit_page_length', '500');
      params.set('order_by', 'name asc');
      const res = await fetch(`/api/resource/Program?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}`);
      const d = await res.json();
      setPrograms((d.data || []).map((p: any) => ({ name: p.name })));
    } catch (e) {
      console.error('[Attendance] loadPrograms error:', e);
      toast.error('Could not load programs');
    } finally { setLoadingP(false); }
  }, []);

  const loadGroups = useCallback(async () => {
    setLoadingG(true);
    try {
      const list = await fetchAllGroups();
      setAllGroups(list);
    } finally { setLoadingG(false); }
  }, [fetchAllGroups]);

  const loadTerms = useCallback(async () => {
    setLoadingT(true);
    try {
      const list = await fetchAcademicTerms();
      setTerms(list);
      const todayStr = new Date().toISOString().split('T')[0];
      const current = list.find(t => t.term_start_date <= todayStr && todayStr <= t.term_end_date);
      if (current) {
        setDateRange(current.name);
      } else if (list.length > 0) {
        setDateRange(list[0].name);
      } else {
        setDateRange('this_month');
      }
    } finally { setLoadingT(false); }
  }, [fetchAcademicTerms]);

  useEffect(() => { loadPrograms(); loadGroups(); loadTerms(); }, []);

  const filteredGroups = useMemo(() =>
    program ? allGroups.filter(g => g.program === program) : allGroups,
    [allGroups, program]
  );

  const handleProgram = (v: string) => { setProgram(v); setGroup(''); };

  const earliestKnownDate = useMemo(() => {
    if (!terms.length) return undefined;
    return terms.reduce((min, t) => (t.term_start_date < min ? t.term_start_date : min), terms[0].term_start_date);
  }, [terms]);

  const resolvedRange = useMemo(() => {
    if (!dateRange) return null;
    const matchedTerm = terms.find(t => t.name === dateRange);
    if (matchedTerm) {
      return { from: matchedTerm.term_start_date, to: matchedTerm.term_end_date };
    }
    if (dateRange === 'this_month' || dateRange === 'last_month' || dateRange === 'all') {
      return getQuickRange(dateRange as QuickRangeKey, earliestKnownDate);
    }
    return null;
  }, [dateRange, terms, earliestKnownDate]);

  useEffect(() => {
    if (!resolvedRange) return;
    onFilterChange(program, group, resolvedRange.from, resolvedRange.to);
  }, [program, group, resolvedRange?.from, resolvedRange?.to]);

  const fromD = resolvedRange?.from ?? '';
  const toD   = resolvedRange?.to   ?? '';

  const handleExcelExport = async () => {
    if (!exportRecords.length) { toast.error('No records to export'); return; }
    try {
      const XLSX = await import('xlsx');
      const rows = exportRecords.map(r => ({
        'Date':         r.date,
        'Student ID':   r.student,
        'Student Name': r.student_name,
        'Group':        r.student_group,
        'Status':       r.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      const fname = `Attendance${program ? '_' + program.replace(/\s+/g, '-') : ''}${group ? '_' + group : ''}_${fromD}_${toD}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast.success('Excel downloaded');
    } catch { toast.error('xlsx not available — run: npm i xlsx'); }
  };

  const handlePdfExport = () => {
    const prev = document.title;
    document.title = `Attendance${program ? ' – ' + program : ''}${group ? ' ' + group : ''} (${fromD} to ${toD})`;
    window.print();
    document.title = prev;
  };

  const DR_OPTIONS = [
    ...terms.map(t => ({
      value: t.name,
      label: `${t.term_name || t.name}${t.academic_year ? ` (${t.academic_year})` : ''}`,
    })),
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'all',        label: 'All Records' },
  ];

  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16,
      padding: '18px 20px', marginBottom: 16,
      boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <FSelect label="Grade" value={program} onChange={handleProgram}
          loading={loadingP} placeholder="All Grades"
          options={programs.map(p => ({ value: p.name, label: p.name }))} minW={170} />
        <FSelect label="Section" value={group} onChange={setGroup}
          loading={loadingG} placeholder={program ? 'All Sections' : 'All Groups'}
          options={filteredGroups.map(g => ({ value: g.name, label: g.name }))} minW={170} />
        <FSelect label="Academic Term" value={dateRange}
          onChange={setDateRange}
          loading={loadingT}
          options={DR_OPTIONS} minW={220} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 150px' }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b' }}>Period</label>
          <div style={{ padding: '9px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 500, background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fromD && toD ? `${fromD} → ${toD}` : '—'}
          </div>
        </div>
        <div style={{ flex: '1 1 0', minWidth: 0 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={() => { loadPrograms(); loadGroups(); loadTerms(); toast.success('Refreshed'); }}
            title="Refresh filters"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', color: '#334155', transition: 'background 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
            {Ic.refresh}
          </button>
          <button onClick={handlePdfExport}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#334155', transition: 'background 0.2s ease', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
            {Ic.download} PDF
          </button>
          <button onClick={handleExcelExport} disabled={!exportRecords.length}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: exportRecords.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', color: '#334155', opacity: exportRecords.length ? 1 : 0.5, transition: 'background 0.2s ease', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { if (exportRecords.length) e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
            {Ic.download} Excel
          </button>
        </div>
      </div>

      {(program || group) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Active:</span>
          {program && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe' }}>
              📚 {program}
              <button onClick={() => handleProgram('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: 0, fontSize: 15, lineHeight: 1 }}>×</button>
            </span>
          )}
          {group && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              🏫 {group}
              <button onClick={() => setGroup('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', padding: 0, fontSize: 15, lineHeight: 1 }}>×</button>
            </span>
          )}
          <button onClick={() => { handleProgram(''); setGroup(''); }}
            style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS POPUP (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
function SuccessPopup({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(2px)' }}
      onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 40px', textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', animation: 'attPopIn .3s cubic-bezier(.34,1.56,.64,1)',
        minWidth: 280, maxWidth: 360,
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#dcfce7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          animation: 'attCheckPop .4s cubic-bezier(.34,1.56,.64,1) .1s both',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: subtitle ? 6 : 0 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: '#64748b' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT MODAL (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
function EditModal({ record, onClose, onUpdate, onDelete, onSuccess }: {
  record: AttendanceRecord;
  onClose: () => void;
  onUpdate: (name: string, status: AttStatus) => Promise<boolean>;
  onDelete: (name: string) => Promise<boolean>;
  onSuccess: (title: string, subtitle?: string) => void;
}) {
  const [sel,      setSel]      = useState<AttStatus>(record.status);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm,  setConfirm]  = useState(false);

  const SC = STATUS_STYLE;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, zIndex: 1000, backdropFilter: 'blur(3px)', padding: '80px 16px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'attModalIn .25s ease' }}>
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Update Attendance</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{record.student_name} · {record.date}</div>
          </div>
          <button onClick={onClose} title="Close" style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 7, display: 'flex', transition: 'background 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}>{Ic.close}</button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {record.student_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'S'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{record.student_name}</div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>ID: {record.student} · {record.student_group}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, borderTop: '1px solid #e2e8f0', paddingTop: 10, flexWrap: 'wrap' }}>
              <div><div style={{ fontSize: 10.5, color: '#94a3b8' }}>Current</div><div style={{ fontWeight: 700, color: SC[record.status].text, marginTop: 2 }}>{SC[record.status].icon} {record.status}</div></div>
              <div><div style={{ fontSize: 10.5, color: '#94a3b8' }}>Record</div><code style={{ fontSize: 10.5, background: '#fff', padding: '2px 6px', borderRadius: 4, display: 'block', marginTop: 2 }}>{record.name}</code></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {STATUS_LIST.map(st => {
              const s = sel === st;
              return (
                <button key={st} onClick={() => setSel(st)} style={{ flex: 1, padding: '12px 8px', borderRadius: 12, border: `2px solid ${s ? SC[st].border : '#e2e8f0'}`, background: s ? SC[st].bg : 'transparent', color: s ? SC[st].text : '#94a3b8', fontWeight: s ? 700 : 500, cursor: 'pointer', fontSize: 13, transition: 'all .15s ease', fontFamily: 'inherit' }}>
                  <span style={{ display: 'block', fontSize: 18, marginBottom: 2 }}>{SC[st].icon}</span>{st}
                </button>
              );
            })}
          </div>

          {confirm ? (
            <div style={{ background: '#fee2e2', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(220,38,38,.3)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 12 }}>Delete this record permanently?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirm(false)} style={{ flex: 1, padding: '9px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={async () => { setDeleting(true); const ok = await onDelete(record.name); setDeleting(false); if (ok) onClose(); }}
                  disabled={deleting}
                  style={{ flex: 1, padding: '9px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: deleting ? .7 : 1, fontFamily: 'inherit' }}>
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => setConfirm(true)} title="Delete record"
                style={{ padding: '11px 14px', background: '#fff', border: '1.5px solid #fee2e2', borderRadius: 12, cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontFamily: 'inherit', transition: 'background 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                {Ic.trash}
              </button>
              <button onClick={onClose} style={{ flex: '1 1 80px', padding: '11px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>Cancel</button>
              <button
                onClick={async () => {
                  setSaving(true);
                  const ok = await onUpdate(record.name, sel);
                  setSaving(false);
                  if (ok) {
                    onSuccess('Attendance Updated', `${record.student_name} marked as ${sel}`);
                    onClose();
                  }
                }}
                disabled={saving || sel === record.status}
                style={{ flex: '2 1 140px', padding: '11px', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: (saving || sel === record.status) ? .6 : 1, fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEATMAP TAB (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
function HeatmapTab({ students, onIntervene }: { students: StudentWithAttendance[]; onIntervene: (s: StudentWithAttendance) => void }) {
  const flagged = students.filter(s => getRisk(s) !== 'ok');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
      <div className="card" style={{ boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#16a34a', display: 'flex' }}>{Ic.activity}</span>
            <span className="card-title">Attendance Heatmap — Last 10 Days</span>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[{ l: 'Absent', bg: '#fee2e2', b: '#fca5a5' }, { l: 'Leave', bg: '#fef3c7', b: '#fde68a' }, { l: 'Present', bg: '#16a34a', b: '#15803d' }].map(leg => (
              <span key={leg.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#64748b' }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: leg.bg, border: `1px solid ${leg.b}`, display: 'inline-block' }} />{leg.l}
              </span>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              No data — select a date range that covers your records (try "This Term").
            </div>
          ) : (
            <div style={{ minWidth: 420 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, paddingLeft: 100 }}>
                {(students[0]?.recentDates || []).map((d: string, i: number) => (
                  <div key={i} style={{ width: 22, textAlign: 'center', fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </div>
                ))}
              </div>
              {students.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                  <div style={{ width: 96, fontSize: 11.5, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                    {s.name.split(' ')[0]}
                  </div>
                  {s.pattern.map((v: number, j: number) => (
                    <div key={j}
                      title={`${s.recentDates[j] || ''}: ${v === 0 ? 'Absent' : v === 1 ? 'Leave' : 'Present'}`}
                      style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0, background: v === 0 ? '#fee2e2' : v === 1 ? '#fef3c7' : '#16a34a', border: `1px solid ${v === 0 ? '#fca5a5' : v === 1 ? '#fde68a' : '#15803d'}` }}
                    />
                  ))}
                  {Array.from({ length: Math.max(0, 10 - s.pattern.length) }).map((_, k) => (
                    <div key={`e${k}`} style={{ width: 22, height: 22, borderRadius: 5, background: '#f1f5f9', border: '1px solid #e2e8f0', flexShrink: 0 }} />
                  ))}
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: attColor(s.overall), minWidth: 34 }}>{s.overall}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#dc2626', display: 'flex' }}>{Ic.warning}</span>
            <span className="card-title">Flagged Students</span>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' }}>
            {flagged.length} at risk
          </span>
        </div>
        <div className="card-body no-pad" style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr>
              <th>Student</th>
              <th style={{ textAlign: 'center' }}>Att %</th>
              <th style={{ textAlign: 'center' }}>Consec.</th>
              <th style={{ textAlign: 'center' }}>Risk</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr></thead>
            <tbody>
              {flagged.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>No flagged students 🎉</td></tr>
                : flagged.map(s => {
                    const rs = riskStyle(getRisk(s));
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: rs.bg, color: rs.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.name}</div>
                              <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{s.section}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: attColor(s.overall), fontSize: 13 }}>{s.overall}%</span></td>
                        <td style={{ textAlign: 'center', fontSize: 12, color: s.consecAbsences >= 3 ? '#dc2626' : '#d97706', fontWeight: 700 }}>{s.consecAbsences}d</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: rs.bg, color: rs.color, border: `1px solid ${rs.color}33`, whiteSpace: 'nowrap', display: 'inline-block' }}>{rs.label}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {getRisk(s) === 'critical' || getRisk(s) === 'high'
                            ? <button className="btn btn-danger btn-sm" onClick={() => onIntervene(s)}>Intervene</button>
                            : <button className="btn btn-amber btn-sm" onClick={() => toast(`Contact parent: ${s.name}`)}>Contact</button>
                          }
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY TAB (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
function DailyTab({ students, allRecords, onEdit }: {
  students: StudentWithAttendance[];
  allRecords: AttendanceRecord[];
  onEdit: (r: AttendanceRecord) => void;
}) {
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('All');
  const [dateF,   setDateF]   = useState('');
  const [page,    setPage]    = useState(1);
  const PAGE = 50;

  const uniqueDates = useMemo(() =>
    [...new Set(allRecords.map(r => r.date))].sort().reverse(), [allRecords]);

  const filtered = useMemo(() => {
    let d = allRecords;
    if (statusF !== 'All') d = d.filter(r => r.status === statusF);
    if (dateF)             d = d.filter(r => r.date === dateF);
    if (search.trim())     d = d.filter(r =>
      r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.student?.toLowerCase().includes(search.toLowerCase())
    );
    return d;
  }, [allRecords, statusF, dateF, search]);

  const totalPages = Math.ceil(filtered.length / PAGE);
  const paginated  = filtered.slice((page - 1) * PAGE, page * PAGE);
  const avg = students.length ? Math.round(students.reduce((a, s) => a + s.overall, 0) / students.length) : 0;

  return (
    <div className="card" style={{ boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#3b82f6', display: 'flex' }}>{Ic.calendar}</span>
          <span className="card-title">Daily Attendance Records</span>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: '#dcfce7', color: '#16a34a', border: '1px solid rgba(22,163,74,.2)' }}>Avg {avg}%</span>
      </div>

      <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 12px', flex: '1 1 180px' }}>
          {Ic.search}
          <input type="text" placeholder="Search name or ID…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ border: 'none', outline: 'none', padding: '8px', fontSize: 12.5, background: 'transparent', width: '100%', fontFamily: 'inherit' }} />
        </div>
        <select value={dateF} onChange={e => { setDateF(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12.5, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="">All Dates</option>
          {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}
          style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12.5, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
          <option value="All">All Status</option>
          <option value="Present">✓ Present</option>
          <option value="Absent">✗ Absent</option>
          <option value="Leave">◐ Leave</option>
        </select>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{filtered.length} records</span>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl" style={{ minWidth: 760 }}>
          <thead><tr>
            <th>Date</th><th>Student</th><th>ID</th><th>Group</th>
            <th style={{ textAlign: 'center' }}>Overall</th>
            <th style={{ textAlign: 'center' }}>Trend</th>
            <th style={{ textAlign: 'center' }}>Status</th>
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr></thead>
          <tbody>
            {paginated.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>📅 No records found</td></tr>
              : paginated.map(rec => {
                  const st = students.find(s => s.id === rec.student);
                  const trend = st?.pattern.map((v: number) => v === 0 ? 0 : v === 1 ? 50 : 100) || [];
                  const ss = STATUS_STYLE[rec.status] || STATUS_STYLE.Present;
                  return (
                    <tr key={rec.name}>
                      <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{rec.date}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: st ? attBg(st.overall) : '#f1f5f9', color: st ? attColor(st.overall) : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {rec.student_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{rec.student_name}</div>
                            <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{rec.student_group}</div>
                          </div>
                        </div>
                      </td>
                      <td><code style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 7px', borderRadius: 5 }}>{rec.student}</code></td>
                      <td><span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 500 }}>{rec.student_group}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {st ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: attColor(st.overall), fontSize: 12.5 }}>{st.overall}%</span>
                            <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: 60 }}>
                              <div style={{ width: `${st.overall}%`, height: 4, background: attColor(st.overall), borderRadius: 2 }} />
                            </div>
                          </div>
                        ) : <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {trend.length > 0 ? <Sparkline data={trend} color={st ? attColor(st.overall) : '#94a3b8'} /> : <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: ss.bg, color: ss.text, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {ss.icon} {rec.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(rec)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {Ic.edit} Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ padding: '14px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, background: '#f8fafc', flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: page === 1 ? .4 : 1 }}>{Ic.leftArrow} Prev</button>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Page {page} / {totalPages} · {filtered.length} records</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-ghost btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: page === totalPages ? .4 : 1 }}>Next {Ic.rightArrow}</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLAGGED TAB (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
function FlaggedTab({ students }: { students: StudentWithAttendance[] }) {
  const flagged = students.filter(s => s.overall < 75 || s.consecAbsences >= 2);
  return (
    <div className="card" style={{ boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#dc2626', display: 'flex' }}>{Ic.warning}</span>
          <span className="card-title">At-Risk Students — Detailed View</span>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,.2)' }}>{flagged.length} flagged</span>
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="tbl" style={{ minWidth: 900 }}>
          <thead><tr>
            <th>Student</th><th>Group</th>
            <th style={{ textAlign: 'center' }}>Overall</th>
            <th style={{ textAlign: 'center' }}>Present</th>
            <th style={{ textAlign: 'center' }}>Absent</th>
            <th style={{ textAlign: 'center' }}>Leave</th>
            <th style={{ textAlign: 'center' }}>Consec.</th>
            <th style={{ textAlign: 'center' }}>Risk</th>
            <th style={{ textAlign: 'center' }}>Trend</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr></thead>
          <tbody>
            {flagged.length === 0
              ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No at-risk students 🎉</td></tr>
              : flagged.map(s => {
                  const level = getRisk(s);
                  const rs = riskStyle(level);
                  const trend = s.pattern.map((v: number) => v === 0 ? 0 : v === 1 ? 50 : 100);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 9, background: rs.bg, color: rs.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                            {s.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                            <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 500 }}>{s.section || '—'}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: attColor(s.overall), fontSize: 14 }}>{s.overall}%</span>
                          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: 64 }}><div style={{ width: `${s.overall}%`, height: 4, background: attColor(s.overall), borderRadius: 2 }} /></div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{s.presentDays}</td>
                      <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{s.absentDays}</td>
                      <td style={{ textAlign: 'center', color: '#d97706', fontWeight: 700 }}>{s.leaveDays}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: s.consecAbsences >= 3 ? '#dc2626' : '#d97706', fontSize: 14 }}>
                          {s.consecAbsences}{s.consecAbsences >= 5 ? ' 🚨' : s.consecAbsences >= 3 ? ' ⚠' : ''}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: rs.bg, color: rs.color, border: `1px solid ${rs.color}33`, whiteSpace: 'nowrap', display: 'inline-block' }}>{rs.label}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}><Sparkline data={trend} color={attColor(s.overall)} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {level === 'critical' || level === 'high'
                            ? <button className="btn btn-danger btn-sm" onClick={() => toast.error(`Intervention: ${s.name}`)}>Intervene</button>
                            : <button className="btn btn-amber btn-sm" onClick={() => toast(`Contact: ${s.name}`)}>Contact</button>
                          }
                          <button className="btn btn-ghost btn-sm" onClick={() => toast(`View: ${s.name}`)}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARK TAB (UPDATED - fetchDateHolidayInfo approach)
// ═══════════════════════════════════════════════════════════════════════════════
interface MarkRow {
  student: string;
  student_name: string;
  status: AttStatus;
  existingName?: string;
  existingDocstatus?: number;
}

function MarkTab({
  fetchAllGroups, getStudentsByGroup, fetchAttendanceForGroupDate,
  onBulkUpsert, saving, onSuccess, fetchDateHolidayInfo,
}: {
  fetchAllGroups: () => Promise<StudentGroupItem[]>;
  getStudentsByGroup: (group: string) => Promise<RosterStudent[]>;
  fetchAttendanceForGroupDate: (group: string, date: string) => Promise<AttendanceRecord[]>;
  onBulkUpsert: (rows: any[]) => Promise<boolean>;
  saving: boolean;
  onSuccess: (title: string, subtitle?: string) => void;
  fetchDateHolidayInfo: (date: string) => Promise<{ isHoliday: boolean; holidayName?: string }>;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date,  setDate]  = useState(today);
  const [groups, setGroups] = useState<StudentGroupItem[]>([]);
  const [group, setGroup] = useState('');
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // ✅ Holiday check state
  const [holidayInfo, setHolidayInfo] = useState<{ isHoliday: boolean; holidayName?: string }>({ isHoliday: false });
  const [holidayChecking, setHolidayChecking] = useState(true);
  
  const dateIsHoliday = holidayInfo.isHoliday;
  const dateIsWeekend = isWeekendDate(date);
  const dateBlocked   = dateIsHoliday || dateIsWeekend;

  useEffect(() => {
    (async () => {
      const list = await fetchAllGroups();
      setGroups(list);
      if (list.length && !group) setGroup(list[0].name);
    })();
  }, []);

  // ✅ Holiday check with loading state - Weekend pe turant skip
  useEffect(() => {
    if (!date) { 
      setHolidayInfo({ isHoliday: false }); 
      setHolidayChecking(false);
      return; 
    }
    
    if (isWeekendDate(date)) {
      setHolidayInfo({ isHoliday: false });
      setHolidayChecking(false);
      return;
    }
    
    // ✅ Sirf weekdays pe holiday check karo (async)
    setHolidayChecking(true);
    (async () => {
      const info = await fetchDateHolidayInfo(date);
      setHolidayInfo(info);
      setHolidayChecking(false);
    })();
  }, [date, fetchDateHolidayInfo]);

  useEffect(() => {
    if (!group || !date || dateBlocked || holidayChecking) { setRows([]); return; }
    (async () => {
      setLoadingRoster(true);
      try {
        const [roster, existing] = await Promise.all([
          getStudentsByGroup(group),
          fetchAttendanceForGroupDate(group, date),
        ]);
        const existingMap = new Map(existing.map(r => [r.student, r]));
        const merged: MarkRow[] = roster.map(s => {
          const ex = existingMap.get(s.student);
          return {
            student: s.student,
            student_name: s.student_name,
            status: ex ? ex.status : 'Present',
            existingName: ex?.name,
            existingDocstatus: ex?.docstatus,
          };
        });
        setRows(merged);
      } finally {
        setLoadingRoster(false);
      }
    })();
  }, [group, date, dateBlocked, holidayChecking]);

  const counts = useMemo(() => ({
    Present: rows.filter(r => r.status === 'Present').length,
    Absent:  rows.filter(r => r.status === 'Absent').length,
    Leave:   rows.filter(r => r.status === 'Leave').length,
  }), [rows]);

  const markAll = (st: AttStatus) =>
    setRows(prev => prev.map(r => ({ ...r, status: st })));

  const handleSubmit = async () => {
    if (!rows.length) { toast.error('No students in this group'); return; }
    const newCount = rows.filter(r => !r.existingName).length;
    const updateCount = rows.filter(r => !!r.existingName).length;
    const payload = rows.map(r => ({
      student: r.student,
      student_name: r.student_name,
      student_group: group,
      date,
      status: r.status,
      existingName: r.existingName,
      existingDocstatus: r.existingDocstatus,
    }));
    const ok = await onBulkUpsert(payload);
    if (ok) {
      const parts: string[] = [];
      if (newCount)    parts.push(`${newCount} marked`);
      if (updateCount) parts.push(`${updateCount} updated`);
      onSuccess('Attendance Saved', `${group} · ${date} — ${parts.join(', ')}`);

      const existing = await fetchAttendanceForGroupDate(group, date);
      const existingMap = new Map(existing.map(r => [r.student, r]));
      setRows(prev => prev.map(r => {
        const ex = existingMap.get(r.student);
        return ex ? { ...r, existingName: ex.name, existingDocstatus: ex.docstatus, status: ex.status } : r;
      }));
    }
  };

  return (
    <div className="card" style={{ boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#16a34a', display: 'flex' }}>{Ic.edit}</span>
          <span className="card-title">Mark / Update Attendance</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_LIST.map(st => (
            <span key={st} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].text, border: `1px solid ${STATUS_STYLE[st].border}55` }}>
              {counts[st]} {st}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="filter-group">
          <label className="filter-label">Date</label>
          <input 
            type="date" 
            className="form-input" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            style={{ 
              width: 160, 
              borderColor: dateIsHoliday ? '#f59e0b' : dateIsWeekend ? '#3b82f6' : '#e2e8f0',
              borderWidth: dateBlocked ? '2px' : '1.5px',
            }}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Group / Section</label>
          <select className="filter-select" value={group} onChange={e => setGroup(e.target.value)}>
            {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
          </select>
        </div>
        {!dateBlocked && !holidayChecking && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => markAll('Present')}>✓ All Present</button>
            <button className="btn btn-ghost btn-sm" onClick={() => markAll('Absent')} style={{ borderColor: '#dc2626', color: '#dc2626' }}>✗ All Absent</button>
            <button className="btn btn-ghost btn-sm" onClick={() => markAll('Leave')} style={{ borderColor: '#d97706', color: '#d97706' }}>◐ All Leave</button>
          </div>
        )}
      </div>

      {/* ✅ HOLIDAY CHECKING LOADER */}
      {holidayChecking && !dateIsWeekend && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
          <Spinner small />
          <p style={{ fontSize: 12, marginTop: 8 }}>Checking holiday...</p>
        </div>
      )}

      {/* ✅ HOLIDAY BANNER - Sirf weekday + public holiday */}
      {/* ✅ HOLIDAY BANNER - Green Gradient (Header jaisa) */}
      {dateIsHoliday && !dateIsWeekend && !holidayChecking && (
        <div style={{
    margin: '16px 18px',
    background: 'linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)',
    borderRadius: 16,
    padding: '24px 28px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 14px 32px -14px rgba(22,163,74,0.45)',
    position: 'relative',
    overflow: 'hidden',
    }}>
    <div style={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
    <div style={{ position: 'absolute', bottom: -40, left: 100, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
    
    <span style={{ fontSize: 52, position: 'relative', zIndex: 1, lineHeight: 1 }}>🎉</span>
    <div style={{ position: 'relative', zIndex: 1 }}>
      <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '0.5px' }}>
        Holiday
      </p>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.95)', margin: '6px 0 0' }}>
        {holidayInfo.holidayName || 'Holiday'}
      </p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>
        No attendance needed on this day
      </p>
    </div>
  </div>
)}

      {/* ✅ WEEKEND BANNER - Turant dikhe, koi async wait nahi */}
      {dateIsWeekend && !dateIsHoliday && (
        <div style={{
          margin: '16px 18px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 10px 25px -8px rgba(59,130,246,0.4)',
        }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>😊</span>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
              Weekend
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '4px 0 0' }}>
              Saturday/Sunday — No classes scheduled
            </p>
          </div>
        </div>
      )}

      {!dateBlocked && !holidayChecking && (
        <>
          {loadingRoster ? (
            <Spinner small />
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              {group ? 'No students found in this group on ERP.' : 'Select a group above to load its student roster.'}
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {rows.map((r, idx) => {
                const ss = STATUS_STYLE[r.status];
                return (
                  <div key={r.student} style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: idx < rows.length - 1 ? '1px solid #e2e8f0' : 'none', background: r.status === 'Absent' ? 'rgba(220,38,38,.02)' : 'transparent', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ width: 26, fontSize: 11.5, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{idx + 1}</span>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: ss.bg, color: ss.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginRight: 12, border: `1.5px solid ${ss.border}` }}>
                      {r.student_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.student_name}</div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                        {r.student}
                        {r.existingName
                          ? <span style={{ marginLeft: 6, color: '#3b82f6' }}>· already marked ({r.existingName})</span>
                          : <span style={{ marginLeft: 6, color: '#94a3b8' }}>· not marked yet</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {STATUS_LIST.map(st => (
                        <button key={st} onClick={() => setRows(prev => prev.map(x => x.student === r.student ? { ...x, status: st } : x))}
                          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${r.status === st ? STATUS_STYLE[st].border : '#e2e8f0'}`, background: r.status === st ? STATUS_STYLE[st].bg : 'transparent', color: r.status === st ? STATUS_STYLE[st].text : '#94a3b8', transition: 'all .15s ease', fontFamily: 'inherit' }}>
                          {STATUS_STYLE[st].icon}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rows.length > 0 && (
            <div style={{ padding: '14px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !rows.length}
                style={{ minWidth: 180, opacity: saving ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {Ic.save} {saving ? 'Saving…' : `Save Attendance (${rows.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE (UPDATED - fetchDateHolidayInfo)
// ═══════════════════════════════════════════════════════════════════════════════
export default function AcadAttendance() {
  const {
    attendanceRecords, loading, error, saving,
    fetchAttendance, fetchAllGroups, fetchAcademicTerms, getStudentsByGroup,
    fetchAttendanceForGroupDate, bulkUpsertAttendance,
    updateAttendanceStatus, deleteAttendance,
    getStudentWiseSummary, fetchDateHolidayInfo,
  } = useAcadAttendance();

  const [activeTab,     setActiveTab]     = useState<TabId>('heatmap');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [currentGroup,  setCurrentGroup]  = useState('');
  const [successPopup,  setSuccessPopup]  = useState<{ title: string; subtitle?: string } | null>(null);

  const showSuccess = useCallback((title: string, subtitle?: string) => {
    setSuccessPopup({ title, subtitle });
  }, []);

  const handleFilterChange = useCallback((prog: string, grp: string, from: string, to: string) => {
    setCurrentGroup(grp);
    fetchAttendance({
      student_group: grp   || undefined,
      from_date:     from  || undefined,
      to_date:       to    || undefined,
    });
  }, [fetchAttendance]);

  const allStudents  = useMemo(() => getStudentWiseSummary(), [attendanceRecords]);

  const stats = useMemo(() => {
    const total   = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const absent  = attendanceRecords.filter(r => r.status === 'Absent').length;
    const leave   = attendanceRecords.filter(r => r.status === 'Leave').length;
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
    const flagged = allStudents.filter(s => s.overall < 75).length;
    return { total, present, absent, leave, rate, flagged };
  }, [attendanceRecords, allStudents]);

  const flaggedCount = useMemo(() =>
    allStudents.filter(s => getRisk(s) !== 'ok').length, [allStudents]);

  const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'heatmap', label: 'Heatmap View',     icon: Ic.activity, color: '#16a34a' },
    { id: 'daily',   label: 'Daily Detail',     icon: Ic.calendar, color: '#2563EB' },
    { id: 'flagged', label: 'Flagged Students', icon: Ic.warning,  color: '#dc2626' },
    { id: 'mark',    label: 'Mark / Update',    icon: Ic.edit,     color: '#8B5CF6' },
  ];

  return (
    <>
      <style>{`
        @keyframes attSpin    { to { transform: rotate(360deg); } }
        @keyframes attModalIn { from { opacity:0; transform:scale(.96) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes attPopIn   { from { opacity:0; transform:scale(.85); } to { opacity:1; transform:scale(1); } }
        @keyframes attCheckPop{ from { transform:scale(0); } to { transform:scale(1); } }
        @media print { .no-print { display:none !important; } }
      `}</style>

      {successPopup && (
        <SuccessPopup
          title={successPopup.title}
          subtitle={successPopup.subtitle}
          onClose={() => setSuccessPopup(null)}
        />
      )}

      {editingRecord && (
        <EditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onUpdate={updateAttendanceStatus}
          onDelete={deleteAttendance}
          onSuccess={showSuccess}
        />
      )}

      <div style={{ padding: '0 16px 24px', maxWidth: '100%', overflowX: 'hidden' }}>

        {/* Header Card */}
        <div style={{
          background: 'linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)',
          borderRadius: '0 0 22px 22px',
          padding: '22px 16px',
          marginBottom: 22,
          marginLeft: -16,
          marginRight: -16,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13,
                background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', flexShrink: 0,
              }}>
                <span style={{ color: '#fff', display: 'flex' }}>{Ic.attendance}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: '-0.3px' }}>Attendance</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>Track, mark & analyze student attendance across the school</p>
              </div>
            </div>
            {currentGroup && (
              <span style={{ padding: '7px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 12.5, fontWeight: 600, backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}>
                🏫 {currentGroup}
              </span>
            )}
          </div>
        </div>

        <KpiStrip {...stats} />

        <FilterBar
          onFilterChange={handleFilterChange}
          exportRecords={attendanceRecords}
          fetchAllGroups={fetchAllGroups}
          fetchAcademicTerms={fetchAcademicTerms}
        />

        <div className="breadcrumb" style={{ marginBottom: 16 }}>
          <span className="bc-link">School</span>
          <span className="bc-sep">›</span>
          <span className="bc-link">Academics</span>
          <span className="bc-sep">›</span>
          <span className="bc-current">Attendance</span>
          {currentGroup && <><span className="bc-sep">›</span><span className="bc-current">{currentGroup}</span></>}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 6, boxShadow: '0 2px 10px -6px rgba(0,0,0,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all .18s ease',
                boxShadow: active ? `0 6px 14px -6px ${tab.color}88` : 'none',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ display: 'flex', opacity: active ? 1 : .7 }}>{tab.icon}</span>
                {tab.label}
                {tab.id === 'flagged' && flaggedCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: active ? 'rgba(255,255,255,0.25)' : '#fee2e2', color: active ? '#fff' : '#dc2626', border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(220,38,38,.25)' }}>
                    {flaggedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? <Spinner /> : (
          <>
            {activeTab === 'heatmap' && (
              <HeatmapTab
                students={allStudents}
                onIntervene={s => toast.error(`Intervention sent for ${s.name}`)}
              />
            )}
            {activeTab === 'daily' && (
              <DailyTab
                students={allStudents}
                allRecords={attendanceRecords}
                onEdit={setEditingRecord}
              />
            )}
            {activeTab === 'flagged' && <FlaggedTab students={allStudents} />}
            {activeTab === 'mark' && (
              <MarkTab
                fetchAllGroups={fetchAllGroups}
                getStudentsByGroup={getStudentsByGroup}
                fetchAttendanceForGroupDate={fetchAttendanceForGroupDate}
                onBulkUpsert={bulkUpsertAttendance}
                saving={saving}
                onSuccess={showSuccess}
                fetchDateHolidayInfo={fetchDateHolidayInfo}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}