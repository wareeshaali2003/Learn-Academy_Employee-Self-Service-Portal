// pages/AcadAudit.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAudit } from '../hooks/UseAcadAudit';
import type { AuditEntry, ActionType } from '../hooks/UseAcadAudit';

// ── Constants ─────────────────────────────────────────────
const ACTION_TYPES: ActionType[] = ['All', 'Status Change', 'Transfer', 'Meet Link', 'Teacher Assignment', 'Grade Entry', 'Login'];
const DATE_RANGES = ['Last 7 days', 'Last 30 days', 'This Month', 'This Term', 'All Time'];
const SEVERITIES  = ['All', 'info', 'warning', 'critical'];

// ── Helpers ───────────────────────────────────────────────
type BadgeCfg = { color: string; label: string };

const ACTION_BADGE_MAP: Record<ActionType, BadgeCfg> = {
  'Meet Link':          { color: 'blue',  label: '🔗 Meet Link' },
  'Status Change':      { color: 'amber', label: '↺ Status Change' },
  'Transfer':           { color: 'teal',  label: '⇄ Transfer' },
  'Teacher Assignment': { color: 'blue',  label: '👨‍🏫 Assignment' },
  'Grade Entry':        { color: 'teal',  label: '📝 Grade Entry' },
  'Login':              { color: 'gray',  label: '🔐 Login' },
  'All':                { color: 'gray',  label: 'All' },
};

function actionBadge(action: ActionType): BadgeCfg {
  return ACTION_BADGE_MAP[action] ?? { color: 'gray', label: action };
}

function severityDot(s: string): { color: string; dot: string } {
  const map: Record<string, { color: string; dot: string }> = {
    info:     { color: 'var(--teal)',  dot: '●' },
    warning:  { color: 'var(--amber)', dot: '●' },
    critical: { color: 'var(--red)',   dot: '●' },
  };
  return map[s] ?? { color: 'var(--ink-soft)', dot: '○' };
}

// ── Icons ─────────────────────────────────────────────────
const I = {
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  search:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  x:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  eye:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  shield:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  refresh:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  chevronLeft:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  shieldLg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
};

