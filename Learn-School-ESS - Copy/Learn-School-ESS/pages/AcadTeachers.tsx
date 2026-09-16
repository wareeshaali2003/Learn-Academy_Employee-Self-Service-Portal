// pages/AcadTeachers.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAcadTeachers } from '../hooks/UseAcadTeachers';
import type { Program, Course, StudentGroup, Instructor, Assignment } from '../hooks/UseAcadTeachers';
import { TeacherAttendanceSection } from '../components/TeacherAttendanceSection';

// ── Icons ────────────────────────────────────────────────────
const Icons = {
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  warning: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  x: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  layers: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  arrowRight: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  chevDown: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  teachers: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  refresh: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  // ── Tab Icons ──────────────────────────────────────────────
  tabCourse: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  tabMark: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  tabView: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
};

// ── Modal ──────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(2px)', padding: '16px' }}>
      <div style={{ background: 'var(--white)', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', animation: 'fadeUp .18s ease both', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>{Icons.x}</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Searchable Teacher Select ───────────────────────────────
function TeacherSearchSelect({ instructors, value, onChange, placeholder = '-- Select Teacher --', disabled }: {
  instructors: Instructor[]; value: string; onChange: (id: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = instructors.find(i => i.name === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return instructors;
    return instructors.filter(i => (i.employee_name || i.name || '').toLowerCase().includes(q) || (i.name || '').toLowerCase().includes(q));
  }, [instructors, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)} style={{
        width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, padding: '8px 12px', minHeight: '38px',
        border: `1px solid ${open ? 'var(--teal)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--white)',
        fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: 'var(--ink)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: selected ? 'var(--ink)' : 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? (selected.employee_name || selected.name) : placeholder}
        </span>
        <span style={{ display: 'flex', color: 'var(--ink-soft)', flexShrink: 0, marginLeft: 8 }}>{Icons.chevDown}</span>
      </button>

      {open && !disabled && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.14)', zIndex: 99999, maxHeight: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>{Icons.search}</span>
              <input autoFocus type="text" placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', padding: '7px 8px 7px 28px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12.5, outline: 'none', fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 220 }}>
            {filtered.length === 0 && <div style={{ padding: '20px 12px', fontSize: 12.5, color: '#94a3b8', textAlign: 'center' }}>No teachers found</div>}
            {filtered.map((i, index) => {
              const isSelected = i.name === value;
              return (
                <div key={i.name || index} onClick={() => { onChange(i.name); setOpen(false); setQuery(''); }} style={{
                  padding: '10px 14px', fontSize: 13, cursor: 'pointer', background: isSelected ? '#e6f7f2' : 'transparent',
                  color: isSelected ? '#0b8b6f' : '#1e293b', fontWeight: isSelected ? 600 : 400,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  borderBottom: index < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isSelected ? 600 : 400, fontSize: 13, color: isSelected ? '#0b8b6f' : '#1e293b' }}>{i.employee_name || i.name}</span>
                    {i.name !== i.employee_name && <span style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>ID: {i.name}</span>}
                  </span>
                  {isSelected && <span style={{ color: '#0b8b6f' }}>{Icons.check}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Matrix Cell ──────────────────────────────────────────────
function MatrixCell({ value, onAssign, onEdit, hasConflict }: { value: string; onAssign: () => void; onEdit: () => void; hasConflict?: boolean }) {
  if (!value) {
    return <button onClick={onAssign} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', color: 'var(--ink-soft)', border: '1.5px dashed var(--border)', padding: '4px 10px', borderRadius: 6, fontSize: 11.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>{Icons.plus} Assign</button>;
  }
  if (hasConflict) {
    return <span onClick={() => toast.error('Conflict detected!')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--red-pale)', color: 'var(--red)', padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, border: '1px solid #F5C0C0', cursor: 'pointer' }}>{Icons.warning} Conflict</span>;
  }
  return <button onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--teal-pale)', color: 'var(--teal)', padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, border: '1px solid rgba(11,139,111,0.2)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>{value}</button>;
}

// ── Pagination ──────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
  else { pages.push(1); if (currentPage > 3) pages.push('...'); for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i); if (currentPage < totalPages - 2) pages.push('...'); pages.push(totalPages); }

  const btnStyle = (active = false): React.CSSProperties => ({ minWidth: 34, height: 34, padding: '0 8px', borderRadius: 8, border: `1.5px solid ${active ? 'var(--teal)' : 'var(--border)'}`, background: active ? 'var(--teal-pale)' : 'var(--white)', color: active ? 'var(--teal)' : 'var(--ink)', fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" });

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, padding: '12px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={{ ...btnStyle(), opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
      {pages.map((p, i) => p === '...' ? <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--ink-soft)', fontSize: 13 }}>…</span> : <button key={p} onClick={() => onPageChange(p as number)} style={btnStyle(p === currentPage)}>{p}</button>)}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...btnStyle(), opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
    </div>
  );
}

// ── Main Tab Style ──────────────────────────────────────────
function mainTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '9px 22px',
    borderRadius: 50,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Sans',sans-serif",
    transition: 'all 0.25s ease',
    background: active ? '#16a34a' : 'transparent',
    color: active ? '#fff' : '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: active ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
    transform: active ? 'scale(1.02)' : 'scale(1)',
  };
}

// ── Main Component ───────────────────────────────────────────
const PAGE_SIZE = 8;

export default function Teachers() {
  const { loading, switchingGrade, refreshing, error, programs, courses, instructors, studentGroups,
    selectedProgram, setSelectedProgram, assignments, courseScheduleRecords, conflicts,
    getInstructorFor, getSectionsForCourse, assignTeacher, removeTeacher, addSection,
    exportCSV, refresh, stats } = useAcadTeachers();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ subject: '', section: '', teacher: '' });
  const [newSection, setNewSection] = useState('');
  const [reassignForm, setReassignForm] = useState({ teacher: '', subject: '', from: '', to: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [gradeSearch, setGradeSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'assignments' | 'mark' | 'view'>('assignments');

  const currentSections = useMemo(() => studentGroups.map(g => g.name), [studentGroups]);
  const currentCourses = courses;
  const assignedCount = stats.assignedCount;
  const conflictCount = stats.conflictCount;
  const unassignedCount = stats.unassignedCount;
  const sectionsCount = currentSections.length;
  const totalSubjects = currentCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalSubjects / PAGE_SIZE));
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return currentCourses.slice(start, start + PAGE_SIZE);
  }, [currentCourses, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [selectedProgram, assignments]);

  const allPrograms = useMemo(() => [{ name: '', program_name: 'All Grades' }, ...programs], [programs]);
  const filteredPrograms = allPrograms.filter(p => (p.program_name || p.name).toLowerCase().includes(gradeSearch.toLowerCase()));

  const handleExportCSV = () => exportCSV();

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.section || !assignForm.subject || !assignForm.teacher) { toast.error('Please fill all fields'); return; }
    const instructorObj = instructors.find(i => i.name === assignForm.teacher);
    if (!instructorObj) { toast.error('Invalid teacher'); return; }
    const success = await assignTeacher(assignForm.subject, assignForm.section, instructorObj.name, instructorObj.employee_name);
    if (success) setShowAssignModal(false);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.trim()) return;
    const success = await addSection(newSection.trim());
    if (success) { setShowSectionModal(false); setNewSection(''); }
  };

  const handleQuickReassign = async () => {
    const { subject, from, to, teacher } = reassignForm;
    if (!from || !to || !subject || !teacher) { toast.error('Select all fields'); return; }
    if (from === to) { toast.error('Source and destination cannot be same'); return; }
    const instructorObj = instructors.find(i => i.name === teacher);
    if (!instructorObj) { toast.error('Invalid teacher'); return; }
    const assignOk = await assignTeacher(subject, to, instructorObj.name, instructorObj.employee_name);
    if (!assignOk) return;
    const removeOk = await removeTeacher(subject, from);
    if (!removeOk) { toast.error('Assigned to new section, but could not clear old one.'); return; }
    setReassignForm({ teacher: '', subject: '', from: '', to: '' });
    toast.success('Teacher reassigned successfully!');
  };

  const openAssignFor = (sub: string, sec: string, existingTeacher = '') => {
    let teacherId = '';
    if (existingTeacher) {
      const found = instructors.find(i => i.employee_name === existingTeacher || i.name === existingTeacher);
      if (found) teacherId = found.name;
    }
    if (!teacherId && instructors.length > 0) teacherId = instructors[0].name;
    setAssignForm({ subject: sub, section: sec, teacher: teacherId });
    setShowAssignModal(true);
  };

  // ── WORKLOAD CALCULATION ──────────────────────────────────
  const workload = useMemo(() => {
    const map: Record<string, { classes: number; sections: number; hrs: number; conflict: boolean }> = {};
    const durationHours = (from?: string, to?: string): number => {
      if (!from || !to) return 0;
      const [fh, fm] = from.split(':').map(Number);
      const [th, tm] = to.split(':').map(Number);
      if (isNaN(fh) || isNaN(th)) return 0;
      const mins = (th * 60 + tm) - (fh * 60 + fm);
      return mins > 0 ? mins / 60 : 0;
    };
    for (const instructor of instructors) {
      const teacherAssignments = assignments.filter(a => a.instructor === instructor.name);
      const classes = teacherAssignments.length;
      const uniqueSections = new Set(teacherAssignments.map(a => a.student_group)).size;
      const hrs = teacherAssignments.reduce((sum, a) => {
        const record = courseScheduleRecords.find(r => r.course === a.course && r.student_group === a.student_group && r.instructor === a.instructor);
        return sum + durationHours(record?.from_time, record?.to_time);
      }, 0);
      const conflict = conflicts.get(instructor.name) || false;
      map[instructor.name] = { classes, sections: uniqueSections, hrs: Math.round(hrs * 10) / 10, conflict };
    }
    return Object.entries(map).map(([id, data]) => ({ 
      id, 
      name: instructors.find(i => i.name === id)?.employee_name || id, 
      ...data 
    }))
      .filter(w => w.classes > 0)
      .sort((a, b) => b.classes - a.classes);
  }, [instructors, assignments, conflicts, courseScheduleRecords]);

  const selectedProgramName = useMemo(() => {
    if (!selectedProgram) return 'All Grades';
    const prog = programs.find(p => p.name === selectedProgram);
    return prog?.program_name || prog?.name || selectedProgram;
  }, [selectedProgram, programs]);

  // ── Tab Bar ──────────────────────────────────────────────
  const TabBar = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      marginBottom: 24,
    }}>
      <div style={{ 
        display: 'flex', 
        gap: 6, 
        background: '#f1f5f9', 
        borderRadius: 50, 
        padding: 4,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
      }}>
        <button 
          onClick={() => setActiveTab('assignments')} 
          style={mainTabStyle(activeTab === 'assignments')}
        >
          <span style={{ display: 'flex' }}>{Icons.tabCourse}</span>
          Course Allocation
        </button>
        
        <button 
          onClick={() => setActiveTab('mark')} 
          style={mainTabStyle(activeTab === 'mark')}
        >
          <span style={{ display: 'flex' }}>{Icons.tabMark}</span>
          Mark Attendance
        </button>
        
        <button 
          onClick={() => setActiveTab('view')} 
          style={mainTabStyle(activeTab === 'view')}
        >
          <span style={{ display: 'flex' }}>{Icons.tabView}</span>
          View Attendance
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ color: '#64748b', fontSize: 14 }}>Loading...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ margin: '0 24px', background: '#fee2e2', padding: 20, borderRadius: 12, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <span>⚠ {error}</span>
      <button onClick={refresh} disabled={refreshing} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: refreshing ? 'not-allowed' : 'pointer' }}>{refreshing ? 'Retrying...' : 'Retry'}</button>
    </div>
  );

  return (
    <div style={{ padding: '0 16px 24px', maxWidth: 1600, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)',
        borderRadius: '0 0 22px 22px',
        padding: '26px 20px',
        marginBottom: 22,
        marginLeft: -16,
        marginRight: -16,
        boxShadow: '0 14px 32px -14px rgba(22,163,74,0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', display: 'flex' }}>{Icons.teachers}</span>
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Teacher Management</h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)' }}>Course Allocation & Attendance</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={refresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, cursor: refreshing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, backdropFilter: 'blur(6px)', opacity: refreshing ? 0.7 : 1 }}>↻ Refresh</button>
            <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#fff', color: '#15803d', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 6px 16px -4px rgba(0,0,0,0.25)' }}>{Icons.download} Export CSV</button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar />

      {/* Conditional Content */}
      {activeTab === 'assignments' ? (
        <>
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Assigned', value: assignedCount, color: '#16a34a', bg: '#F0FDF4', border: 'rgba(22,163,74,0.2)' },
              { label: 'Unassigned', value: unassignedCount, color: '#2563EB', bg: '#EFF6FF', border: 'rgba(37,99,235,0.2)' },
              { label: 'Sections', value: sectionsCount, color: '#EA580C', bg: '#FFF7ED', border: 'rgba(234,88,12,0.2)' },
              { label: 'Conflicts', value: conflictCount, color: '#dc2626', bg: '#FEF2F2', border: 'rgba(220,38,38,0.2)' },
              { label: 'Teachers', value: instructors.length, color: '#8B5CF6', bg: '#F5F3FF', border: 'rgba(139,92,246,0.2)' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: c.color, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* No instructors warning */}
          {instructors.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--red-pale)', border: '1px solid #F5C0C0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <span style={{ color: 'var(--red)', marginTop: 1 }}>{Icons.warning}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>No teachers found</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mid)' }}>Could not load any records from the Instructor list.</div>
              </div>
            </div>
          )}

          {/* Conflict Warning */}
          {conflictCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#FEF4E0', border: '1px solid #F5DCA0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <span style={{ color: 'var(--amber)', marginTop: 1 }}>{Icons.warning}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{conflictCount} Conflict{conflictCount > 1 ? 's' : ''} Detected</div>
                <div style={{ fontSize: 12, color: 'var(--ink-mid)' }}>Please resolve conflicts before proceeding.</div>
              </div>
            </div>
          )}

          {/* Grade Dropdown */}
          <div style={{ marginBottom: 20, background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '16px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #16a34a, #0d9488)' }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.7px', display: 'block', marginBottom: 6 }}>Select Grade / Program</label>
            <div style={{ position: 'relative', maxWidth: 320 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)', display: 'flex' }}>{Icons.search}</span>
              <input type="text" placeholder="Search grade..." value={gradeSearch} onChange={e => setGradeSearch(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, background: 'var(--white)', fontFamily: "'DM Sans',sans-serif", outline: 'none' }} />
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {filteredPrograms.map(prog => {
                const isAll = prog.name === '';
                const isSelected = isAll ? !selectedProgram : selectedProgram === prog.name;
                return (
                  <button key={isAll ? '__ALL__' : prog.name} onClick={() => { setSelectedProgram(isAll ? '' : prog.name); setGradeSearch(''); }}
                    style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, border: `1.5px solid ${isSelected ? 'var(--teal)' : 'var(--border)'}`, background: isSelected ? 'var(--teal-pale)' : 'var(--white)', color: isSelected ? 'var(--teal)' : 'var(--ink-soft)', fontWeight: isSelected ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>
                    {isAll ? 'All Grades' : (prog.program_name || prog.name)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assignment Matrix */}
          <div className="card" style={{ marginBottom: 20, boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #16a34a, #0d9488)' }} />
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--teal)', display: 'flex' }}>{Icons.layers}</span>
                <div className="card-title">Subject × Section — {selectedProgramName}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--teal-pale)', color: 'var(--teal)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{assignedCount} assigned</span>
                {conflictCount > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--red-pale)', color: 'var(--red)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{conflictCount} conflict</span>}
                <button className="btn btn-ghost btn-sm" onClick={() => setShowSectionModal(true)}>{Icons.plus} Add Section</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', padding: '0 16px 16px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--ink-soft)', background: 'var(--surface)', borderBottom: '1px solid var(--border)', minWidth: 140, position: 'sticky', left: 0, zIndex: 2 }}>Subject</th>
                    {currentSections.map(sec => <th key={sec} style={{ textAlign: 'center', padding: '12px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--ink-soft)', background: 'var(--surface)', borderBottom: '1px solid var(--border)', minWidth: 110 }}>{sec}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCourses.map((course, idx) => {
                    const relevantSections = getSectionsForCourse(course.name);
                    return (
                      <tr key={course.name} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(244,247,250,0.4)' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 600, fontSize: 13, color: 'var(--ink)', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, zIndex: 1, background: idx % 2 === 0 ? 'transparent' : 'rgba(244,247,250,0.6)' }}>{course.course_name || course.name}</td>
                        {currentSections.map(sec => {
                          if (!selectedProgram && !relevantSections.includes(sec)) {
                            return <td key={sec} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center', background: 'rgba(0,0,0,0.03)' }}><span style={{ color: 'var(--ink-soft)', fontSize: 11, opacity: 0.5 }}>—</span></td>;
                          }
                          const teacherName = getInstructorFor(course.name, sec);
                          const teacherId = assignments.find(a => a.course === course.name && a.student_group === sec)?.instructor || '';
                          const hasConflict = teacherId ? (conflicts.get(teacherId) || false) : false;
                          return (
                            <td key={sec} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                              <MatrixCell value={teacherName} onAssign={() => openAssignFor(course.name, sec)} onEdit={() => openAssignFor(course.name, sec, teacherName)} hasConflict={hasConflict} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalSubjects > PAGE_SIZE && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
          </div>

{/* ── TEACHER WORKLOAD & QUICK REASSIGN ────────────── */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
  
  {/* Teacher Workload Table */}
  <div className="card" style={{ 
    boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)', 
    position: 'relative', 
    overflow: 'hidden',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  }}>
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      height: 4, 
      background: 'linear-gradient(90deg, #2563EB, #3b82f6)' 
    }} />
    <div style={{ 
      padding: '16px 20px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ color: '#2563EB', fontSize: 18, display: 'flex' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Teacher Workload Summary</span>
      <span style={{ 
        marginLeft: 'auto', 
        fontSize: 11, 
        color: '#94a3b8', 
        background: '#f1f5f9', 
        padding: '2px 10px', 
        borderRadius: 20 
      }}>
        {workload.length} teachers
      </span>
    </div>
    
    <div style={{ overflowX: 'auto', padding: '0 16px 16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Teacher</th>
            <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Classes</th>
            <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Sections</th>
            <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Total Hrs</th>
            <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Compliance</th>
          </tr>
        </thead>
        <tbody>
          {workload.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>No teachers assigned</td>
            </tr>
          ) : (
            // ── SHOW ALL TEACHERS (NO LIMIT) ──
            workload.map((w, idx) => (
              <tr key={w.id} style={{ borderBottom: idx < workload.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 400, color: '#1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `linear-gradient(135deg, ${w.conflict ? '#ef4444' : '#22c55e'}15, ${w.conflict ? '#ef4444' : '#22c55e'}25)`,
                      color: w.conflict ? '#ef4444' : '#22c55e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      {w.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 400 }}>{w.name}</span>
                  </div>
                </td>
                <td style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13, fontWeight: 400, color: '#1e293b' }}>{w.classes}</td>
                <td style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13, fontWeight: 400, color: '#1e293b' }}>{w.sections}</td>
                <td style={{ textAlign: 'center', padding: '10px 12px', fontSize: 13, fontWeight: 400, color: '#1e293b' }}>{w.hrs}h</td>
                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 12px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 500,
                    minWidth: 56,
                    background: w.conflict ? '#fee2e2' : '#dcfce7',
                    color: w.conflict ? '#dc2626' : '#16a34a',
                  }}>
                    {w.conflict ? 'Conflict' : 'OK'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* Quick Reassign */}
  <div className="card" style={{ 
    boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)', 
    position: 'relative', 
    overflow: 'hidden',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  }}>
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      height: 4, 
      background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)' 
    }} />
    <div style={{ 
      padding: '16px 20px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ color: '#8B5CF6', fontSize: 18, display: 'flex' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Quick Reassign</span>
    </div>
    
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }}>
          Teacher
        </label>
        <TeacherSearchSelect 
          instructors={instructors} 
          value={reassignForm.teacher} 
          onChange={id => setReassignForm({ ...reassignForm, teacher: id })} 
          disabled={instructors.length === 0} 
        />
      </div>
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }}>
          Subject
        </label>
        <select 
          className="form-select" 
          value={reassignForm.subject} 
          onChange={e => setReassignForm({ ...reassignForm, subject: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1.5px solid #e2e8f0',
            fontSize: 13,
            fontFamily: "'DM Sans',sans-serif",
            outline: 'none',
            background: '#fff',
            color: '#1e293b',
            cursor: 'pointer',
          }}
        >
          <option value="">-- Select --</option>
          {currentCourses.map(c => <option key={c.name} value={c.name}>{c.course_name || c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }}>
            From Section
          </label>
          <select 
            className="form-select" 
            value={reassignForm.from} 
            onChange={e => setReassignForm({ ...reassignForm, from: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              fontSize: 13,
              fontFamily: "'DM Sans',sans-serif",
              outline: 'none',
              background: '#fff',
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            <option value="">-- Select --</option>
            {currentSections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 4 }}>
            To Section
          </label>
          <select 
            className="form-select" 
            value={reassignForm.to} 
            onChange={e => setReassignForm({ ...reassignForm, to: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid #e2e8f0',
              fontSize: 13,
              fontFamily: "'DM Sans',sans-serif",
              outline: 'none',
              background: '#fff',
              color: '#1e293b',
              cursor: 'pointer',
            }}
          >
            <option value="">-- Select --</option>
            {currentSections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => setReassignForm({ teacher: '', subject: '', from: '', to: '' })}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1.5px solid #e2e8f0',
            background: '#fff',
            color: '#64748b',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif",
            transition: 'all 0.15s ease',
          }}
        >
          Reset
        </button>
        <button 
          className="btn btn-primary btn-sm" 
          onClick={handleQuickReassign}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(90deg, #16a34a, #0d9488)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif",
            boxShadow: '0 4px 12px -2px rgba(22,163,74,0.3)',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Confirm Reassignment
        </button>
      </div>
    </div>
  </div>
</div>

          {/* Modals */}
          {showAssignModal && (
            <Modal title={assignForm.section ? `Assign Teacher — ${assignForm.subject} (${assignForm.section})` : 'Assign Teacher'} onClose={() => setShowAssignModal(false)}>
              <form onSubmit={handleAssignSubmit}>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select className="form-select" value={assignForm.subject} onChange={e => setAssignForm({ ...assignForm, subject: e.target.value })} required>
                    {currentCourses.map(c => <option key={c.name} value={c.name}>{c.course_name || c.name}</option>)}
                  </select>
                </div>
                <div className="form-group mt-12">
                  <label className="form-label">Section</label>
                  <select className="form-select" value={assignForm.section} onChange={e => setAssignForm({ ...assignForm, section: e.target.value })} required>
                    <option value="">-- Select Section --</option>
                    {currentSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group mt-12">
                  <label className="form-label">Teacher</label>
                  <TeacherSearchSelect instructors={instructors} value={assignForm.teacher} onChange={id => setAssignForm({ ...assignForm, teacher: id })} disabled={instructors.length === 0} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowAssignModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={instructors.length === 0}>✓ Save</button>
                </div>
              </form>
            </Modal>
          )}

          {showSectionModal && (
            <Modal title="Add New Section" onClose={() => setShowSectionModal(false)}>
              <form onSubmit={handleAddSection}>
                <div className="form-group">
                  <label className="form-label">Section Name</label>
                  <input type="text" className="form-input" placeholder={`e.g. ${selectedProgram || 'Grade'}-E`} value={newSection} onChange={e => setNewSection(e.target.value)} required autoFocus />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>  
                  <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowSectionModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>+ Add</button>
                </div>
              </form>
            </Modal>
          )}
        </>
      ) : (
        <TeacherAttendanceSection activeTab={activeTab} />
      )}
    </div>
  );
}