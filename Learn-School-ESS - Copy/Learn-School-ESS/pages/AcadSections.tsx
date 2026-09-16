// pages/AcadSections.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAcadSections, Section, Student, Instructor } from '../hooks/UseAcadSections';
import toast from 'react-hot-toast';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icons = {
  layers:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  users:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  userCheck: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>,
  alert:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  eye:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  refresh:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>,
  close:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  bar:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
};

const ITEMS_PER_PAGE = 20;

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: 14 }}>Loading sections from ERP…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Live Sync Bar ────────────────────────────────────────────────────────────
function LiveSyncBar({
  lastSynced,
  liveCount,
  localCount,
}: {
  lastSynced: Date | null;
  liveCount: number | null;
  localCount: number;
}) {
  const syncLabel = lastSynced
    ? lastSynced.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  const mismatch = liveCount !== null && liveCount !== localCount;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 16px', marginBottom: 18,
      background: mismatch ? '#FFFBEB' : '#F0FDF4',
      border: `1px solid ${mismatch ? '#FDE68A' : '#BBF7D0'}`,
      borderRadius: 10, fontSize: 11, flexWrap: 'wrap', gap: 8,
      boxShadow: '0 2px 8px -4px rgba(0,0,0,0.06)',
      transition: 'background 0.25s ease, border-color 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
          background: '#16a34a', boxShadow: '0 0 0 2px rgba(22,163,74,0.25)',
          animation: 'pulse 2s infinite',
        }} />
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        <span style={{ color: '#166534' }}>Live sync with ERP — checks every 30s</span>
        {syncLabel && (
          <span style={{ color: '#64748b' }}>
            Last checked: <strong style={{ color: '#0f172a' }}>{syncLabel}</strong>
          </span>
        )}
      </div>
      {liveCount !== null && (
        <span style={{ fontWeight: 700, color: mismatch ? '#D97706' : '#16a34a' }}>
          {mismatch
            ? `⚠ ERP: ${liveCount} sections | Portal: ${localCount} — syncing…`
            : `✓ ERP: ${liveCount} sections — in sync`}
        </span>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, variant }: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode;
  variant: 'teal' | 'blue' | 'amber' | 'red' | 'purple';
}) {
  const V = {
    teal:   { bg: '#F0FDF4', border: '#BBF7D0', accent: '#16a34a', text: '#166534', hover: '#DCFCE7' },
    blue:   { bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB', text: '#1E40AF', hover: '#DBEAFE' },
    amber:  { bg: '#FFFBEB', border: '#FDE68A', accent: '#D97706', text: '#92400E', hover: '#FEF3C7' },
    red:    { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626', text: '#991B1B', hover: '#FEE2E2' },
    purple: { bg: '#F5F3FF', border: '#DDD6FE', accent: '#8B5CF6', text: '#5B21B6', hover: '#EDE9FE' },
  }[variant];

  return (
    <div
      style={{ background: V.bg, border: `1px solid ${V.border}`, borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all .2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = V.hover; e.currentTarget.style.boxShadow = '0 10px 20px -8px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.background = V.bg;    e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: V.accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.8px', color: V.text }}>{label}</div>
        <span style={{ color: V.accent }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: V.accent, letterSpacing: '-1px' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: V.text, opacity: .7, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, goToPage, totalCount, itemsPerPage }: {
  currentPage: number; totalPages: number; goToPage: (p: number) => void;
  totalCount: number; itemsPerPage: number;
}) {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end   = Math.min(currentPage * itemsPerPage, totalCount);
  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0',
    background: '#fff', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1,
  });
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: 10 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        Showing <b style={{ color: '#0f172a' }}>{start}–{end}</b> of <b style={{ color: '#0f172a' }}>{totalCount}</b> sections
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={btn(currentPage === 1)} disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>Previous</button>
        <span style={{ padding: '5px 10px', fontSize: 12, color: '#334155' }}>Page {currentPage} of {totalPages}</span>
        <button style={btn(currentPage === totalPages)} disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>Next</button>
      </div>
    </div>
  );
}

