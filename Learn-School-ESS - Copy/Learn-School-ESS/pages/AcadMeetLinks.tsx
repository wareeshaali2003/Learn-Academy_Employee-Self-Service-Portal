// pages/AcadMeetLinks.tsx
import { useState, useMemo } from 'react';
import { useAcadMeetLinks, MeetLink } from '../hooks/UseAcadMeetLinks';
import toast from 'react-hot-toast';

// Icons
const Icons = {
  link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  warning: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>,
  sync: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  ghost: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 21l3 3V10a8 8 0 0 0-8-8z"/></svg>,
  open: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

type TabId = 'all' | 'missing' | 'today' | 'updated';

const ITEMS_PER_PAGE = 20;

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function GhostBanner({ count, onSync }: { count: number; onSync: () => void }) {
  if (count === 0) return null;
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12,
      padding: '14px 20px', marginBottom: 20, flexWrap: 'wrap',
    }}>
      <span style={{ color: '#DC2626', display: 'flex' }}>{Icons.ghost}</span>
      <div style={{ flex: '1 1 200px', minWidth: 180 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
          {count} Ghost Class{count > 1 ? 'es' : ''} Detected
        </div>
        <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
          Classes with no Meet link assigned. Students cannot join these sessions.
        </div>
      </div>
      <span style={{ background: '#DC2626', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
        {count} missing
      </span>
      <button onClick={onSync} style={{ padding: '6px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', transition: 'opacity 0.2s ease' }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        Fix Now
      </button>
    </div>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, goToPage, totalCount, itemsPerPage }: {
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  totalCount: number;
  itemsPerPage: number;
}) {
  if (totalPages <= 1) return null;
  
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalCount);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '14px 20px', 
      borderTop: '1px solid #e2e8f0',
      background: '#f8fafc',
      flexWrap: 'wrap',
      gap: 12
    }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        Showing <span style={{ fontWeight: 600, color: '#0f172a' }}>{start}</span> to{' '}
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{end}</span> of{' '}
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{totalCount}</span> classes
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            fontSize: '12px',
            fontWeight: 500,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          Previous
        </button>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`dots-${idx}`} style={{ padding: '0 4px', fontSize: 13, color: '#94a3b8' }}>...</span>
            ) : (
              <button
                key={page}
                onClick={() => goToPage(page as number)}
                style={{
                  minWidth: '34px',
                  height: '34px',
                  padding: '0 8px',
                  borderRadius: '8px',
                  border: currentPage === page ? 'none' : '1px solid #e2e8f0',
                  background: currentPage === page ? '#16a34a' : '#ffffff',
                  color: currentPage === page ? '#ffffff' : '#334155',
                  fontWeight: currentPage === page ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {page}
              </button>
            )
          ))}
        </div>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            fontSize: '12px',
            fontWeight: 500,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// KpiCard with proper styling
