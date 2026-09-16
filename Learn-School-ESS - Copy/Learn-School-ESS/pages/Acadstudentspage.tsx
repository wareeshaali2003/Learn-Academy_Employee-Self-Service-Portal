// pages/Acadstudentspage.tsx
import { useState, useMemo, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useAcadStudents } from "../hooks/Useacadstudents";
import type { EnrichedStudent, StudentStatus, SectionCapacity, TabId, NewStudentPayload, GuardianDetail } from "../hooks/Useacadstudents";

const I = {
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  refresh: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  download: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  transfer: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  status: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
  x: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  mail: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  calendar: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  book: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  warning: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  id: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  students: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  phone: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.18 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  globe: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  blood: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8 6 4 10 4 14c0 4.4 3.6 8 8 8s8-3.6 8-8c0-4-4-8-8-12z"/><path d="M12 6v8"/><path d="M8 10h8"/></svg>,
  gender: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="7" x2="12" y2="2"/><line x1="9" y1="4" x2="15" y2="4"/></svg>,
  address: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
};

type StatusCfg = { bg: string; dot: string; text: string; border: string; pillBg: string };

function statusCfg(status: StudentStatus): StatusCfg {
  switch (status) {
    case "Active": return { bg: "var(--teal-pale)", dot: "var(--teal)", text: "var(--teal)", border: "rgba(11,139,111,.25)", pillBg: "var(--teal-pale)" };
    case "Inactive": return { bg: "var(--red-pale)", dot: "var(--red)", text: "var(--red)", border: "rgba(217,79,79,.25)", pillBg: "var(--red-pale)" };
    case "Suspended": return { bg: "var(--amber-pale)", dot: "var(--amber)", text: "var(--amber)", border: "rgba(232,160,32,.25)", pillBg: "var(--amber-pale)" };
    case "On Leave": return { bg: "var(--blue-pale)", dot: "var(--blue)", text: "var(--blue)", border: "rgba(42,123,222,.25)", pillBg: "var(--blue-pale)" };
    default: return { bg: "var(--surface)", dot: "var(--ink-soft)", text: "var(--ink-soft)", border: "var(--border)", pillBg: "var(--surface)" };
  }
}

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = [
  { value: "Active", label: "● Active" },
  { value: "Inactive", label: "● Inactive" },
  { value: "Suspended", label: "● Suspended" },
  { value: "On Leave", label: "● On Leave" },
];

const CHANGE_REASONS = [
  "— Select reason —",
  "Family circumstances",
  "Medical leave",
  "Academic probation",
  "Fee default",
  "Disciplinary action",
  "Other",
];

const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COUNTRIES = ["", "Pakistan", "India", "Bangladesh", "Sri Lanka", "Nepal", "Afghanistan", "Iran", "China", "Saudi Arabia", "UAE", "UK", "USA", "Canada", "Australia"];
const ID_TYPES = ["", "CNIC", "B-Form", "Passport", "Student ID", "Other"];
const GENDER_OPTIONS = ["", "Male", "Female", "Other"];

const initials = (name: string) =>
  name.split(" ").slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("");

const attColor = (p: number) =>
  p >= 80 ? "var(--teal)" : p >= 65 ? "var(--amber)" : "var(--red)";