// ── Detail Modal ──────────────────────────────────────────
function DetailModal({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const ab = actionBadge(entry.action);
  const sv = severityDot(entry.severity);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,33,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: 'var(--white)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Audit Entry Detail</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>{entry.id}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>{I.x}</button>
        </div>
        <div style={{ padding: 22 }}>
          {/* Severity + Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: sv.color, fontWeight: 700 }}>{sv.dot}</span>
            <span className={`badge badge-${ab.color}`}>{ab.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--ink-soft)' }}>{entry.timestamp}</span>
          </div>

          {/* Info rows */}
          {[
            { label: 'Entity',      value: entry.entity },
            { label: 'Entity ID',   value: entry.entityId || '—' },
            { label: 'Changed By',  value: entry.changedBy },
            { label: 'IP Address',  value: entry.ip },
            { label: 'Severity',    value: entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: row.label === 'IP Address' ? 'monospace' : 'inherit' }}>{row.value}</span>
            </div>
          ))}

          {/* Before → After (before is "—" since ERP doesn't expose field history here) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginTop: 16 }}>
            <div style={{ background: 'var(--red-pale)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(217,79,79,0.2)' }}>
              <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>Before</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', wordBreak: 'break-all' }}>{entry.before}</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <div style={{ background: 'var(--teal-pale)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(11,139,111,0.2)' }}>
              <div style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 }}>After</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', wordBreak: 'break-all' }}>{entry.after}</div>
            </div>
          </div>

          {entry.before === '—' && (
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
              Previous value not available — ERP doesn't track field history for this record type
            </div>
          )}

          <button className="btn btn-ghost btn-block" style={{ marginTop: 20 }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 48, borderRadius: 8, background: 'var(--surface)', opacity: 0.7 }} />
      ))}
    </div>
  );
}

// ── Compact Pagination ─────────────────────────────────────
function CompactPagination({
  page, totalPages, onPrev, onNext,
}: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        onClick={onPrev}
        disabled={page === 1}
        style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--white)',
          color: page === 1 ? 'var(--ink-soft)' : 'var(--ink)',
          fontSize: 12.5,
          fontWeight: 500,
          cursor: page === 1 ? 'not-allowed' : 'pointer',
          opacity: page === 1 ? 0.5 : 1,
          fontFamily: "'DM Sans',sans-serif",
          transition: 'all .15s ease',
        }}
        onMouseEnter={e => { if (page !== 1) e.currentTarget.style.background = 'var(--surface)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; }}
      >
        {I.chevronLeft} Prev
      </button>

      <span style={{
        fontSize: 12.5,
        color: 'var(--ink)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '6px 14px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}>
        Page <strong style={{ color: 'var(--teal)', fontWeight: 700 }}>{page}</strong> / {totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={page === totalPages}
        style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--white)',
          color: page === totalPages ? 'var(--ink-soft)' : 'var(--ink)',
          fontSize: 12.5,
          fontWeight: 500,
          cursor: page === totalPages ? 'not-allowed' : 'pointer',
          opacity: page === totalPages ? 0.5 : 1,
          fontFamily: "'DM Sans',sans-serif",
          transition: 'all .15s ease',
        }}
        onMouseEnter={e => { if (page !== totalPages) e.currentTarget.style.background = 'var(--surface)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; }}
      >
        Next {I.chevronRight}
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function AcadAudit() {
  const {
    loading, error, refetch,
    entries, filteredCount, kpis, userOptions,
    actionFilter,   setActionFilter,
    userFilter,     setUserFilter,
    dateRange,      setDateRange,
    severityFilter, setSeverityFilter,
    search,         setSearch,
    resetFilters,
    page, setPage, totalPages, perPage,
    exportCSV,
  } = useAudit();

  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

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
              <span style={{ color: '#fff', display: 'flex' }}>{I.shieldLg}</span>
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: '-0.3px' }}>Audit Log</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>Complete trail of changes across the Academic Portal</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={refetch}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', background: 'rgba(255,255,255,0.14)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 500, backdropFilter: 'blur(6px)', transition: 'background 0.2s ease',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
            >
              {I.refresh} Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={loading || filteredCount === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', background: '#fff', color: '#15803d',
                border: 'none', borderRadius: 10, cursor: (loading || filteredCount === 0) ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600, boxShadow: '0 6px 16px -4px rgba(0,0,0,0.25)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                opacity: (loading || filteredCount === 0) ? 0.7 : 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 20px -4px rgba(0,0,0,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(0,0,0,0.25)'; }}
            >
              {I.download} Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Entries',  value: kpis.total,    color: 'var(--purple, #8B5CF6)', bg: 'var(--purple-pale, #F5F3FF)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Today',          value: kpis.today,    color: 'var(--blue)',  bg: 'var(--blue-pale)',  border: 'rgba(42,123,222,0.2)' },
          { label: 'Warnings',       value: kpis.warning,  color: 'var(--amber)', bg: 'var(--amber-pale)', border: 'rgba(232,160,32,0.2)' },
          { label: 'Critical',       value: kpis.critical, color: 'var(--red)',   bg: 'var(--red-pale)',   border: 'rgba(217,79,79,0.2)' },
        ].map(c => (
          <div
            key={c.label}
            style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: 10, color: c.color, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color, letterSpacing: '-1px' }}>
              {loading ? <div style={{ width: 36, height: 24, background: c.border, borderRadius: 6, opacity: 0.6 }} /> : c.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar – Updated Layout ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        background: '#fff',
        padding: '14px 18px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        marginBottom: 16,
        boxShadow: '0 2px 10px -6px rgba(0,0,0,0.06)',
      }}>
        {/* Search Input – takes remaining space */}
        <div style={{ flex: '1 1 200px', position: 'relative', minWidth: '160px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)', display: 'flex', pointerEvents: 'none' }}>{I.search}</span>
          <input
            type="text"
            placeholder="Search entity, user, or action…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              background: 'var(--white)',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Dropdowns – inline, with placeholder as first option */}
        <select
          className="filter-select"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value as ActionType)}
          style={{ flex: '0 1 150px', minWidth: '120px', padding: '8px 30px 8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', transition: 'border-color 0.2s ease' }}
        >
          {ACTION_TYPES.map(a => <option key={a} value={a}>{a === 'All' ? 'Action Type' : a}</option>)}
        </select>

        <select
          className="filter-select"
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          style={{ flex: '0 1 140px', minWidth: '110px', padding: '8px 30px 8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', transition: 'border-color 0.2s ease' }}
        >
          {userOptions.map((u: string) => <option key={u} value={u}>{u === 'All Users' ? 'User' : u}</option>)}
        </select>

        <select
          className="filter-select"
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as any)}
          style={{ flex: '0 1 120px', minWidth: '100px', padding: '8px 30px 8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', transition: 'border-color 0.2s ease' }}
        >
          {SEVERITIES.map(s => <option key={s} value={s}>{s === 'All' ? 'Severity' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>

        <select
          className="filter-select"
          value={dateRange}
          onChange={e => setDateRange(e.target.value)}
          style={{ flex: '0 1 140px', minWidth: '110px', padding: '8px 30px 8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: '#fff', transition: 'border-color 0.2s ease' }}
        >
          {DATE_RANGES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ whiteSpace: 'nowrap', transition: 'background 0.2s ease' }}>
            Reset
          </button>
        </div>
      </div>

      {/* ── Action Type Quick Pills ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {ACTION_TYPES.map(a => {
          const ab = actionBadge(a);
          const active = actionFilter === a;
          return (
            <button key={a} onClick={() => setActionFilter(a)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 400,
              border: `1.5px solid ${active ? `var(--${ab.color})` : 'var(--border)'}`,
              background: active ? `var(--${ab.color}-pale)` : 'transparent',
              color: active ? `var(--${ab.color})` : 'var(--ink-soft)',
              cursor: 'pointer', transition: 'all .15s ease', fontFamily: "'DM Sans',sans-serif",
            }}>
              {a === 'All' ? 'All Actions' : ab.label}
            </button>
          );
        })}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ background: 'var(--red-pale)', border: '1px solid var(--red)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--red)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {error}</span>
          <button onClick={refetch} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* ── Table Card ── */}
      <div className="card" style={{ boxShadow: '0 2px 12px -8px rgba(0,0,0,0.08)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--teal)', display: 'flex' }}>{I.shield}</span>
            <div className="card-title">
              Complete Audit Trail
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-soft)', marginLeft: 8 }}>
                {filteredCount} entries
              </span>
            </div>
          </div>
        </div>

        {loading ? <LoadingSkeleton /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ minWidth: 150, whiteSpace: 'nowrap' }}>Timestamp</th>
                  <th style={{ minWidth: 130 }}>Action</th>
                  <th style={{ minWidth: 160 }}>Entity</th>
                  <th style={{ minWidth: 100 }}>Changed By</th>
                  <th style={{ minWidth: 110 }}>IP Address</th>
                  <th style={{ minWidth: 120 }}>Before</th>
                  <th style={{ minWidth: 180 }}>After</th>
                  <th style={{ minWidth: 70 }}>Severity</th>
                  <th style={{ textAlign: 'right', minWidth: 60 }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-soft)' }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
                      No audit entries match your filters
                    </td>
                  </tr>
                ) : entries.map((entry: AuditEntry) => {
                  const ab = actionBadge(entry.action);
                  const sv = severityDot(entry.severity);
                  const rowBg = entry.severity === 'critical' ? 'rgba(217,79,79,0.03)' : entry.severity === 'warning' ? 'rgba(232,160,32,0.03)' : 'transparent';
                  const rowHoverBg = entry.severity === 'critical' ? 'rgba(217,79,79,0.07)' : entry.severity === 'warning' ? 'rgba(232,160,32,0.07)' : 'var(--surface)';
                  return (
                    <tr
                      key={entry.id}
                      style={{ background: rowBg, transition: 'background 0.15s ease' }}
                      onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                      onMouseLeave={e => e.currentTarget.style.background = rowBg}
                    >
                      <td style={{ fontSize: 11.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{entry.timestamp}</td>
                      <td>
                        <span className={`badge badge-${ab.color}`}>{ab.label}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.entity}</div>
                        {entry.entityId && <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', fontFamily: 'monospace' }}>{entry.entityId}</div>}
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--ink-mid)' }}>{entry.changedBy}</td>
                      <td style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontFamily: 'monospace' }}>{entry.ip}</td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.before}>{entry.before}</td>
                      <td style={{ fontSize: 12, color: 'var(--ink-mid)', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.after}>{entry.after}</td>
                      <td>
                        <span style={{ fontSize: 14, color: sv.color }}>{sv.dot}</span>
                        <span style={{ fontSize: 10.5, color: sv.color, marginLeft: 4, fontWeight: 600 }}>
                          {entry.severity}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetailEntry(entry)} title="View Detail">
                          {I.eye}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination — compact, left-aligned */}
        {!loading && totalPages > 1 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <CompactPagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
            />
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredCount)} of {filteredCount}
            </span>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span>{filteredCount} entries shown</span>
            <span style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--amber)' }}>⚠ {kpis.warning} warnings</span>
              <span style={{ color: 'var(--red)' }}>🔴 {kpis.critical} critical</span>
            </span>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailEntry && <DetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />}
    </div>
  );
}