function KpiCard({ label, value, sub, icon, variant }: { label: string; value: number; sub?: string; icon: React.ReactNode; variant: 'teal' | 'red' | 'amber' | 'blue' }) {
  const variants = {
    teal: { bg: '#F0FDF4', border: '#BBF7D0', gradient: '#16a34a', textColor: '#166534', valueColor: '#16a34a' },
    red: { bg: '#FEF2F2', border: '#FECACA', gradient: '#DC2626', textColor: '#991B1B', valueColor: '#DC2626' },
    amber: { bg: '#FFFBEB', border: '#FDE68A', gradient: '#D97706', textColor: '#92400E', valueColor: '#D97706' },
    blue: { bg: '#EFF6FF', border: '#BFDBFE', gradient: '#2563EB', textColor: '#1E40AF', valueColor: '#2563EB' },
  };
  
  const v = variants[variant];
  
  return (
    <div style={{ 
      background: v.bg, 
      border: `1px solid ${v.border}`, 
      borderRadius: '14px', 
      padding: '16px 18px', 
      position: 'relative', 
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.25s ease-in-out',
      minWidth: 0,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: '4px', 
        background: `linear-gradient(90deg, ${v.gradient}, ${v.gradient}80)` 
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <div style={{ fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: v.textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        <span style={{ color: v.gradient, display: 'flex', flexShrink: 0 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 700, color: v.valueColor, marginBottom: 8, letterSpacing: '-1px' }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: v.textColor, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

function TabBar({ activeTab, counts, onTabChange }: { activeTab: TabId; counts: { total: number; missing: number; today: number; updated: number }; onTabChange: (tab: TabId) => void }) {
  const tabs = [
    { id: 'all' as TabId, label: 'All Classes', count: counts.total, color: '#16a34a' },
    { id: 'missing' as TabId, label: 'Missing Links', count: counts.missing, color: '#DC2626' },
    { id: 'today' as TabId, label: "Today's Schedule", count: counts.today, color: '#2563EB' },
    { id: 'updated' as TabId, label: 'Recently Updated', count: counts.updated, color: '#D97706' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #e2e8f0', marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{
          padding: '10px 14px', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
          color: activeTab === tab.id ? tab.color : '#64748b', background: 'transparent', border: 'none',
          cursor: 'pointer', borderBottom: `2px solid ${activeTab === tab.id ? tab.color : 'transparent'}`,
          marginBottom: -2, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.13s ease',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {tab.label}
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: activeTab === tab.id ? `${tab.color}22` : '#f1f5f9', color: activeTab === tab.id ? tab.color : '#64748b' }}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function UrlCell({ link, onUpdate }: { link: MeetLink; onUpdate: (url: string) => void }) {
  const [url, setUrl] = useState(link.url);
  const [isEditing, setIsEditing] = useState(false);
  const isValid = url && /^https?:\/\/(meet\.google\.com|meet\.goog)\/[a-z0-9-]{3,}-[a-z0-9-]{3,}-[a-z0-9-]{3,}/i.test(url);
  
  const handleSave = () => {
    if (!url || url.trim() === '') { toast.error('Please enter a Meet URL'); return; }
    if (!isValid) { toast.error('Invalid Meet URL format'); return; }
    onUpdate(url);
    setIsEditing(false);
  };
  
  if (!isEditing && link.url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 200 }}>
        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', textDecoration: 'none', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 100 }}>
          {link.url.length > 50 ? link.url.substring(0, 47) + '...' : link.url}
        </a>
        <button onClick={() => setIsEditing(true)} style={{ padding: '4px 10px', fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>Edit</button>
        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 8px', color: '#64748b', textDecoration: 'none' }}>{Icons.open}</a>
      </div>
    );
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 220 }}>
      <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://meet.google.com/xxx-yyy-zzz" style={{ flex: '1 1 160px', padding: '8px 12px', border: `1px solid ${isValid ? '#16a34a' : '#e2e8f0'}`, borderRadius: 8, fontSize: 12, outline: 'none', minWidth: 140 }} />
      <button onClick={handleSave} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>Save</button>
      {isEditing && <button onClick={() => setIsEditing(false)} style={{ padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>Cancel</button>}
    </div>
  );
}

export default function AcadMeetLinks() {
  const { meetLinks, loading, error, fetchMeetLinks, updateMeetLink, syncMissingLinks, getStats, getTodayCount, getUniqueGrades, getUniqueSubjects } = useAcadMeetLinks();
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const stats = getStats();
  const todayCount = getTodayCount();
  const grades = getUniqueGrades();
  const subjects = getUniqueSubjects();
  const today = new Date().toISOString().split('T')[0];

  // Apply filters
  const filteredLinks = useMemo(() => {
    let filtered = meetLinks;
    switch (activeTab) {
      case 'missing': filtered = filtered.filter(link => !link.url || link.url.trim() === ''); break;
      case 'today': filtered = filtered.filter(link => link.schedule_date === today); break;
      case 'updated': filtered = filtered.filter(link => link.status === 'updated'); break;
      default: break;
    }
    if (gradeFilter !== 'All') filtered = filtered.filter(link => link.grade === gradeFilter);
    if (subjectFilter !== 'All') filtered = filtered.filter(link => link.subject.toLowerCase().includes(subjectFilter.toLowerCase()));
    if (searchTerm) filtered = filtered.filter(link => link.subject.toLowerCase().includes(searchTerm.toLowerCase()) || link.section.toLowerCase().includes(searchTerm.toLowerCase()) || link.instructor_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered;
  }, [meetLinks, activeTab, gradeFilter, subjectFilter, searchTerm, today]);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [activeTab, gradeFilter, subjectFilter, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLinks.length / ITEMS_PER_PAGE);
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredLinks.slice(start, end);
  }, [filteredLinks, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const tabCounts = { total: stats.total, missing: stats.missing, today: todayCount, updated: stats.updated };

  if (loading) return <LoadingSpinner />;

  const getCurrentTabCount = () => {
    switch (activeTab) {
      case 'all': return tabCounts.total;
      case 'missing': return tabCounts.missing;
      case 'today': return tabCounts.today;
      case 'updated': return tabCounts.updated;
      default: return tabCounts.total;
    }
  };

  return (
    <div className="acad-animate-fadeUp" style={{ padding: '0 16px 24px', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header Card */}
      <div style={{
        background: 'linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)',
        borderRadius: '0 0 22px 22px',
        padding: '22px 16px',
        marginBottom: 24,
        marginLeft: -16,
        marginRight: -16,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(6px)',
              flexShrink: 0,
            }}>
              <span style={{ color: '#fff', display: 'flex' }}>{Icons.link}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: '-0.3px' }}>Meet Links</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>Manage Google Meet links for all course schedules</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={fetchMeetLinks}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.14)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                backdropFilter: 'blur(6px)',
                transition: 'background 0.2s ease, transform 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
            >{Icons.refresh} Refresh</button>
            <button
              onClick={syncMissingLinks}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 16px',
                background: '#fff',
                color: '#15803d',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                boxShadow: '0 6px 16px -4px rgba(0,0,0,0.25)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 20px -4px rgba(0,0,0,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(0,0,0,0.25)'; }}
            >{Icons.sync} Sync All</button>
          </div>
        </div>
      </div>

      {/* Ghost Banner */}
      <GhostBanner count={stats.missing} onSync={syncMissingLinks} />

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total Classes" value={stats.total} sub="All course schedules" icon={Icons.link} variant="teal" />
        <KpiCard label="Active Links" value={stats.active} sub="with valid Meet links" icon={Icons.check} variant="blue" />
        <KpiCard label="Missing Links" value={stats.missing} sub="ghost classes - need attention" icon={Icons.warning} variant="red" />
        <KpiCard label="Recently Updated" value={stats.updated} sub="today" icon={Icons.clock} variant="amber" />
      </div>

      {/* Tabs */}
      <TabBar activeTab={activeTab} counts={tabCounts} onTabChange={setActiveTab} />

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <input type="text" placeholder="Search by subject, section, or instructor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }} />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} style={{ flex: '1 1 140px', padding: '10px 30px 10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', minWidth: 130 }}>
          {grades.map((grade: string) => <option key={grade} value={grade}>{grade === 'All' ? 'All Grades' : `Grade ${grade}`}</option>)}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} style={{ flex: '1 1 140px', padding: '10px 30px 10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', minWidth: 130 }}>
          {subjects.map((subject: string) => <option key={subject} value={subject}>{subject === 'All' ? 'All Subjects' : subject}</option>)}
        </select>
        {(gradeFilter !== 'All' || subjectFilter !== 'All' || searchTerm) && (
          <button onClick={() => { setGradeFilter('All'); setSubjectFilter('All'); setSearchTerm(''); setCurrentPage(1); }} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>Clear Filters</button>
        )}
      </div>

      {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 13 }}>{error}</div>}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Course / Subject</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Section</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Grade</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Instructor</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Date & Time</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Meet Link</th>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLinks.map((link: MeetLink) => {
              const isMissing = !link.url || link.url.trim() === '';
              return (
                <tr key={link.id} style={{ borderBottom: '1px solid #e2e8f0', background: isMissing ? '#FEF2F2' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{link.subject}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#334155' }}>{link.section}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#334155' }}>{link.grade}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#334155' }}>{link.instructor_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                    {link.schedule_date}<br />
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{link.from_time} - {link.to_time}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <UrlCell link={link} onUpdate={(url) => updateMeetLink(link.id, url)} /> 
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {link.url ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#DCFCE7', color: '#16a34a', whiteSpace: 'nowrap' }}>{Icons.check} Active</span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FEE2E2', color: '#DC2626', whiteSpace: 'nowrap' }}>{Icons.warning} Missing</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {paginatedLinks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            {activeTab === 'missing' ? '🎉 No missing links found! All classes have Meet links assigned.' :
             activeTab === 'today' ? '📅 No classes scheduled for today.' :
             activeTab === 'updated' ? '🔄 No recently updated links.' :
             '📋 No course schedules found matching your criteria.'}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>
        ← Swipe table sideways to see more columns on small screens →
      </div>

      {/* Pagination */}
      {filteredLinks.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          goToPage={goToPage}
          totalCount={filteredLinks.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}

      {/* Footer Stats */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '12px 0' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', whiteSpace: 'nowrap' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }} />Active Links: {stats.active}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', whiteSpace: 'nowrap' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626' }} />Missing Links: {stats.missing}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D97706', whiteSpace: 'nowrap' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D97706' }} />Recently Updated: {stats.updated}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB', whiteSpace: 'nowrap' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB' }} />Today's Schedule: {todayCount}</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Showing page {currentPage} of {totalPages} ({filteredLinks.length} total)
        </div>
      </div>
    </div>
  );
}