function Avatar({ name, status, size = 32 }: { name: string; status: StudentStatus; size?: number }) {
  const cfg = statusCfg(status);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: cfg.bg, color: cfg.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function StatusPill({ status }: { status: StudentStatus }) {
  const cfg = statusCfg(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.pillBg, color: cfg.text,
      border: `1px solid ${cfg.border}`,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {status || "Unknown"}
    </span>
  );
}

function AttBar({ pct }: { pct: number }) {
  const color = attColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 72, height: 5, borderRadius: 3, background: "var(--border)", flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

function CellSkeleton() {
  return (
    <div style={{
      width: 64, height: 10, borderRadius: 5,
      background: "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

function KpiStrip({ stats, loadingStats, lastSynced, liveCount }: {
  stats: ReturnType<typeof useAcadStudents>["stats"];
  loadingStats: boolean;
  lastSynced: Date | null;
  liveCount: number | null;
}) {
  const cards = [
    { label: "Total Students", value: stats.total, color: "#2563EB", bg: "#EFF6FF", border: "rgba(37,99,235,.2)" },
    { label: "Active", value: stats.active, color: "var(--teal)", bg: "var(--teal-pale)", border: "rgba(11,139,111,.2)" },
    { label: "Inactive", value: stats.inactive, color: "var(--red)", bg: "var(--red-pale)", border: "rgba(217,79,79,.2)" },
    { label: "Suspended", value: stats.suspended, color: "var(--amber)", bg: "var(--amber-pale)", border: "rgba(232,160,32,.2)" },
    { label: "On Leave", value: stats.onLeave, color: "var(--blue)", bg: "var(--blue-pale)", border: "rgba(42,123,222,.2)" },
    { label: "Below 75% Att.", value: stats.belowThreshold, color: "var(--red)", bg: "var(--red-pale)", border: "rgba(217,79,79,.2)" },
  ];

  const syncLabel = lastSynced
    ? lastSynced.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const countMismatch = liveCount !== null && liveCount !== stats.total;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px", marginBottom: 12,
        background: countMismatch ? "var(--amber-pale)" : "var(--surface)",
        border: `1px solid ${countMismatch ? "rgba(232,160,32,.4)" : "var(--border)"}`,
        borderRadius: 10, fontSize: 11, gap: 8, flexWrap: "wrap",
        boxShadow: "0 2px 8px -4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--teal)", boxShadow: "0 0 0 2px rgba(11,139,111,0.25)", animation: "pulse 2s infinite" }} />
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          <span style={{ color: "var(--ink-soft)" }}>Live sync with ERP — polls every 30s</span>
          {syncLabel && <span style={{ color: "var(--ink-soft)", fontFamily: "monospace" }}>Last checked: <strong style={{ color: "var(--ink)" }}>{syncLabel}</strong></span>}
        </div>
        {liveCount !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {countMismatch ? (
              <span style={{ color: "var(--amber)", fontWeight: 700 }}>⚠ ERP: {liveCount} &nbsp;|&nbsp; Portal: {stats.total} — syncing…</span>
            ) : (
              <span style={{ color: "var(--teal)", fontWeight: 600 }}>✓ ERP: {liveCount} students — portal in sync</span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 16px", transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "default" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 20px -10px rgba(0,0,0,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ fontSize: 10, color: c.color, textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.color, lineHeight: 1, letterSpacing: "-1px" }}>
              {loadingStats && c.label === "Below 75% Att." ? (
                <div style={{ width: 40, height: 28, borderRadius: 6, background: "var(--border)", opacity: 0.6 }} />
              ) : c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, goToPage, totalCount, pageSize }: {
  currentPage: number; totalPages: number; goToPage: (p: number) => void;
  totalCount: number; pageSize: number;
}) {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btn = (active = false): React.CSSProperties => ({
    minWidth: 34, height: 34, padding: "0 8px", borderRadius: 8,
    border: `1.5px solid ${active ? "var(--teal)" : "var(--border)"}`,
    background: active ? "var(--teal-pale)" : "var(--white)",
    color: active ? "var(--teal)" : "var(--ink)",
    fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer",
    transition: "all .15s ease",
  });

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
        Showing <b style={{ color: "var(--ink)" }}>{start}–{end}</b> of <b style={{ color: "var(--ink)" }}>{totalCount}</b> students
      </span>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ ...btn(), opacity: currentPage === 1 ? 0.4 : 1 }}>‹</button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`d${i}`} style={{ padding: "0 4px", color: "var(--ink-soft)", fontSize: 13 }}>…</span>
          ) : (
            <button key={p} onClick={() => goToPage(p as number)} style={btn(p === currentPage)}>{p}</button>
          )
        )}
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...btn(), opacity: currentPage === totalPages ? 0.4 : 1 }}>›</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🆕 MODAL - FIXED FOR 100% SCREEN DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════
function Modal({ title, subtitle, onClose, children, width = 540 }: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; width?: number;
}) {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  
  // ── ✅ FIX: Proper width calculation ──
  let modalWidth;
  if (isMobile) {
    modalWidth = windowWidth - 24;
  } else if (isTablet) {
    modalWidth = Math.min(width, windowWidth - 48);
  } else {
    modalWidth = Math.min(width, 560);
  }
  
  const maxModalHeight = Math.min(windowHeight - 40, 650);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '12px' : '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: modalWidth,
          maxHeight: maxModalHeight,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          animation: 'modalSlideIn 0.25s ease',
        }}
      >
        <style>{`
          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          .modal-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .modal-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          .modal-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .modal-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        {/* ── HEADER ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '14px 16px' : '18px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e8edf4',
          flexShrink: 0,
          gap: '12px',
          minHeight: isMobile ? '56px' : '68px',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: isMobile ? '16px' : '19px',
              fontWeight: 700,
              color: '#0f2137',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.3px',
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{
                fontSize: isMobile ? '11px' : '13px',
                color: '#64748b',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: isMobile ? 32 : 36,
              height: isMobile ? 32 : 36,
              borderRadius: 8,
              border: '1px solid #e8edf4',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              flexShrink: 0,
              transition: 'all 0.2s ease',
              padding: 0,
              fontSize: isMobile ? 14 : 16,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.borderColor = '#fecaca';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#e8edf4';
            }}
          >
            ✕
          </button>
        </div>

        {/* ── CONTENT - SCROLLABLE ── */}
        <div
          className="modal-scrollbar"
          style={{
            padding: isMobile ? '16px' : '24px 28px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            backgroundColor: '#fafcff',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SearchableStudentSelect({
  students,
  value,
  onChange,
  placeholder = "Search student…",
}: {
  students: EnrichedStudent[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      s =>
        s.student_name.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [students, searchTerm]);

  const selectedStudent = students.find(s => s.name === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => {
          setIsOpen(true);
          setSearchTerm("");
        }}
        style={{
          padding: "8px 12px",
          border: "1.5px solid var(--border)",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          background: "var(--white)",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: selectedStudent ? "var(--ink)" : "var(--ink-soft)",
          minHeight: 40,
        }}
        tabIndex={0}
        onFocus={() => setIsOpen(true)}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedStudent
            ? `${selectedStudent.student_name} (${selectedStudent.name})`
            : placeholder}
        </span>
        <span style={{ color: "var(--ink-soft)", marginLeft: 8 }}>▼</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 400,
            background: "var(--white)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 12px 28px rgba(0,0,0,0.15)",
            maxHeight: 300, overflow: "hidden", display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
            <input
              type="text"
              autoFocus
              placeholder="Type name or ID…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: "100%", padding: "7px 10px", borderRadius: 6,
                border: "1px solid var(--border)", fontSize: 12, outline: "none",
                boxSizing: "border-box",
              }}
              onKeyDown={e => e.stopPropagation()}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px", textAlign: "center", color: "var(--ink-soft)", fontSize: 12 }}>
                No students found
              </div>
            ) : (
              filtered.map(s => (
                <div
                  key={s.name}
                  onClick={() => { onChange(s.name); setIsOpen(false); setSearchTerm(""); }}
                  style={{
                    padding: "9px 12px", cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                    background: s.name === value ? "var(--teal-pale)" : "transparent",
                    color: s.name === value ? "var(--teal)" : "var(--ink)",
                    fontSize: 12, fontWeight: s.name === value ? 600 : 400,
                    transition: "background 0.1s",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                  onMouseEnter={e => { if (s.name !== value) e.currentTarget.style.background = "var(--surface)"; }}
                  onMouseLeave={e => { if (s.name !== value) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.student_name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ink-soft)", marginLeft: 8 }}>{s.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileModal({
  student, detail, detailLoading, loadingStats,
  guardians, guardianLoading,
  onClose, onStatusClick, onTransferClick,
}: {
  student: EnrichedStudent; detail: any; detailLoading: boolean; loadingStats: boolean;
  guardians: GuardianDetail[]; guardianLoading: boolean;
  onClose: () => void; onStatusClick: () => void; onTransferClick: () => void;
}) {
  const att = student.attendancePct ?? 0;
  const score = student.avgScore ?? 0;

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMobile = windowWidth < 640;

  const initialsOf = (name?: string) =>
    (name || "").split(" ").slice(0, 2).map(p => p[0]?.toUpperCase() ?? "").join("") || "G";

  return (
    <Modal title="Student Profile" subtitle={student.name} onClose={onClose} width={560}>
      {/* ── Student header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <Avatar name={student.student_name} status={student.status} size={56} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{student.student_name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
            <StatusPill status={student.status} />
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{student.grade} · {student.section}</span>
          </div>
        </div>
      </div>

      {/* ── Student full info grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: I.id, label: "Student ID", value: student.name },
          { icon: I.mail, label: "Email", value: student.student_email_id || "—" },
          { icon: I.calendar, label: "Joining Date", value: student.joining_date || "—" },
          { icon: I.book, label: "Program", value: student.grade || "—" },
          { icon: I.blood, label: "Blood Group", value: (detail as any)?.blood_group || "—" },
          { icon: I.gender, label: "Gender", value: (detail as any)?.gender || "—" },
          { icon: I.globe, label: "Nationality", value: (detail as any)?.nationality || "—" },
          { icon: I.calendar, label: "Date of Birth", value: (detail as any)?.date_of_birth || "—" },
          { icon: I.phone, label: "Mobile", value: (detail as any)?.student_mobile_number || "—" },
          { icon: I.address, label: "City / Country", value: [(detail as any)?.city, (detail as any)?.country].filter(Boolean).join(", ") || "—" },
        ].map(row => (
          <div key={row.label} style={{ background: "var(--surface)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ color: "var(--ink-soft)", display: "flex", flexShrink: 0 }}>{row.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", fontWeight: 600 }}>{row.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 1, wordBreak: "break-word" }}>{row.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Attendance / Score ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "var(--teal-pale)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(11,139,111,.15)" }}>
          <div style={{ fontSize: 10, color: "var(--teal)", textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 600, marginBottom: 6 }}>Attendance</div>
          {loadingStats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: 60, height: 28, borderRadius: 6, background: "var(--border)", opacity: 0.5 }} />
              <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border)", opacity: 0.5 }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, color: student.attendancePct !== undefined ? attColor(att) : "var(--ink-soft)", letterSpacing: "-1px" }}>
                {student.attendancePct !== undefined ? `${att}%` : "—"}
              </div>
              {student.attendancePct !== undefined && (
                <>
                  <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border)", marginTop: 8 }}>
                    <div style={{ width: `${att}%`, height: "100%", borderRadius: 2, background: attColor(att) }} />
                  </div>
                  {att < 75 && (
                    <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      {I.warning} Below 75% threshold
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div style={{ background: "var(--blue-pale)", borderRadius: 10, padding: "12px 16px", border: "1px solid rgba(42,123,222,.15)" }}>
          <div style={{ fontSize: 10, color: "var(--blue)", textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 600, marginBottom: 6 }}>Avg Score</div>
          {loadingStats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ width: 60, height: 28, borderRadius: 6, background: "var(--border)", opacity: 0.5 }} />
              <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border)", opacity: 0.5 }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 700, color: score >= 60 ? "var(--teal)" : score > 0 ? "var(--red)" : "var(--ink-soft)", letterSpacing: "-1px" }}>
                {student.avgScore !== undefined ? (score > 0 ? `${score}%` : "0%") : "—"}
              </div>
              {student.avgScore !== undefined && score > 0 && (
                <div style={{ width: "100%", height: 4, borderRadius: 2, background: "var(--border)", marginTop: 8 }}>
                  <div style={{ width: `${score}%`, height: "100%", borderRadius: 2, background: score >= 80 ? "var(--teal)" : score >= 60 ? "var(--amber)" : "var(--red)" }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {detailLoading && (
        <div style={{ textAlign: "center", padding: 12, color: "var(--ink-soft)", fontSize: 13 }}>Loading full profile…</div>
      )}

      {/* ── GUARDIANS SECTION — full details, responsive grid ── */}
      {!detailLoading && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "flex", alignItems: "center", gap: 6 }}>
              {I.user} Guardians
              {guardians.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "var(--surface)", color: "var(--ink-soft)", border: "1px solid var(--border)" }}>
                  {guardians.length}
                </span>
              )}
            </div>
            {guardianLoading && <span style={{ fontSize: 11, color: "var(--blue)" }}>⟳ Loading…</span>}
          </div>

          {guardianLoading && guardians.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2].map(i => (
                <div key={i} style={{ height: 90, borderRadius: 10, background: "var(--surface)", opacity: 0.6 }} />
              ))}
            </div>
          ) : guardians.length === 0 ? (
            <div style={{
              padding: "16px", textAlign: "center", color: "var(--ink-soft)", fontSize: 12,
              background: "var(--surface)", borderRadius: 10, border: "1px dashed var(--border)",
            }}>
              No guardian records found for this student
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              {guardians.map((g) => (
                <div key={g.name} style={{
                  border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px",
                  background: "var(--white)", minWidth: 0,
                  height: "100%", display: "flex", flexDirection: "column",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, background: "var(--blue-pale)", color: "var(--blue)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {initialsOf(g.guardian_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {g.guardian_name || g.name}
                      </div>
                      {g.relation && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: "var(--blue)",
                          background: "var(--blue-pale)", border: "1px solid rgba(42,123,222,.25)",
                          padding: "1px 8px", borderRadius: 20, display: "inline-block", marginTop: 2,
                        }}>
                          {g.relation}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    {[
                        { icon: I.id, label: "Guardian ID", value: g.name },
                        { icon: I.phone, label: "Mobile", value: g.mobile_number },
                        { icon: I.phone, label: "Alternate", value: g.alternate_number },
                        { icon: I.mail, label: "Email", value: g.email_address },
                        { icon: I.calendar, label: "Date of Birth", value: g.date_of_birth },
                        { icon: I.id, label: "ID Type", value: g.id_type },
                        { icon: I.id, label: "ID Number", value: g.id_number },
                        { icon: I.book, label: "Education", value: g.education },
                        { icon: I.book, label: "Occupation", value: g.occupation },
                        { icon: I.book, label: "Designation", value: g.designation },
                        { icon: I.address, label: "Work Address", value: g.work_address },
                        { icon: I.user, label: "User ID", value: g.user },
                      ]
                      .filter(r => r.value)
                      .map(r => (
                      <div key={r.label} style={{
                        display: "grid",
                        gridTemplateColumns: "16px 1fr",   
                        columnGap: 8,
                        alignItems: "start",
                        }}>
                          <span style={{
                            color: "var(--ink-soft)", display: "flex", alignItems: "center",
                            justifyContent: "center", height: 17, flexShrink: 0,
                            }}>
                              {r.icon}
                              </span>
                              <div style={{ minWidth: 0, lineHeight: 1.5 }}>
                                <span style={{ fontSize: 10, color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" }}>{r.label}: </span>
                                <span style={{ fontSize: 12, fontWeight: 500, wordBreak: "break-word" }}>{r.value}</span>
                                </div>
                                </div>
                              ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
        <button className="btn btn-ghost" style={{ flex: 1, minWidth: "120px" }} onClick={() => { onStatusClick(); onClose(); }}>
          {I.status} Change Status
        </button>
        <button className="btn btn-primary" style={{ flex: 1, minWidth: "120px" }} onClick={() => { onTransferClick(); onClose(); }}>
          {I.transfer} Transfer Section
        </button>
      </div>
    </Modal>
  );
}

function StatusModal({ student, onClose, onApply, saving }: {
  student: EnrichedStudent; onClose: () => void; saving: boolean;
  onApply: (studentId: string, newStatus: StudentStatus, reason: string) => Promise<boolean>;
}) {
  const [newStatus, setNewStatus] = useState<StudentStatus>(student.status);
  const [reason, setReason] = useState("");

  const handle = async () => {
    if (!reason || reason === "— Select reason —") { toast.error("Please select a reason"); return; }
    const ok = await onApply(student.name, newStatus, reason);
    if (ok) onClose();
  };

  return (
    <Modal title="Change Student Status" subtitle={`${student.student_name} — ${student.name}`} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface)", borderRadius: 10, marginBottom: 16 }}>
        <Avatar name={student.student_name} status={student.status} size={38} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{student.student_name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 3 }}>Current: <StatusPill status={student.status} /></div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 8 }}>New Status</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STATUS_OPTIONS.map(opt => {
            const cfg = statusCfg(opt.value);
            const sel = newStatus === opt.value;
            return (
              <div key={opt.value} onClick={() => setNewStatus(opt.value)} style={{
                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${sel ? cfg.dot : "var(--border)"}`,
                background: sel ? cfg.bg : "transparent",
                color: sel ? cfg.text : "var(--ink-soft)",
                fontWeight: sel ? 700 : 400, fontSize: 13, transition: "all .13s",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                {sel && <span style={{ display: "flex", flexShrink: 0 }}>{I.check}</span>}
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 8 }}>Reason</label>
        <select className="filter-select" style={{ width: "100%" }} value={reason} onChange={e => setReason(e.target.value)}>
          {CHANGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handle} disabled={saving}>
          {saving ? "Saving…" : <>{I.check} Apply Status Change</>}
        </button>
      </div>
    </Modal>
  );
}