// ─── View Details Modal ───────────────────────────────────────────────────────
function ViewDetailsModal({ section, maxStudentCount, onClose }: {
  section: Section; maxStudentCount: number; onClose: () => void;
}) {
  const occupancy = section.maxStrength > 0
    ? Math.round((section.studentCount / section.maxStrength) * 100)
    : maxStudentCount > 0
      ? Math.round((section.studentCount / maxStudentCount) * 100)
      : 0;

  const occColor = occupancy >= 100 ? '#DC2626' : occupancy >= 85 ? '#D97706' : '#16A34A';
  const activeStudents = section.students.filter(s => s.active === 1);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '90%', maxWidth: 700, maxHeight: '88vh', overflow: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '16px 16px 0 0' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{section.name}</h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{section.program} · {section.academicYear}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#64748b' }}>{Icons.close}</button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Students',  value: activeStudents.length, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
              { label: 'Capacity',  value: section.maxStrength > 0 ? section.maxStrength : 'N/A', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
              { label: 'Occupancy', value: section.maxStrength > 0 || maxStudentCount > 0 ? `${occupancy}%` : 'N/A', color: occColor, bg: '#FFFBEB', border: '#FDE68A' },
              { label: 'Status',    value: section.status === 'active' ? 'Active' : 'Inactive', color: section.status === 'active' ? '#16A34A' : '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: 12, textAlign: 'center', border: `1px solid ${c.border}` }}>
                <div style={{ fontSize: 10, color: c.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px' }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
                {c.label === 'Occupancy' && (section.maxStrength > 0 || maxStudentCount > 0) && (
                  <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(occupancy, 100)}%`, height: 4, background: occColor, borderRadius: 2 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {section.instructors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>Class Teachers / Instructors</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {section.instructors.map(inst => (
                  <div key={inst.instructor} style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: 20, fontSize: 12, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {inst.instructor_name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                    <span>{inst.instructor_name}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{inst.instructor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeStudents.length > 0 && (
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 8 }}>
                Students ({activeStudents.length})
              </h4>
              <div style={{ overflow: 'auto', maxHeight: 340, border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {['Roll No', 'Student Name', 'Student ID'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeStudents.map(s => (
                      <tr key={s.name} style={{ borderBottom: '1px solid #e2e8f0' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '6px 10px', fontSize: 12, color: '#64748b' }}>{s.group_roll_number}</td>
                        <td style={{ padding: '6px 10px', fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{s.student_name}</td>
                        <td style={{ padding: '6px 10px', fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{s.student}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeStudents.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
              No active students in this section
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Grade Filter Pills ───────────────────────────────────────────────────────
function GradeFilterPills({ grades, selectedGrade, onSelect, countFor }: {
  grades: number[]; selectedGrade: number | 'all';
  onSelect: (g: number | 'all') => void;
  countFor: (g: number | 'all') => number;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
      {(['all', ...grades] as (number | 'all')[]).map(g => {
        const active = selectedGrade === g;
        return (
          <button key={g} onClick={() => onSelect(g)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12,
            fontWeight: active ? 700 : 400,
            border: `1.5px solid ${active ? '#16a34a' : '#e2e8f0'}`,
            background: active ? '#dcfce7' : 'transparent',
            color: active ? '#16a34a' : '#64748b',
            cursor: 'pointer', transition: 'all .13s',
          }}>
            {g === 'all' ? 'All Grades' : `Grade ${g}`}
            <span style={{ marginLeft: 5, fontSize: 10, opacity: .8 }}>({countFor(g)})</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AcadSections() {
  const {
    sections,
    loading,
    error,
    selectedSection,
    sectionLoading,
    lastSynced,
    liveCount,
    allInstructors,
    fetchSections,
    fetchSectionDetails,
    getStats,
    getSectionsByGrade,
  } = useAcadSections();

  const [searchTerm,    setSearchTerm]    = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [statusFilter,  setStatusFilter]  = useState<'all' | 'active' | 'inactive'>('all');
  const [viewingSection,setViewingSection]= useState<Section | null>(null);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [sortBy,        setSortBy]        = useState<'name' | 'studentCount' | 'occupancy'>('name');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');

  const stats = getStats();
  const uniqueGrades = useMemo(
    () => [...new Set(sections.map(s => s.grade).filter(g => g > 0))].sort((a, b) => a - b),
    [sections]
  );

  // ── Filtered + Sorted ──────────────────────────────────────────────────────
  const filteredSections = useMemo(() => {
    let list = sections;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.program.toLowerCase().includes(q));
    }
    if (selectedGrade !== 'all') list = list.filter(s => s.grade === selectedGrade);
    if (statusFilter !== 'all')  list = list.filter(s => s.status === statusFilter);

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name')         return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'studentCount') return (a.studentCount - b.studentCount) * dir;
      if (sortBy === 'occupancy') {
        const pctA = a.maxStrength > 0 ? a.studentCount / a.maxStrength : (stats.maxStudentCount > 0 ? a.studentCount / stats.maxStudentCount : 0);
        const pctB = b.maxStrength > 0 ? b.studentCount / b.maxStrength : (stats.maxStudentCount > 0 ? b.studentCount / stats.maxStudentCount : 0);
        return (pctA - pctB) * dir;
      }
      return 0;
    });
  }, [sections, searchTerm, selectedGrade, statusFilter, sortBy, sortDir, stats.maxStudentCount]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedGrade, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSections.length / ITEMS_PER_PAGE));
  const paginatedSections = useMemo(() => {
    const s = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSections.slice(s, s + ITEMS_PER_PAGE);
  }, [filteredSections, currentPage]);

  const goToPage = (p: number) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };
  const si = (col: typeof sortBy) => sortBy !== col ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓';

  const handleView = async (name: string) => {
    const s = await fetchSectionDetails(name);
    if (s) setViewingSection(s);
  };

  const occColor = (pct: number) => pct >= 100 ? '#DC2626' : pct >= 85 ? '#D97706' : '#16A34A';

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: '0 24px 24px' }}>
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
        {/* decorative glow shapes */}
        <div style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -70, right: 140, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.10), transparent 55%)', pointerEvents: 'none' }} />

        <div style={{
          maxWidth: 1600,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 13,
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', display: 'flex' }}>{Icons.layers}</span>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: '-0.3px' }}>Sections Management</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>All student groups synced live from ERPNext</p>
            </div>
          </div>
          <button
            onClick={fetchSections}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px',
              background: 'rgba(255,255,255,0.14)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              backdropFilter: 'blur(6px)',
              transition: 'background 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
          >
            {Icons.refresh} Refresh
          </button>
        </div>
      </div>

      {/* ── Live Sync Bar ── */}
      <LiveSyncBar lastSynced={lastSynced} liveCount={liveCount} localCount={sections.length} />

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        {/* Total Sections - all sections from ERP */}
        <KpiCard 
          label="Total Sections"  
          value={stats.totalSections}   
          icon={Icons.layers}    
          variant="teal"   
        />
        
        {/* Active Sections - only sections with disabled = 0 */}
        <KpiCard 
          label="Active Sections"          
          value={stats.activeSections}  
          icon={Icons.userCheck} 
          variant="blue"   
        />
        
        {/* Total Students - sum of all students across all sections */}
        <KpiCard 
          label="Total Students"  
          value={stats.totalStudents}   
          icon={Icons.users}     
          variant="amber"  
        />
        
        {/* Avg Occupancy - (totalStudents / totalCapacity) * 100 */}
        <KpiCard 
          label="Avg Occupancy"   
          value={`${stats.avgOccupancy}%`} 
          icon={Icons.bar}   
          variant="teal"   
        />
        
        {/* Total Instructors - all instructors from Instructor doctype */}
        <KpiCard 
          label="Total Instructors"     
          value={stats.totalInstructors}
          icon={Icons.users}     
          variant="purple" 
          sub={`${allInstructors.filter(i => i.status === 'Active').length} active`}
        />
        
        {/* Inactive Sections - sections with disabled = 1 */}
        <KpiCard 
          label="Inactive Sections"        
          value={stats.inactiveSections}
          icon={Icons.alert}     
          variant="red"    
        />
      </div>

      {/* ── Grade Pills ── */}
      <GradeFilterPills
        grades={uniqueGrades}
        selectedGrade={selectedGrade}
        onSelect={setSelectedGrade}
        countFor={g => g === 'all' ? sections.length : sections.filter(s => s.grade === g).length}
      />

      {/* ── Search + Filters ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 14, marginBottom: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 10px -6px rgba(0,0,0,0.06)' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>{Icons.search}</span>
          <input
            type="text" placeholder="Search section name or program…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', transition: 'border-color 0.2s ease' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(searchTerm || selectedGrade !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => { setSearchTerm(''); setSelectedGrade('all'); setStatusFilter('all'); }}
            style={{ padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, transition: 'background 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; }}>
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#DC2626', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {error}</span>
          <button onClick={fetchSections} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'auto', boxShadow: '0 2px 10px -6px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {[
                { label: 'Section Name', col: 'name',         sortable: true  },
                { label: 'Program',      col: null,           sortable: false },
                { label: 'Grade',        col: null,           sortable: false },
                { label: 'Students',     col: 'studentCount', sortable: true  },
                { label: 'Occupancy',    col: 'occupancy',    sortable: true  },
                { label: 'Instructors',  col: null,           sortable: false },
                { label: 'Academic Year',col: null,           sortable: false },
                { label: 'Status',       col: null,           sortable: false },
                { label: 'Actions',      col: null,           sortable: false },
              ].map(({ label, col, sortable }) => (
                <th
                  key={label}
                  onClick={sortable && col ? () => toggleSort(col as any) : undefined}
                  style={{
                    padding: '13px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '.5px', cursor: sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}>
                  {label}{sortable && col ? si(col as any) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedSections.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🏫</div>
                  No sections match your filters
                </td>
              </tr>
            ) : paginatedSections.map(s => {
              const occupancy = s.maxStrength > 0
                ? Math.round((s.studentCount / s.maxStrength) * 100)
                : stats.maxStudentCount > 0
                  ? Math.round((s.studentCount / stats.maxStudentCount) * 100)
                  : 0;
              const oc = occColor(occupancy);

              return (
                <tr key={s.id}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ borderBottom: '1px solid #e2e8f0', transition: 'background .15s' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#16A34A' }}>{s.name}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: '#334155' }}>{s.program}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>
                      {s.grade > 0 ? `Grade ${s.grade}` : 'KG'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{s.studentCount}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {(s.maxStrength > 0 || stats.maxStudentCount > 0) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(occupancy, 100)}%`, height: 4, background: oc, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: oc }}>{occupancy}%</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#334155' }}>
                    {s.instructors.length > 0
                      ? s.instructors.slice(0, 2).map(i => i.instructor_name.split(' ')[0]).join(', ')
                        + (s.instructors.length > 2 ? ` +${s.instructors.length - 2}` : '')
                      : <span style={{ color: '#94a3b8' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#64748b' }}>{s.academicYear}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: s.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                      color:      s.status === 'active' ? '#16A34A' : '#D97706',
                    }}>
                      {s.status === 'active' ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleView(s.name)}
                      disabled={sectionLoading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', background: 'transparent',
                        border: '1px solid #16A34A', color: '#16A34A', borderRadius: 6,
                        cursor: 'pointer', fontSize: 11, transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#16A34A'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#16A34A'; }}>
                      {Icons.eye} View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredSections.length > 0 && (
          <Pagination
            currentPage={currentPage} totalPages={totalPages}
            goToPage={goToPage} totalCount={filteredSections.length} itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
        {filteredSections.length} of {sections.length} sections shown
        {filteredSections.length !== sections.length && ` (filtered)`}
      </div>

      {/* ── Detail Modal ── */}
      {viewingSection && (
        <ViewDetailsModal
          section={viewingSection}
          maxStudentCount={stats.maxStudentCount}
          onClose={() => setViewingSection(null)}
        />
      )}
    </div>
  );
}