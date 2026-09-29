// pages/AcademicDashboard.tsx
import { useNavigate } from 'react-router-dom';
import { useAcademicDashboard } from '../hooks/UseAcademicDashboard';

// ── THEME TOKENS (exactly matching Assessment page) ──────
const T = {
  primary:      '#16a34a',
  primaryLight: '#f0fdf4',
  primarySoft:  '#dcfce7',
  teal:         '#0d9488',
  tealBg:       '#dcfce7',
  tealSoft:     '#f0fdf9',
  amber:        '#d97706',
  amberBg:      '#fef3c7',
  red:          '#dc2626',
  redBg:        '#fee2e2',
  blue:         '#2563EB',
  blueBg:       '#EFF6FF',
  ink:          '#0f172a',
  inkSoft:      '#64748b',
  inkFaint:     '#94a3b8',
  border:       '#e2e8f0',
  surface:      '#f8fafc',
  white:        '#ffffff',
};

// ── Per-color palette: bg tint, solid text, gradient pair, glow shadow ──
const PALETTE: Record<'teal' | 'red' | 'amber' | 'blue', {
  bg: string; text: string; from: string; to: string; glow: string; ring: string;
}> = {
  teal:  { bg: T.tealBg,  text: T.teal,  from: '#14b8a6', to: '#0f766e', glow: 'rgba(13,148,136,0.35)',  ring: 'rgba(13,148,136,0.18)' },
  red:   { bg: T.redBg,   text: T.red,   from: '#f87171', to: '#b91c1c', glow: 'rgba(220,38,38,0.32)',   ring: 'rgba(220,38,38,0.16)' },
  amber: { bg: T.amberBg, text: T.amber, from: '#fbbf24', to: '#b45309', glow: 'rgba(217,119,6,0.32)',   ring: 'rgba(217,119,6,0.16)' },
  blue:  { bg: T.blueBg,  text: T.blue,  from: '#60a5fa', to: '#1d4ed8', glow: 'rgba(37,99,235,0.32)',   ring: 'rgba(37,99,235,0.16)' },
};

// ── ICONS (matching Assessment page style) ────────────────
const Icon = {
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  alertTriangle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  barChart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  checkCircle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  xCircle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  fileText: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  videoOff: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  shieldCheck: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  bookOpen: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  trendingUp: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  trendingDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
    </svg>
  ),
  chevron: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  clip: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" />
      <rect x="5" y="4" width="14" height="18" rx="2" ry="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
};

// ── KPI Card — glowing gradient icon badge, tinted glass background, colored hover glow ──
function KpiCard({ label, value, sub, icon, color, onClick, loading = false }: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  color: 'teal' | 'red' | 'amber' | 'blue';
  onClick?: () => void;
  loading?: boolean;
}) {
  const p = PALETTE[color];

  return (
    <div
      onClick={onClick}
      className="kpi-card"
      style={{
        background: T.white,
        borderRadius: 16,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        border: `1.5px solid ${T.border}`,
        boxShadow: `0 2px 14px -8px rgba(0,0,0,0.08)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: p.text }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, position: 'relative' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: T.inkSoft,
          textTransform: 'uppercase', letterSpacing: '.8px', marginTop: 4,
        }}>
          {label}
        </span>
        <span style={{
          background: p.bg,
          width: 32, height: 32, borderRadius: 9,
          color: p.text, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${p.text}26`,
          flexShrink: 0,
        }}>
          {icon}
        </span>
      </div>

      <div style={{ fontSize: 27, fontWeight: 700, color: p.text, letterSpacing: '-1px', lineHeight: 1.15, position: 'relative' }}>
        {loading ? <span style={{ opacity: 0.35 }}>—</span> : value}
      </div>

      {sub && !loading && (
        <div style={{ fontSize: 11, color: p.text, opacity: 0.8, marginTop: 7, display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}>
          {sub}
        </div>
      )}
      {loading && <div style={{ fontSize: 11, color: T.inkFaint, marginTop: 7, position: 'relative' }}>Loading…</div>}
    </div>
  );
}

// ── Section Header — transparent tinted icon chip + clean divider ──
function SectionHeader({ title, icon, color = T.primary }: { title: string; icon?: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 26 }}>
      {icon && (
        <span style={{
          background: `${color}14`,
          padding: 6, borderRadius: 8, color, display: 'flex',
          border: `1px solid ${color}26`,
        }}>
          {icon}
        </span>
      )}
      <span style={{ fontSize: 12, fontWeight: 700, color: T.inkSoft, letterSpacing: '1px', textTransform: 'uppercase' }}>
        {title}
      </span>
      <span style={{ flex: 1, height: 1.5, background: T.border, marginLeft: 4 }} />
    </div>
  );
}