function TransferModal({ student, sections, onClose, onApply, saving, allStudents }: {
  student: EnrichedStudent; sections: SectionCapacity[]; onClose: () => void; saving: boolean;
  onApply: (studentId: string, studentName: string, fromSection: string, toSection: string) => Promise<boolean>;
  allStudents: EnrichedStudent[];
}) {
  const [selectedStudentId, setSelectedStudentId] = useState(student.name);
  const selectedStudent = allStudents.find(s => s.name === selectedStudentId) ?? student;

  const available = sections.filter(s => s.name !== selectedStudent.section);
  const [toSection, setToSection] = useState(available[0]?.name || "");

  const target = available.find(s => s.name === toSection);
  const isFull = target ? target.enrolled >= target.capacity : false;

  const handle = async () => {
    if (!toSection) { toast.error("Select a section"); return; }
    const ok = await onApply(selectedStudent.name, selectedStudent.student_name, selectedStudent.section, toSection);
    if (ok) onClose();
  };

  return (
    <Modal title="Section Transfer" subtitle={selectedStudent.name} onClose={onClose} width={500}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>
          Student
        </label>
        <SearchableStudentSelect
          students={allStudents}
          value={selectedStudentId}
          onChange={setSelectedStudentId}
          placeholder="Search by name or ID…"
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface)", borderRadius: 10, marginBottom: 16 }}>
        <Avatar name={selectedStudent.student_name} status={selectedStudent.status} size={38} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedStudent.student_name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
            {selectedStudent.grade} · {selectedStudent.section || "No section"}
          </div>
        </div>
        <StatusPill status={selectedStudent.status} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end", marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>From</label>
          <div style={{ padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "var(--surface)" }}>
            {selectedStudent.section || "—"}
          </div>
        </div>
        <div style={{ color: "var(--teal)", display: "flex", paddingBottom: 8 }}>{I.arrow}</div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>To Section</label>
          <select className="filter-select" style={{ width: "100%" }} value={toSection} onChange={e => setToSection(e.target.value)}>
            {available.length === 0
              ? <option value="">No other sections</option>
              : available.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({s.enrolled}/{s.capacity}{s.enrolled >= s.capacity ? " — Full" : ""})
                </option>
              ))
            }
          </select>
        </div>
      </div>

      {target && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-soft)", marginBottom: 5 }}>
            <span>Occupancy after transfer</span>
            <span style={{ fontWeight: 700, color: isFull ? "var(--red)" : "var(--teal)" }}>
              {target.enrolled + 1}/{target.capacity}
            </span>
          </div>
          <div style={{ width: "100%", height: 5, borderRadius: 3, background: "var(--border)" }}>
            <div style={{
              width: `${Math.min(((target.enrolled + 1) / target.capacity) * 100, 100)}%`,
              height: "100%", borderRadius: 3,
              background: isFull ? "var(--red)" : "var(--teal)",
              transition: "width .3s ease",
            }} />
          </div>
          {isFull && (
            <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              {I.warning} This section is at full capacity
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, padding: "10px 14px", background: "var(--blue-pale)", borderRadius: 10, border: "1px solid rgba(42,123,222,.2)", marginBottom: 20 }}>
        <span style={{ color: "var(--blue)", display: "flex", flexShrink: 0, marginTop: 1 }}>{I.info}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>Auto-adjust records</div>
          <div style={{ fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Attendance and gradebook will be updated to the new section's schedule automatically.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handle} disabled={saving || available.length === 0}>
          {saving ? "Transferring…" : <>{I.check} Confirm Transfer</>}
        </button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADD STUDENT MODAL - FULLY RESPONSIVE
// ═══════════════════════════════════════════════════════════════════════════════
function AddStudentModal({ onClose, onApply, saving, grades, sections, getSectionsByGrade }: {
  onClose: () => void;
  saving: boolean;
  onApply: (payload: NewStudentPayload) => Promise<boolean>;
  grades: string[];
  sections: string[];
  getSectionsByGrade: (grade: string) => SectionCapacity[];
}) {
  const [form, setForm] = useState<NewStudentPayload>({
    student_name: "",
    first_name: "",
    last_name: "",
    student_email_id: "",
    date_of_birth: "",
    joining_date: "",
    nationality: "",
    city: "",
    country: "",
    state: "",
    blood_group: "",
    gender: "",
    student_mobile_number: "",
    alternate_phone_number: "",
    address_line1: "",
    address_line2: "",
    pincode: "",
    custom_student_id_number: "",
    custom_student_id_type: "",
    custom_batch: "",
    custom_serial_no: "",
    program: "",
    section: "",
  });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  const availableSections = form.program ? getSectionsByGrade(form.program) : [];

  const handleChange = (field: keyof NewStudentPayload, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "program") {
      setForm(prev => ({ ...prev, section: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!form.student_name.trim()) {
      toast.error("Student name is required");
      return;
    }

    if (form.program && !form.section) {
      toast.error("Please select a section for the selected program");
      return;
    }

    if (form.section && !form.program) {
      toast.error("Please select a program for the selected section");
      return;
    }

    if (form.program && form.section) {
      const section = availableSections.find(s => s.name === form.section);
      if (section && section.enrolled >= section.capacity) {
        toast.error(`Section "${form.section}" is at full capacity (${section.enrolled}/${section.capacity})`);
        return;
      }
    }

    const ok = await onApply(form);
    if (ok) onClose();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,33,55,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 300,
      backdropFilter: "blur(4px)",
      padding: isMobile ? "8px" : "16px",
      animation: "fadeIn 0.2s ease",
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (max-width: 640px) {
          .modal-scroll-content {
            max-height: calc(100vh - 160px) !important;
          }
        }
      `}</style>
      
      <div style={{
        background: "var(--white)",
        borderRadius: 16,
        width: "100%",
        maxWidth: isMobile ? "100%" : 720,
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        overflow: "hidden",
        maxHeight: isMobile ? "calc(100vh - 16px)" : "calc(100vh - 48px)",
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        position: "relative",
      }}>
        {/* Fixed Header - Sticky with better mobile support */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "14px 16px" : "18px 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--white)",
          flexShrink: 0,
          gap: "12px",
          position: "sticky",
          top: 0,
          zIndex: 20,
          minHeight: isMobile ? "56px" : "70px",
        }}>
          <div style={{
            minWidth: 0,
            flex: 1,
            overflow: "hidden",
          }}>
            <div style={{
              fontSize: isMobile ? 16 : 18,
              fontWeight: 700,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              Add New Student
            </div>
            <div style={{
              fontSize: isMobile ? 11 : 13,
              color: "var(--ink-soft)",
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              Fill in all student details
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-soft)",
              transition: "background 0.2s ease, color 0.2s ease, transform 0.2s ease",
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--red-pale)";
              e.currentTarget.style.color = "var(--red)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--ink-soft)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            aria-label="Close modal"
          >
            {I.x}
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{
          padding: isMobile ? "16px" : "24px",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          maxHeight: isMobile ? "calc(100vh - 160px)" : "calc(100vh - 130px)",
        }} className="modal-scroll-content">
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? "12px" : "16px",
          }}>
            {/* Student Name - Required - Full Width */}
            <div style={{ gridColumn: isMobile ? "1 / -1" : "1 / -1" }}>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Student Name <span style={{ color: "var(--red)" }}>*</span>
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="e.g., Muhammad Ali Khan"
                value={form.student_name}
                onChange={e => handleChange("student_name", e.target.value)}
                onFocus={e => {
                  e.currentTarget.style.borderColor = "var(--teal)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)";
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* First Name */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                First Name
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="First name"
                value={form.first_name || ""}
                onChange={e => handleChange("first_name", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Last Name */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Last Name
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Last name"
                value={form.last_name || ""}
                onChange={e => handleChange("last_name", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Gender */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Gender
              </label>
              <select
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  appearance: "auto",
                }}
                value={form.gender || ""}
                onChange={e => handleChange("gender", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {GENDER_OPTIONS.map(g => (
                  <option key={g} value={g}>{g || "— Select —"}</option>
                ))}
              </select>
            </div>

            {/* Date of Birth */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Date of Birth
              </label>
              <input
                type="date"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={form.date_of_birth || ""}
                onChange={e => handleChange("date_of_birth", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="student@example.com"
                value={form.student_email_id || ""}
                onChange={e => handleChange("student_email_id", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Mobile Number
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="03XX-XXXXXXX"
                value={form.student_mobile_number || ""}
                onChange={e => handleChange("student_mobile_number", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Alternate Phone */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Alternate Phone
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Alternate phone"
                value={form.alternate_phone_number || ""}
                onChange={e => handleChange("alternate_phone_number", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Joining Date */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Joining Date
              </label>
              <input
                type="date"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={form.joining_date || ""}
                onChange={e => handleChange("joining_date", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Blood Group */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Blood Group
              </label>
              <select
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  appearance: "auto",
                }}
                value={form.blood_group || ""}
                onChange={e => handleChange("blood_group", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {BLOOD_GROUPS.map(bg => (
                  <option key={bg} value={bg}>{bg || "— Select —"}</option>
                ))}
              </select>
            </div>

            {/* Nationality */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Nationality
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Nationality"
                value={form.nationality || ""}
                onChange={e => handleChange("nationality", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Country */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Country
              </label>
              <select
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  appearance: "auto",
                }}
                value={form.country || ""}
                onChange={e => handleChange("country", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c || "— Select —"}</option>
                ))}
              </select>
            </div>

            {/* Address Line 1 - Full Width */}
            <div style={{ gridColumn: isMobile ? "1 / -1" : "1 / -1" }}>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Address Line 1
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Street address"
                value={form.address_line1 || ""}
                onChange={e => handleChange("address_line1", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Address Line 2 - Full Width */}
            <div style={{ gridColumn: isMobile ? "1 / -1" : "1 / -1" }}>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Address Line 2
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Apartment, suite, etc."
                value={form.address_line2 || ""}
                onChange={e => handleChange("address_line2", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* City */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                City
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="City"
                value={form.city || ""}
                onChange={e => handleChange("city", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* State */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                State / Province
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="State"
                value={form.state || ""}
                onChange={e => handleChange("state", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Pincode */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Pincode
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Postal code"
                value={form.pincode || ""}
                onChange={e => handleChange("pincode", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* ID Type */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                ID Type
              </label>
              <select
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  appearance: "auto",
                }}
                value={form.custom_student_id_type || ""}
                onChange={e => handleChange("custom_student_id_type", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                {ID_TYPES.map(t => (
                  <option key={t} value={t}>{t || "— Select —"}</option>
                ))}
              </select>
            </div>

            {/* ID Number */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                ID Number
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="CNIC / B-Form / Passport"
                value={form.custom_student_id_number || ""}
                onChange={e => handleChange("custom_student_id_number", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Batch */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Batch
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="e.g., Jan-24"
                value={form.custom_batch || ""}
                onChange={e => handleChange("custom_batch", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Serial No */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Serial No
              </label>
              <input
                type="text"
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  transition: "border-color 0.2s ease",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                placeholder="Serial number"
                value={form.custom_serial_no || ""}
                onChange={e => handleChange("custom_serial_no", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
            </div>

            {/* Divider */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", margin: "4px 0" }} />

            {/* Program - Optional */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Program (Optional)
              </label>
              <select
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  appearance: "auto",
                }}
                value={form.program || ""}
                onChange={e => handleChange("program", e.target.value)}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                <option value="">— Select Program —</option>
                {grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Section - Optional */}
            <div>
              <label style={{
                fontSize: isMobile ? 11 : 12,
                fontWeight: 700,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                display: "block",
                marginBottom: 6,
              }}>
                Section (Optional)
              </label>
              <select
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border)",
                  fontSize: isMobile ? 14 : 14,
                  background: "var(--white)",
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: form.program ? "pointer" : "not-allowed",
                  opacity: form.program ? 1 : 0.6,
                  appearance: "auto",
                }}
                value={form.section || ""}
                onChange={e => handleChange("section", e.target.value)}
                disabled={!form.program}
                onFocus={e => e.currentTarget.style.borderColor = "var(--teal)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              >
                <option value="">— Select Section —</option>
                {availableSections.map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.enrolled}/{s.capacity})
                  </option>
                ))}
              </select>
              {form.program && availableSections.length === 0 && (
                <div style={{
                  fontSize: isMobile ? 11 : 12,
                  color: "var(--amber)",
                  marginTop: 6,
                }}>
                  No sections available for this program
                </div>
              )}
            </div>

            {/* Info Box */}
            <div style={{
              gridColumn: "1 / -1",
              padding: isMobile ? "10px 14px" : "12px 16px",
              background: "var(--blue-pale)",
              borderRadius: 10,
              border: "1px solid rgba(42,123,222,.2)",
              marginTop: 4,
            }}>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{
                  color: "var(--blue)",
                  display: "flex",
                  flexShrink: 0,
                  marginTop: 1,
                }}>{I.info}</span>
                <div style={{
                  fontSize: isMobile ? 12 : 13,
                  color: "var(--ink-soft)",
                  lineHeight: 1.5,
                }}>
                  <strong>Student will be created with status "Active".</strong>
                  {form.program && form.section ? (
                    <span> Program Enrollment and section assignment will be handled automatically.</span>
                  ) : (
                    <span> You can assign a program and section later via "Transfer Section".</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: "flex",
            gap: isMobile ? 10 : 12,
            marginTop: isMobile ? 16 : 20,
            paddingTop: isMobile ? 14 : 16,
            borderTop: "1px solid var(--border)",
            flexWrap: "wrap",
          }}>
            <button
              style={{
                flex: 1,
                minWidth: isMobile ? "80px" : "100px",
                padding: isMobile ? "10px 16px" : "12px 20px",
                fontSize: isMobile ? 14 : 14,
                borderRadius: 8,
                cursor: "pointer",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--ink)",
                fontWeight: 600,
                transition: "all 0.2s ease",
              }}
              onClick={onClose}
              disabled={saving}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              Cancel
            </button>
            <button
              style={{
                flex: 1,
                minWidth: isMobile ? "80px" : "100px",
                padding: isMobile ? "10px 16px" : "12px 20px",
                fontSize: isMobile ? 14 : 14,
                borderRadius: 8,
                cursor: "pointer",
                border: "none",
                background: "var(--teal)",
                color: "#fff",
                fontWeight: 600,
                transition: "all 0.2s ease",
                boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
              }}
              onClick={handleSubmit}
              disabled={saving}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(22,163,74,0.35)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(22,163,74,0.3)";
              }}
            >
              {saving ? "Adding Student…" : <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{I.plus} Add Student</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickTransferCard({ students, getSectionsByGrade, onApply, saving }: {
  students: EnrichedStudent[];
  getSectionsByGrade: (grade: string) => SectionCapacity[];
  saving: boolean;
  onApply: (id: string, name: string, from: string, to: string) => Promise<boolean>;
}) {
  const [studentId, setStudentId] = useState(students[0]?.name || "");
  const student = students.find(s => s.name === studentId) ?? students[0];

  const available = student ? getSectionsByGrade(student.grade).filter(s => s.name !== student.section) : [];
  const [toSection, setToSection] = useState(available[0]?.name || "");

  useMemo(() => {
    const avail = student ? getSectionsByGrade(student.grade).filter(s => s.name !== student.section) : [];
    if (!avail.find(a => a.name === toSection)) setToSection(avail[0]?.name || "");
  }, [student, getSectionsByGrade, toSection]);

  const handle = async () => {
    if (!toSection || !student) { toast.error("Select a section"); return; }
    await onApply(student.name, student.student_name, student.section, toSection);
  };

  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", position: "relative", boxShadow: "0 2px 12px -8px rgba(0,0,0,0.08)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #2563EB, #3b82f6)" }} />
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#2563EB", display: "flex" }}>{I.transfer}</span>
        Section Transfer
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>Student</label>
          <SearchableStudentSelect
            students={students}
            value={studentId}
            onChange={setStudentId}
            placeholder="Search by name or ID…"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>From</label>
            <div style={{ padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "var(--surface)", color: "var(--ink-soft)" }}>
              {student?.section || "—"}
            </div>
          </div>
          <span style={{ color: "var(--teal)", paddingBottom: 4 }}>{I.arrow}</span>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>To</label>
            <select className="filter-select" style={{ width: "100%" }} value={toSection} onChange={e => setToSection(e.target.value)}>
              {available.length === 0
                ? <option value="">No other sections</option>
                : available.map(s => <option key={s.name} value={s.name}>{s.name} ({s.enrolled}/{s.capacity})</option>)
              }
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ color: "var(--blue)", flexShrink: 0, marginTop: 1 }}>{I.info}</span>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Attendance and gradebook will be updated to the new section's schedule.</div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handle} disabled={saving || available.length === 0}>
          {saving ? "Transferring…" : <>{I.check} Confirm Transfer</>}
        </button>
      </div>
    </div>
  );
}

function QuickStatusCard({ students, onApply, saving }: {
  students: EnrichedStudent[];
  saving: boolean;
  onApply: (id: string, status: StudentStatus, reason: string) => Promise<boolean>;
}) {
  const [studentId, setStudentId] = useState(students[0]?.name || "");
  const [newStatus, setNewStatus] = useState<StudentStatus>("Active");
  const [reason, setReason] = useState("");

  const handle = async () => {
    if (!reason || reason === "— Select reason —") { toast.error("Select a reason"); return; }
    const ok = await onApply(studentId, newStatus, reason);
    if (ok) setReason("");
  };

  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", position: "relative", boxShadow: "0 2px 12px -8px rgba(0,0,0,0.08)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #D97706, #F59E0B)" }} />
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#D97706", display: "flex" }}>{I.status}</span>
        Change Student Status
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>Student</label>
          <SearchableStudentSelect
            students={students}
            value={studentId}
            onChange={setStudentId}
            placeholder="Search by name or ID…"
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>New Status</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUS_OPTIONS.map(opt => {
              const cfg = statusCfg(opt.value);
              const sel = newStatus === opt.value;
              return (
                <div key={opt.value} onClick={() => setNewStatus(opt.value)} style={{
                  padding: "5px 12px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 500,
                  border: `1px solid ${sel ? cfg.dot : "var(--border)"}`,
                  background: sel ? cfg.bg : "var(--white)",
                  color: sel ? cfg.text : "var(--ink-soft)",
                  transition: "all .15s ease",
                }}>
                  {sel ? "● " : "○ "}{opt.value}
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 6 }}>Reason</label>
          <select className="filter-select" style={{ width: "100%" }} value={reason} onChange={e => setReason(e.target.value)}>
            {CHANGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handle} disabled={saving}>
          {saving ? "Saving…" : <>{I.check} Apply Status Change</>}
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ height: 52, borderRadius: 8, background: "var(--surface)", opacity: 0.7 }} />
      ))}
    </div>
  );
}

export default function AcadStudentsPage() {
  const {
    students, allStudents, filteredCount, stats, tabCounts,
    grades, sections, getSectionsByGrade,
    loading, loadingStats, savingStatus, savingTransfer, savingNewStudent, error, refetch,
    search, setSearch, gradeFilter, setGradeFilter,
    sectionFilter, setSectionFilter, statusFilter, setStatusFilter,
    activeTab, setActiveTab, resetFilters,
    currentPage, totalPages, goToPage, pageSize,
    selectedStudent, studentDetail, detailLoading,
    guardianDetails, guardianLoading,
    openStudentDetail, closeStudentDetail,
    changeStudentStatus, transferStudentSection, addNewStudent, exportCSV,
    lastSynced, liveCount,
  } = useAcadStudents();


  const [statusTarget, setStatusTarget] = useState<EnrichedStudent | null>(null);
  const [transferTarget, setTransferTarget] = useState<EnrichedStudent | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const [sortCol, setSortCol] = useState<"name" | "grade" | "section" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const si = (col: typeof sortCol) => sortCol !== col ? " ↕" : sortDir === "asc" ? " ↑" : " ↓";

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortCol === "name") return a.student_name.localeCompare(b.student_name) * dir;
      if (sortCol === "grade") return a.grade.localeCompare(b.grade) * dir;
      if (sortCol === "section") return a.section.localeCompare(b.section) * dir;
      if (sortCol === "status") return a.status.localeCompare(b.status) * dir;
      return 0;
    });
  }, [students, sortCol, sortDir]);

  const TABS: { id: TabId; label: string; color?: string }[] = [
    { id: "all", label: "All Students" },
    { id: "at-risk", label: "At-Risk", color: "var(--red)" },
    { id: "inactive", label: "Inactive / Suspended", color: "var(--amber)" },
    { id: "on-leave", label: "On Leave", color: "var(--blue)" },
  ];

  useEffect(() => {
    if (!gradeFilter) return;
    const availableSections = getSectionsByGrade(gradeFilter).map(s => s.name);
    if (sectionFilter && !availableSections.includes(sectionFilter)) {
      setSectionFilter("");
    }
  }, [gradeFilter, getSectionsByGrade, sectionFilter, setSectionFilter]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ color: "#64748b", fontSize: 14 }}>Loading students from ERP…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0}100%{background-position:-200% 0} }
      @media (max-width: 768px) {
        .add-student-grid { grid-template-columns: 1fr !important; }
        .add-student-grid > div { grid-column: 1 / -1 !important; }
        .modal-content { padding: 16px !important; }
      }
      `}</style>
      <div style={{ padding: "0 24px 24px" }}>
        <div style={{
          background: "linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)",
          borderRadius: "0 0 22px 22px",
          padding: "26px 28px",
          marginBottom: 22,
          marginLeft: -24,
          marginRight: -24,
          boxShadow: "0 14px 32px -14px rgba(22,163,74,0.45)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, right: -30, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -70, right: 140, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.10), transparent 55%)", pointerEvents: "none" }} />
          <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)", flexShrink: 0 }}>
                <span style={{ color: "#fff", display: "flex" }}>{I.students}</span>
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 3, letterSpacing: "-0.3px" }}>Students Management</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.88)" }}>All student records synced live from ERPNext</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setShowAddStudent(true)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 16px", background: "#fff", color: "#15803d",
                border: "none", borderRadius: 10, cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                boxShadow: "0 6px 16px -4px rgba(0,0,0,0.25)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 20px -4px rgba(0,0,0,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 16px -4px rgba(0,0,0,0.25)"; }}
              >
                {I.plus} Add Student
              </button>
              <button onClick={refetch} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500, backdropFilter: "blur(6px)", transition: "background 0.2s ease" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.24)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
              >{I.refresh} Refresh</button>
              <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#fff", color: "#15803d", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, boxShadow: "0 6px 16px -4px rgba(0,0,0,0.25)", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 20px -4px rgba(0,0,0,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 16px -4px rgba(0,0,0,0.25)"; }}
              >{I.download} Export CSV</button>
            </div>
          </div>
        </div>

        <KpiStrip stats={stats} loadingStats={loadingStats} lastSynced={lastSynced} liveCount={liveCount} />

        {loadingStats && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", marginBottom: 12, background: "var(--blue-pale)", borderRadius: 8, border: "1px solid rgba(42,123,222,.2)", fontSize: 12, color: "var(--blue)" }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
            Loading attendance & scores in background…
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "none", marginBottom: 16, flexWrap: "wrap", background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: 6, boxShadow: "0 2px 10px -6px rgba(0,0,0,0.06)" }}>
          {TABS.map(tab => {
            const color = tab.color || "var(--teal)";
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "9px 16px", fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? "#fff" : "var(--ink-soft)",
                background: active ? color.replace("var(--teal)", "#16a34a").replace("var(--red)", "#dc2626").replace("var(--amber)", "#d97706").replace("var(--blue)", "#2563EB") : "transparent",
                border: "none", borderRadius: 10, cursor: "pointer",
                marginBottom: 0, fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
                transition: "all .18s ease",
                boxShadow: active ? "0 6px 14px -6px rgba(0,0,0,0.35)" : "none",
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {tab.label}
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: active ? "rgba(255,255,255,0.25)" : "var(--surface)", color: active ? "#fff" : "var(--ink-soft)", border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid var(--border)" }}>{tabCounts[tab.id]}</span>
              </button>
            );
          })}
        </div>

        <div className="filter-bar" style={{ marginBottom: 16, flexWrap: "wrap", background: "#fff", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 2px 10px -6px rgba(0,0,0,0.06)" }}>
          <div className="filter-group" style={{ flex: 1, minWidth: 180 }}>
            <label className="filter-label">Search</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", display: "flex", pointerEvents: "none" }}>{I.search}</span>
              <input className="filter-select" placeholder="Name or ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: "100%", transition: "border-color 0.2s ease, box-shadow 0.2s ease" }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(22,163,74,0.12)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>
          <div className="filter-group">
            <label className="filter-label">Program / Grade</label>
            <select className="filter-select" value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); }}>
              <option value="">All Programs</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Section</label>
            <select
              className="filter-select"
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
            >
              <option value="">All Sections</option>
              {gradeFilter
                ? getSectionsByGrade(gradeFilter).map(s => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.enrolled}/{s.capacity})
                  </option>
                ))
                : sections.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              }
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StudentStatus)}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 16 }}>
            {(search || gradeFilter || sectionFilter || statusFilter) && (
              <button className="btn btn-ghost btn-sm" onClick={resetFilters}>{I.x} Reset</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={refetch} disabled={loading}>{I.refresh} Refresh</button>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>{I.download} Export</button>
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--red-pale)", border: "1px solid var(--red)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "var(--red)", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠ {error}</span>
            <button onClick={refetch} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>Retry</button>
          </div>
        )}

        <div className="card" style={{ marginBottom: 24, boxShadow: "0 2px 12px -8px rgba(0,0,0,0.08)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #16a34a, #0d9488)" }} />
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--teal)", display: "flex" }}>{I.user}</span>
              <div className="card-title">Student List
                <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ink-soft)", marginLeft: 8 }}>
                  {filteredCount} of {allStudents.length}
                </span>
              </div>
            </div>
            {loadingStats && <span style={{ fontSize: 11, color: "var(--blue)", fontStyle: "italic" }}>⟳ Loading attendance & scores…</span>}
          </div>

          {loading ? <div style={{ padding: 20 }}><LoadingSkeleton /></div> : (
            <div style={{ overflowX: "auto" }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort("name")}>Student {si("name")}</th>
                    <th style={{ fontFamily: "monospace" }}>ID</th>
                    <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort("grade")}>Program {si("grade")}</th>
                    <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort("section")}>Section {si("section")}</th>
                    <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort("status")}>Status {si("status")}</th>
                    <th>Attendance {loadingStats && <span style={{ fontSize: 9, color: "var(--blue)", marginLeft: 4 }}>⟳</span>}</th>
                    <th>Avg Score {loadingStats && <span style={{ fontSize: 9, color: "var(--blue)", marginLeft: 4 }}>⟳</span>}</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-soft)" }}>No students match your filters</td></tr>
                  ) : sortedStudents.map(s => {
                    const cfg = statusCfg(s.status);
                    const hovered = hoveredRow === s.name;
                    const att = s.attendancePct ?? 0;
                    const score = s.avgScore ?? 0;
                    return (
                      <tr key={s.name}
                        onMouseEnter={() => setHoveredRow(s.name)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          borderLeft: `3px solid ${hovered ? cfg.dot : "transparent"}`,
                          background: hovered ? "var(--surface)" : "var(--white)",
                          transition: "all .15s ease",
                        }}
                      >
                        <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={s.student_name} status={s.status} size={32} /><span style={{ fontWeight: 600, fontSize: 13 }}>{s.student_name}</span></div></td>
                        <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--ink-soft)" }}>{s.name}</td>
                        <td style={{ fontSize: 13, color: "var(--ink-mid)" }}>{s.grade || "—"}</td>
                        <td>{s.section ? <span style={{ background: "var(--blue-pale)", color: "var(--blue)", border: "1px solid rgba(42,123,222,.25)", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{s.section}</span> : "—"}</td>
                        <td><StatusPill status={s.status} /></td>
                        <td>{loadingStats && s.attendancePct === undefined ? <CellSkeleton /> : s.attendancePct !== undefined ? <AttBar pct={att} /> : <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>—</span>}</td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>
                          {loadingStats && s.avgScore === undefined ? <CellSkeleton /> : s.avgScore !== undefined ? <span style={{ color: score >= 60 ? "var(--teal)" : "var(--red)" }}>{score > 0 ? `${score}%` : "0%"}</span> : <span style={{ color: "var(--ink-soft)" }}>—</span>}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openStudentDetail(s)} title="View Profile">{I.user} Profile</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setStatusTarget(s)} title="Change Status">{I.status}</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setTransferTarget(s)} title="Transfer Section">{I.transfer}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredCount > 0 && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <Pagination currentPage={currentPage} totalPages={totalPages} goToPage={goToPage} totalCount={filteredCount} pageSize={pageSize} />
            </div>
          )}
        </div>

        {allStudents.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 24 }}>
            <QuickStatusCard students={allStudents} onApply={changeStudentStatus} saving={savingStatus} />
            <QuickTransferCard students={allStudents.filter(s => s.section)} getSectionsByGrade={getSectionsByGrade} onApply={transferStudentSection} saving={savingTransfer} />
          </div>
        )}
        
        {selectedStudent && (
          <ProfileModal
          student={selectedStudent}
          detail={studentDetail}
          detailLoading={detailLoading}
          loadingStats={loadingStats}
          guardians={guardianDetails}
          guardianLoading={guardianLoading}
          onClose={closeStudentDetail}
          onStatusClick={() => setStatusTarget(selectedStudent)}
          onTransferClick={() => setTransferTarget(selectedStudent)}
          />
          )}

        {statusTarget && (
          <StatusModal student={statusTarget} onClose={() => setStatusTarget(null)} onApply={changeStudentStatus} saving={savingStatus} />
        )}

        {transferTarget && (
          <TransferModal
            student={transferTarget}
            sections={getSectionsByGrade(transferTarget.grade)}
            onClose={() => setTransferTarget(null)}
            onApply={transferStudentSection}
            saving={savingTransfer}
            allStudents={allStudents}
          />
        )}

        {showAddStudent && (
          <AddStudentModal
            onClose={() => setShowAddStudent(false)}
            onApply={addNewStudent}
            saving={savingNewStudent}
            grades={grades}
            sections={sections}
            getSectionsByGrade={getSectionsByGrade}
          />
        )}
      </div>
    </>
  );
}