// ── Academics Routes ──────────────────────────────────────
const AcademicsRoutes = {
  attendance: '/academics/attendance',
  assessment: '/academics/assessment',
  meetlinks: '/academics/meetlinks',
  teachers: '/academics/teachers',
  students: '/academics/students',
  sections: '/academics/sections',
  courses: '/academics/courses',
  reports: '/academics/reports',
};

function fmtShort(dateStr: string) {
  if (!dateStr) return dateStr;
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AcademicDashboard() {
  const navigate = useNavigate();

  const {
    attendance,
    attLoading,
    attSyncing,
    attError,
    lastSynced,
    assessment,
    assLoading,
    assError,
    operational,
    opsLoading,
    opsError,
  } = useAcademicDashboard();

  const trendSub = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {attendance.trendPts >= 0 ? Icon.trendingUp : Icon.trendingDown}
      <span style={{ fontWeight: 700 }}>
        {attendance.trendPts >= 0 ? '+' : ''}{attendance.trendPts}%
      </span>
      <span style={{ opacity: 0.6 }}>vs last month</span>
    </span>
  );

  const syncLabel = lastSynced
    ? lastSynced.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  const attDayLabel = attendance.isToday ? 'today' : `on ${fmtShort(attendance.referenceDate)}`;
  const opsDayLabel = operational.isToday ? 'today' : `on ${fmtShort(operational.referenceDate)}`;

  return (
    <div style={{ padding: '0 16px 24px', maxWidth: '100%', overflowX: 'hidden' }}>
      <style>{`
        @keyframes asmFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes asmSpin { to { transform: rotate(360deg); } }
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); }
          70%  { box-shadow: 0 0 0 7px rgba(74,222,128,0); }
          100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
        }

        .kpi-card { animation: asmFadeIn .25s ease; transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
        .kpi-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px -12px rgba(0,0,0,0.14) !important;
          border-color: ${T.inkFaint}55 !important;
        }

        .asm-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1.5px solid transparent; font-family: inherit;
          transition: all .15s ease; white-space: nowrap;
        }
        .asm-btn:disabled { opacity: .55; cursor: not-allowed; }
        .asm-btn-ghost { background: #fff; border-color: ${T.border}; color: ${T.ink}; }
        .asm-btn-ghost:hover:not(:disabled) { background: ${T.surface}; }
        .asm-btn-primary {
          background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff;
          box-shadow: 0 6px 14px -6px rgba(22,163,74,.5);
        }
        .asm-btn-primary:hover:not(:disabled) { filter: brightness(1.06); }
        .asm-btn-sm { padding: 7px 12px; font-size: 12px; }

        .asm-card {
          background: #fff; border: 1.5px solid ${T.border}; border-radius: 16px;
          box-shadow: 0 2px 12px -8px rgba(0,0,0,0.08); overflow: hidden;
          position: relative; transition: box-shadow .25s ease, transform .25s ease;
        }
        .asm-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: var(--asm-accent, ${T.primary});
        }
        .asm-card:hover { box-shadow: 0 10px 24px -14px rgba(0,0,0,0.16); }

        .asm-alert-card {
          background: #fff; border: 1.5px solid ${T.border}; border-radius: 14px;
          padding: 14px 16px 14px 18px; margin-bottom: 10px; transition: all .2s ease;
          box-shadow: 0 2px 8px -6px rgba(0,0,0,0.06);
          display: flex; gap: 12px; align-items: flex-start;
        }
        .asm-alert-card:hover { transform: translateX(4px); }
        .asm-alert-card.red    { border-left: 4px solid ${T.red};   }
        .asm-alert-card.amber  { border-left: 4px solid ${T.amber}; }
        .asm-alert-card.blue   { border-left: 4px solid ${T.blue};  }
        .asm-alert-card.green  { border-left: 4px solid ${T.teal};  }
        .asm-alert-card.red:hover, .asm-alert-card.amber:hover, .asm-alert-card.blue:hover, .asm-alert-card.green:hover {
          box-shadow: 0 6px 16px -10px rgba(0,0,0,0.18);
        }

        .asm-alert-dot {
          width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .asm-alert-card.red .asm-alert-dot   { background: ${T.redBg};   color: ${T.red};  border: 1px solid ${T.red}26; }
        .asm-alert-card.amber .asm-alert-dot { background: ${T.amberBg}; color: ${T.amber}; border: 1px solid ${T.amber}26; }
        .asm-alert-card.blue .asm-alert-dot  { background: ${T.blueBg};  color: ${T.blue};  border: 1px solid ${T.blue}26; }
        .asm-alert-card.green .asm-alert-dot { background: ${T.tealBg}; color: ${T.teal};  border: 1px solid ${T.teal}26; }

        .asm-alert-title { font-size: 13px; font-weight: 700; color: ${T.ink}; margin-bottom: 4px; }
        .asm-alert-body { font-size: 12.5px; color: ${T.inkSoft}; line-height: 1.6; }

        .asm-actions-strip {
          display: flex; flex-wrap: wrap; gap: 10px; padding: 16px 18px;
          background: linear-gradient(160deg, #ffffff, ${T.surface});
          border: 1.5px solid ${T.border}; border-radius: 16px;
          box-shadow: 0 2px 12px -8px rgba(0,0,0,0.08); margin-top: 6px; align-items: center;
        }
        .asm-actions-label {
          font-size: 10px; font-weight: 700; color: ${T.inkSoft};
          text-transform: uppercase; letter-spacing: 0.8px; margin-right: 4px;
        }

        .asm-action-btn {
          display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px;
          font-size: 12.5px; font-weight: 600; border: 1.5px solid ${T.border}; color: ${T.ink};
          background: ${T.white}; cursor: pointer;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease, color .15s ease;
          font-family: inherit; white-space: nowrap;
        }
        .asm-action-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 14px -8px rgba(0,0,0,0.15); }
        .asm-action-btn.teal:hover  { border-color: ${T.teal};  color: ${T.teal};  background: ${T.tealBg}; }
        .asm-action-btn.red:hover   { border-color: ${T.red};   color: ${T.red};   background: ${T.redBg}; }
        .asm-action-btn.amber:hover { border-color: ${T.amber}; color: ${T.amber}; background: ${T.amberBg}; }
        .asm-action-btn.blue:hover  { border-color: ${T.blue};  color: ${T.blue};  background: ${T.blueBg}; }

        .asm-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 4px; }
        .asm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }

        @media (max-width: 768px) {
          .asm-grid-4 { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .asm-grid-2 { grid-template-columns: 1fr; }
          .asm-actions-strip { padding: 12px 14px; }
          .asm-action-btn { font-size: 11.5px; padding: 8px 13px; }
        }
        @media (max-width: 480px) {
          .asm-grid-4 { grid-template-columns: 1fr; }
          .asm-actions-strip { flex-direction: column; align-items: stretch; }
          .asm-actions-label { text-align: center; margin-bottom: 2px; }
          .asm-action-btn { justify-content: center; }
        }
      `}</style>

      {/* ── Header Banner ── */}
      <div style={{
        background: `linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)`,
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

        <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', flexShrink: 0 }}>
              <span style={{ color: '#fff', display: 'flex' }}>{Icon.clip}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: '-0.3px' }}>Academics Dashboard</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>Academic performance and management overview</p>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
          }}>
            <span style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: '#4ade80', animation: 'livePulse 1.8s infinite',
            }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>Live</span>
            {syncLabel && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>· {syncLabel}</span>
            )}
            {attSyncing && <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600 }}>⟳ syncing</span>}
          </div>
        </div>
      </div>

      {/* ── Error Banners ── */}
      {attError && (
        <div style={{ background: T.redBg, border: `1px solid ${T.red}55`, borderRadius: 12, padding: '12px 16px', marginBottom: 14, color: T.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠</span><span>Attendance data couldn't be loaded: {attError}</span>
        </div>
      )}
      {assError && (
        <div style={{ background: T.redBg, border: `1px solid ${T.red}55`, borderRadius: 12, padding: '12px 16px', marginBottom: 14, color: T.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠</span><span>Assessment data couldn't be loaded: {assError}</span>
        </div>
      )}
      {opsError && (
        <div style={{ background: T.redBg, border: `1px solid ${T.red}55`, borderRadius: 12, padding: '12px 16px', marginBottom: 14, color: T.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠</span><span>Operational data couldn't be loaded: {opsError}</span>
        </div>
      )}

      {/* ══ ATTENDANCE SECTION ─────────────────────────────── */}
      <SectionHeader title="ATTENDANCE" icon={Icon.users} color={T.teal} />
      <div className="asm-grid-4">
        <KpiCard label="Overall Attendance" value={`${attendance.overallPct}%`} color="teal" icon={Icon.users} sub={trendSub} loading={attLoading} onClick={() => navigate(AcademicsRoutes.attendance)} />
        <KpiCard label="Below Threshold" value={attendance.below75Count} color="red" icon={Icon.alertTriangle} sub="students flagged" loading={attLoading} onClick={() => navigate(AcademicsRoutes.attendance)} />
        <KpiCard label="Unmarked Sessions" value={attendance.unmarkedToday} color="amber" icon={Icon.clock} sub={attendance.scheduledToday === 0 ? 'no classes scheduled' : `of ${attendance.scheduledToday} sessions`} loading={attLoading} onClick={() => navigate(AcademicsRoutes.attendance)} />
        <KpiCard label="Chronic Absentees" value={attendance.chronicAbsentees} color="blue" icon={Icon.alertTriangle} sub="3+ consecutive absences" loading={attLoading} onClick={() => navigate(AcademicsRoutes.attendance)} />
      </div>

      {/* ══ ASSESSMENT SECTION ─────────────────────────────── */}
      <SectionHeader title="ASSESSMENT" icon={Icon.barChart} color={T.primary} />
      <div className="asm-grid-4">
        <KpiCard label="Section Avg Score" value={assLoading ? '—' : `${assessment.avg}%`} color="teal" icon={Icon.barChart} sub="target ≥ 65%" loading={assLoading} onClick={() => navigate(AcademicsRoutes.assessment)} />
        <KpiCard label="Pass Rate" value={assLoading ? '—' : `${assessment.passRate}%`} color="teal" icon={Icon.checkCircle} sub="target ≥ 80%" loading={assLoading} onClick={() => navigate(AcademicsRoutes.assessment)} />
        <KpiCard label="At-Risk Students" value={assLoading ? '—' : assessment.atRisk} color="red" icon={Icon.xCircle} sub="below 60%" loading={assLoading} onClick={() => navigate(AcademicsRoutes.assessment)} />
        <KpiCard label="Pending Grades" value={assLoading ? '—' : assessment.pending} color="amber" icon={Icon.fileText} sub="draft results" loading={assLoading} onClick={() => navigate(AcademicsRoutes.assessment)} />
      </div>

      {/* ══ OPERATIONAL SECTION ────────────────────────────── */}
      <SectionHeader title="OPERATIONAL" icon={Icon.video} color={T.blue} />
      <div className="asm-grid-4">
        <KpiCard label="Classes Held" value={operational.classesHeld} color="teal" icon={Icon.video} sub={operational.classesTotal === 0 ? 'no classes scheduled' : `of ${operational.classesTotal} scheduled`} loading={opsLoading} onClick={() => navigate(AcademicsRoutes.meetlinks)} />
        <KpiCard label="Ghost Classes" value={operational.ghostClasses} color="red" icon={Icon.videoOff} sub="no link or teacher" loading={opsLoading} onClick={() => navigate(AcademicsRoutes.meetlinks)} />
        <KpiCard label="Teacher Compliance" value={`${operational.teacherCompliance}%`} color="blue" icon={Icon.shieldCheck} sub="target ≥ 95%" loading={opsLoading} onClick={() => navigate(AcademicsRoutes.teachers)} />
        <KpiCard label="Active Enrolments" value={operational.activeEnrollments} color="amber" icon={Icon.bookOpen} sub={`of ${operational.totalEnrollments} total`} loading={opsLoading} />
      </div>

      {/* ══ ALERTS SECTION ──────────────────────────────────── */}
      <SectionHeader title="ALERTS REQUIRING ACTION" icon={Icon.alertTriangle} color={T.red} />
      <div className="asm-grid-2">
        <div className="asm-card" style={{ '--asm-accent': T.red } as React.CSSProperties}>
          <div className="asm-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.red, boxShadow: `0 0 0 4px ${T.redBg}` }} />
              Critical Alerts
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: '20px', fontSize: 11, fontWeight: 700, background: T.redBg, color: T.red }}>
              {operational.ghostClasses + (attendance.unmarkedToday > 0 ? 1 : 0)} issues
            </span>
          </div>
          <div style={{ padding: '16px 18px' }}>
            {/* Ghost Classes */}
            <div className={`asm-alert-card ${opsLoading ? 'blue' : operational.classesTotal === 0 ? 'blue' : operational.ghostClasses > 0 ? 'red' : 'green'}`}>
              <span className="asm-alert-dot">{operational.ghostClasses > 0 ? Icon.videoOff : Icon.checkCircle}</span>
              <div>
                <div className="asm-alert-title">
                  {opsLoading
                    ? 'Checking classes…'
                    : operational.classesTotal === 0
                      ? 'No Classes Scheduled'
                      : `${operational.ghostClasses} Ghost Class${operational.ghostClasses === 1 ? '' : 'es'} Detected`}
                </div>
                <div className="asm-alert-body">
                  {opsLoading
                    ? "Loading Course Schedule / Meet Link data…"
                    : operational.classesTotal === 0
                      ? "No Course Schedule entries found for today or any recent day."
                      : operational.ghostClasses > 0
                        ? `${operational.ghostClasses} of ${operational.classesTotal} classes ${opsDayLabel} have no Meet link or teacher assigned.`
                        : `✅ All ${operational.classesTotal} classes ${opsDayLabel} have teacher and Meet link.`}
                </div>
                {!opsLoading && operational.ghostClasses > 0 && (
                  <button onClick={() => navigate(AcademicsRoutes.meetlinks)} className="asm-btn asm-btn-primary asm-btn-sm" style={{ marginTop: 10 }}>
                    🔧 Fix Now
                  </button>
                )}
              </div>
            </div>

            {/* Unmarked Attendance */}
            <div className={`asm-alert-card ${attLoading ? 'blue' : attendance.scheduledToday === 0 ? 'blue' : attendance.unmarkedToday > 0 ? 'amber' : 'green'}`}>
              <span className="asm-alert-dot">{attendance.unmarkedToday > 0 ? Icon.clock : Icon.checkCircle}</span>
              <div>
                <div className="asm-alert-title">
                  {attLoading
                    ? 'Checking attendance…'
                    : attendance.scheduledToday === 0
                      ? 'No Sessions Scheduled'
                      : `${attendance.unmarkedToday} Session${attendance.unmarkedToday === 1 ? '' : 's'} Unmarked`}
                </div>
                <div className="asm-alert-body">
                  {attLoading
                    ? "Loading schedule vs marked attendance…"
                    : attendance.scheduledToday === 0
                      ? "No Course Schedule entries found for today or any recent day."
                      : attendance.unmarkedToday > 0
                        ? `${attendance.unmarkedToday} of ${attendance.scheduledToday} classes ${attDayLabel} still have no attendance marked.`
                        : `✅ All ${attendance.scheduledToday} classes ${attDayLabel} have attendance marked.`}
                </div>
                {!attLoading && attendance.unmarkedToday > 0 && (
                  <button onClick={() => navigate(AcademicsRoutes.attendance)} className="asm-btn asm-btn-primary asm-btn-sm" style={{ marginTop: 10 }}>
                    📝 Mark Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="asm-card" style={{ '--asm-accent': T.amber } as React.CSSProperties}>
          <div className="asm-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.amber, boxShadow: `0 0 0 4px ${T.amberBg}` }} />
              Warning Alerts
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: '20px', fontSize: 11, fontWeight: 700, background: T.amberBg, color: T.amber }}>
              {attendance.below75Count + (assessment.atRisk || 0) + (assessment.pending || 0)} warnings
            </span>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div className={`asm-alert-card ${attLoading ? 'blue' : attendance.below75Count > 0 ? 'amber' : 'green'}`}>
              <span className="asm-alert-dot">{attendance.below75Count > 0 ? Icon.alertTriangle : Icon.checkCircle}</span>
              <div>
                <div className="asm-alert-title">
                  {attLoading ? 'Loading attendance…' : `${attendance.below75Count} Students Below 75%`}
                </div>
                <div className="asm-alert-body">
                  {attLoading
                    ? 'Computing risk levels from attendance data…'
                    : attendance.chronicAbsentees > 0
                      ? `${attendance.chronicAbsentees} student${attendance.chronicAbsentees === 1 ? ' has' : 's have'} 3+ consecutive absences.`
                      : '✅ No students with 3+ consecutive absences.'}
                </div>
                <button onClick={() => navigate(AcademicsRoutes.attendance)} className="asm-btn asm-btn-ghost asm-btn-sm" style={{ marginTop: 10 }}>
                  👁️ View Details
                </button>
              </div>
            </div>

            {!assLoading && assessment.atRisk > 0 && (
              <div className="asm-alert-card amber">
                <span className="asm-alert-dot">{Icon.xCircle}</span>
                <div>
                  <div className="asm-alert-title">{assessment.atRisk} At-Risk Students</div>
                  <div className="asm-alert-body">
                    {assessment.atRisk} student{assessment.atRisk === 1 ? '' : 's'} scoring below 60% average.
                  </div>
                  <button onClick={() => navigate(AcademicsRoutes.assessment)} className="asm-btn asm-btn-ghost asm-btn-sm" style={{ marginTop: 10 }}>
                    📊 Review Grades
                  </button>
                </div>
              </div>
            )}

            {!assLoading && assessment.pending > 0 && (
              <div className="asm-alert-card amber">
                <span className="asm-alert-dot">{Icon.fileText}</span>
                <div>
                  <div className="asm-alert-title">{assessment.pending} Pending Assessment{assessment.pending === 1 ? '' : 's'}</div>
                  <div className="asm-alert-body">
                    {assessment.pending} draft result{assessment.pending === 1 ? '' : 's'} need{assessment.pending === 1 ? 's' : ''} to be finalized.
                  </div>
                  <button onClick={() => navigate(AcademicsRoutes.assessment)} className="asm-btn asm-btn-ghost asm-btn-sm" style={{ marginTop: 10 }}>
                    ✏️ Enter Grades
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ QUICK ACTIONS ───────────────────────────────────── */}
      <SectionHeader title="QUICK ACTIONS" icon={Icon.grid} color={T.inkSoft} />
      <div className="asm-actions-strip">
        <span className="asm-actions-label">Actions</span>
        <button onClick={() => navigate(AcademicsRoutes.attendance)} className="asm-action-btn teal">{Icon.checkCircle} Mark Attendance</button>
        <button onClick={() => navigate(AcademicsRoutes.meetlinks)} className="asm-action-btn red">{Icon.video} Update Links</button>
        <button onClick={() => navigate(AcademicsRoutes.assessment)} className="asm-action-btn amber">{Icon.fileText} Enter Grades</button>
        <button onClick={() => navigate(AcademicsRoutes.students)} className="asm-action-btn teal">{Icon.plus} Add Student</button>
        <button onClick={() => navigate(AcademicsRoutes.teachers)} className="asm-action-btn blue">{Icon.plus} Assign Teacher</button>
        <button onClick={() => navigate(AcademicsRoutes.reports)} className="asm-action-btn teal">{Icon.barChart} Reports</button>
      </div>
    </div>
  );
}