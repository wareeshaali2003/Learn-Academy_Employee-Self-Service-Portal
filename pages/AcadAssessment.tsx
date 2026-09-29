// pages/AcadAssessment.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAcadAssessment } from '../hooks/UseAcadAssessment';
import type { AssessmentResult, AssessmentPlan, StudentResultRow } from '../hooks/UseAcadAssessment';
import { api } from '../services/api';

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

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════
const Icon = {
  refresh:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  edit:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  save:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  x:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  trash:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  check:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  eye:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  submit:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  up:       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  down:     <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chart:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  chevron:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  clip:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"/><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>,
  target:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const initials = (name: string) =>
  (name || '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const scoreColor = (pct: number | null) =>
  pct === null ? T.inkFaint : pct >= 80 ? T.teal : pct < 60 ? T.red : T.amber;
const scoreBg = (pct: number | null) =>
  pct === null ? T.surface : pct >= 80 ? T.tealBg : pct < 60 ? T.redBg : T.amberBg;

function ScoreBar({ score, max }: { score: number | null; max: number }) {
  if (score === null) return <span style={{ color: T.inkFaint, fontSize: 13 }}>—</span>;
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
  const color = scoreColor(pct);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontWeight: 700, fontSize: 13, color }}>{score}/{max}</span>
      <div style={{ width: 56, height: 5, borderRadius: 3, background: T.border, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}bb, ${color})`, transition: 'width .3s ease' }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUCCESS POPUP — celebratory confirmation for save / submit / cancel / delete
// ═══════════════════════════════════════════════════════════════════════════════
function SuccessPopup({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '30px 38px', textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', animation: 'asmPopIn .3s cubic-bezier(.34,1.56,.64,1)',
        minWidth: 260, maxWidth: 340,
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg, ${T.primarySoft}, #bbf7d0)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          animation: 'asmCheckPop .4s cubic-bezier(.34,1.56,.64,1) .1s both',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: subtitle ? 5 : 0 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: T.inkSoft }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function GradeDistChart({ gradeCount }: { gradeCount: Record<string, number> }) {
  const grades = ['A+', 'A', 'B', 'C', 'D', 'F'];
  const colorMap: Record<string, string> = {
    'A+': '#15803d', 'A': '#16a34a', 'B': '#4DBF9F',
    'C': '#FDECD1', 'D': '#FAD2B0', 'F': '#F8C8C8',
  };
  const max = Math.max(...grades.map(g => gradeCount[g] ?? 0), 1);
  const H = 90, BW = 34, GAP = 14;
  const totalW = grades.length * (BW + GAP) + 20;
  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${H + 32}`} preserveAspectRatio="xMidYMid meet">
      {grades.map((g, i) => {
        const count = gradeCount[g] ?? 0;
        const bh = (count / max) * H;
        const x  = 10 + i * (BW + GAP);
        const y  = H - bh + 4;
        return (
          <g key={g}>
            <rect x={x} y={H + 4} width={BW} height={2} fill={T.border} />
            <rect x={x} y={y} width={BW} height={Math.max(bh, count > 0 ? 3 : 0)} fill={colorMap[g]} rx={6} />
            {count > 0 && (
              <text x={x + BW / 2} y={y - 6} fill={T.inkSoft} fontSize="11" textAnchor="middle" fontWeight="700">{count}</text>
            )}
            <text x={x + BW / 2} y={H + 20} fill={T.inkSoft} fontSize="12" textAnchor="middle" fontWeight="700">{g}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPINNER
// ═══════════════════════════════════════════════════════════════════════════════
function Spinner({ small }: { small?: boolean }) {
  const sz = small ? 18 : 40;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: small ? 0 : 240 }}>
      <div style={{
        width: sz, height: sz,
        border: `${small ? 2 : 3}px solid ${T.border}`,
        borderTopColor: T.primary, borderRadius: '50%',
        animation: 'asmSpin 0.75s linear infinite', flexShrink: 0,
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLED SELECT (matches Attendance page's FSelect for a consistent feel)
// ═══════════════════════════════════════════════════════════════════════════════
function FSelect({
  label, value, onChange, children, disabled, minW = 170,
}: {
  label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; disabled?: boolean; minW?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: Math.min(minW, 170), flex: '1 1 150px' }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: T.inkSoft }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{
            appearance: 'none', width: '100%',
            padding: '9px 34px 9px 14px',
            border: `1.5px solid ${T.border}`, borderRadius: 10,
            fontSize: 13.5, fontWeight: 500, color: T.ink,
            background: disabled ? T.surface : T.white,
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none', fontFamily: 'inherit',
            transition: 'border-color .15s',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = T.primary)}
          onBlur={e  => (e.currentTarget.style.borderColor = T.border)}
        >
          {children}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.inkFaint, display: 'flex' }}>
          {Icon.chevron}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI CARD STRIP
// ═══════════════════════════════════════════════════════════════════════════════
function KpiStrip({ avg, passRate, atRisk, pending, total }: {
  avg: number; passRate: number; atRisk: number; pending: number; total: number;
}) {
  const cards = [
    { label: 'Section Avg',     value: `${avg}%`,     color: avg >= 65 ? T.teal : T.amber,          bg: avg >= 65 ? T.tealBg : T.amberBg,  sub: 'target ≥ 65%' },
    { label: 'Pass Rate',       value: `${passRate}%`, color: passRate >= 80 ? T.teal : T.amber,     bg: passRate >= 80 ? T.tealBg : T.amberBg, sub: 'target ≥ 80%' },
    { label: 'At Risk',         value: atRisk,        color: T.red,   bg: T.redBg,   sub: 'below 60%' },
    { label: 'Pending / Draft', value: pending,       color: T.amber, bg: T.amberBg, sub: `of ${total} total` },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
      {cards.map(c => (
        <div
          key={c.label}
          className="asm-kpi"
          style={{ background: c.bg, borderRadius: 14, padding: '16px 18px', border: `1px solid ${c.color}26` }}
        >
          <div style={{ fontSize: 10, color: c.color, textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 700, marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 27, fontWeight: 700, color: c.color, letterSpacing: '-1px', lineHeight: 1 }}>{c.value}</div>
          <div style={{ fontSize: 11, color: c.color, opacity: 0.75, marginTop: 6 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRITERIA DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function CriteriaModal({ result, onClose }: { result: AssessmentResult; onClose: () => void }) {
  const pct = result.maximum_score > 0
    ? Math.round((result.total_score / result.maximum_score) * 100) : 0;
  return (
    <div className="asm-modal-overlay" style={{ zIndex: 300 }} onClick={onClose}>
      <div className="asm-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="asm-modal-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.student_name}</div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{result.name} · {result.assessment_plan}</div>
          </div>
          <button onClick={onClose} className="asm-icon-btn">{Icon.x}</button>
        </div>
        <div style={{ padding: '18px 20px', overflowX: 'auto' }}>
          <table className="asm-tbl" style={{ minWidth: 380 }}>
            <thead>
              <tr>
                {['Criteria', 'Score', 'Max', 'Grade'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Criteria' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.details.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{d.assessment_criteria}</td>
                  <td style={{ textAlign: 'center' }}><ScoreBar score={d.score} max={d.maximum_score} /></td>
                  <td style={{ textAlign: 'center', color: T.inkSoft }}>{d.maximum_score}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: d.grade === 'F' ? T.red : d.grade?.startsWith('A') ? T.teal : T.ink }}>{d.grade || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${T.border}`, background: T.surface }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: scoreColor(pct) }}>{result.total_score}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{result.maximum_score}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, color: result.grade === 'F' ? T.red : T.teal }}>{result.grade}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="asm-modal-foot" style={{ justifyContent: 'flex-end' }}>
          <button className="asm-btn asm-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADE ENTRY MODAL
// ═══════════════════════════════════════════════════════════════════════════════
interface GradeEntryModalProps {
  plan: AssessmentPlan;
  groupStudents: Array<{ student: string; student_name: string }>;
  existingResults: AssessmentResult[];
  onClose: () => void;
  onSaved: () => void;
  bulkSaveGrades: ReturnType<typeof useAcadAssessment>['bulkSaveGrades'];
  calcGrade: ReturnType<typeof useAcadAssessment>['calcGrade'];
  saving: boolean;
}

function GradeEntryModal({
  plan, groupStudents, existingResults, onClose, onSaved, bulkSaveGrades, calcGrade, saving,
}: GradeEntryModalProps) {
  const criteria = useMemo(() => {
    if (plan.assessment_criteria?.length) {
      return plan.assessment_criteria.map(c => ({ name: c.assessment_criteria, max: c.maximum_score }));
    }
    if (existingResults.length && existingResults[0].details.length) {
      return existingResults[0].details.map(d => ({ name: d.assessment_criteria, max: d.maximum_score }));
    }
    return [
      { name: 'Class attendence',   max: 10 },
      { name: 'Class participation', max: 10 },
      { name: 'project',            max: 20 },
      { name: 'written',            max: 60 },
    ];
  }, [plan, existingResults]);

  const maxTotal = criteria.reduce((a, c) => a + c.max, 0);

  const [scoreMap, setScoreMap] = useState<Record<string, Record<string, string>>>(() => {
    const init: Record<string, Record<string, string>> = {};
    for (const s of groupStudents) {
      init[s.student] = {};
      const existing = existingResults.find(r => r.student === s.student);
      for (const c of criteria) {
        const detail = existing?.details.find(d => d.assessment_criteria === c.name);
        init[s.student][c.name] = detail ? String(detail.score) : '';
      }
    }
    return init;
  });

  const getTotal = (studentId: string) =>
    criteria.reduce((acc, c) => acc + (parseFloat(scoreMap[studentId]?.[c.name] ?? '0') || 0), 0);

  const handleSave = async () => {
    const entries = groupStudents.map(s => {
      const details = criteria.map(c => {
        const score = parseFloat(scoreMap[s.student]?.[c.name] ?? '0') || 0;
        const pct = c.max > 0 ? (score / c.max) * 100 : 0;
        return { assessment_criteria: c.name, maximum_score: c.max, score, grade: calcGrade(pct) };
      });
      const total = details.reduce((a, d) => a + d.score, 0);
      const grade = calcGrade(maxTotal > 0 ? (total / maxTotal) * 100 : 0);
      return {
        assessment_plan:  plan.name,
        student:          s.student,
        student_name:     s.student_name,
        student_group:    plan.student_group,
        program:          plan.program,
        course:           plan.course,
        academic_year:    plan.academic_year,
        academic_term:    plan.academic_term,
        assessment_group: plan.assessment_group,
        grading_scale:    plan.grading_scale,
        maximum_score:    maxTotal,
        total_score:      total,
        grade,
        details,
      };
    });

    const { saved } = await bulkSaveGrades(entries);
    if (saved > 0) { onSaved(); onClose(); }
  };

  return (
    <div className="asm-modal-overlay" style={{ zIndex: 200 }} onClick={onClose}>
      <div className="asm-modal" style={{ maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="asm-modal-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Enter / Update Grades</div>
            <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {plan.course} · {plan.student_group} · {plan.academic_term || plan.academic_year}
            </div>
          </div>
          <button onClick={onClose} className="asm-icon-btn">{Icon.x}</button>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="asm-tbl asm-tbl-sticky" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Student</th>
                {criteria.map(c => (
                  <th key={c.name} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {c.name}<br /><span style={{ fontWeight: 400, fontSize: 10, color: T.inkFaint }}>/{c.max}</span>
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {groupStudents.map(s => {
                const total = getTotal(s.student);
                const pct   = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                const grade = total > 0 ? calcGrade(pct) : '—';
                return (
                  <tr key={s.student}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div className="asm-avatar" style={{ background: T.primarySoft, color: T.primary }}>{initials(s.student_name)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{s.student_name}</div>
                          <div style={{ fontSize: 10.5, color: T.inkSoft }}>{s.student}</div>
                        </div>
                      </div>
                    </td>
                    {criteria.map(c => (
                      <td key={c.name} style={{ textAlign: 'center' }}>
                        <input
                          type="number" min={0} max={c.max} placeholder="—"
                          value={scoreMap[s.student]?.[c.name] ?? ''}
                          onChange={e => setScoreMap(prev => ({ ...prev, [s.student]: { ...prev[s.student], [c.name]: e.target.value } }))}
                          className="asm-num-input"
                          style={{ color: scoreMap[s.student]?.[c.name] ? scoreColor(c.max > 0 ? (parseFloat(scoreMap[s.student][c.name] || '0') / c.max) * 100 : 0) : T.inkFaint }}
                        />
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: T.primary, fontSize: 14 }}>{total > 0 ? total : '—'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: grade === 'F' ? T.red : grade === '—' ? T.inkFaint : T.teal, fontSize: 14 }}>{grade}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {groupStudents.length === 0 && (
            <div style={{ textAlign: 'center', padding: 36, color: T.inkSoft }}>No students in this section.</div>
          )}
        </div>

        <div className="asm-modal-foot">
          <button className="asm-btn asm-btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
          <button className="asm-btn asm-btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : <>{Icon.save} Save &amp; Submit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function DeleteModal({ docName, studentName, onClose, onDeleted, deleteResult, saving }: {
  docName: string; studentName: string; onClose: () => void; onDeleted: () => void;
  deleteResult: ReturnType<typeof useAcadAssessment>['deleteResult']; saving: boolean;
}) {
  const handle = async () => {
    const ok = await deleteResult(docName, studentName);
    if (ok) { onDeleted(); onClose(); }
  };
  return (
    <div className="asm-modal-overlay" style={{ zIndex: 400 }} onClick={onClose}>
      <div className="asm-modal" style={{ maxWidth: 380, padding: 26 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Result?</div>
        <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 22, lineHeight: 1.5 }}>
          This will permanently delete <b>{studentName}</b>'s result ({docName}). This cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="asm-btn asm-btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button onClick={handle} disabled={saving} className="asm-btn" style={{ flex: 1, background: T.red, color: '#fff' }}>
            {saving ? 'Deleting…' : <>{Icon.trash} Delete</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AcadAssessment() {
  const {
    results, plans, loading, plansLoading, saving, error,
    fetchResults, fetchPlans, fetchPlanDetail,
    bulkSaveGrades, submitResult, cancelResult, deleteResult,
    buildStudentRows, calcGrade, getLocalStats,
  } = useAcadAssessment();

  const [selectedPlan,   setSelectedPlan]   = useState<AssessmentPlan | null>(null);
  const [academicYear,   setAcademicYear]   = useState('');
  const [academicTerm,   setAcademicTerm]   = useState('');
  const [years,          setYears]          = useState<string[]>([]);
  const [terms,          setTerms]          = useState<string[]>([]);
  const [planDetail,     setPlanDetail]     = useState<AssessmentPlan | null>(null);
  const [groupStudents,  setGroupStudents]  = useState<Array<{ student: string; student_name: string }>>([]);
  const [groupLoading,   setGroupLoading]   = useState(false);

  const [activeTab,    setActiveTab]    = useState<'overview' | 'scores' | 'criteria'>('overview');
  const [showEntry,    setShowEntry]    = useState(false);
  const [detailResult, setDetailResult] = useState<AssessmentResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ docName: string; studentName: string } | null>(null);
  const [sortCol,      setSortCol]      = useState<'name' | 'score'>('score');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [successPopup, setSuccessPopup] = useState<{ title: string; subtitle?: string } | null>(null);
  const showSuccess = useCallback((title: string, subtitle?: string) => setSuccessPopup({ title, subtitle }), []);

  useEffect(() => {
    api.getAcadYears().then(r => r.ok && setYears(r.data));
    api.getAcadTerms().then(r => r.ok && setTerms(r.data));
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (!selectedPlan) { setGroupStudents([]); return; }
    setGroupLoading(true);
    api.getAcadSectionStudents(selectedPlan.student_group)
      .then(r => {
        if (r.ok) {
          setGroupStudents(r.data.map((s: any) => ({ student: s.student, student_name: s.student_name })));
        }
      })
      .finally(() => setGroupLoading(false));
  }, [selectedPlan]);

  useEffect(() => {
    if (!selectedPlan) { setPlanDetail(null); return; }
    fetchPlanDetail(selectedPlan.name).then(d => setPlanDetail(d));
  }, [selectedPlan, fetchPlanDetail]);

  const loadResults = useCallback(async () => {
    if (!selectedPlan) return;
    await fetchResults({
      assessment_plan: selectedPlan.name,
      student_group:   selectedPlan.student_group,
      ...(academicYear ? { academic_year: academicYear } : {}),
      ...(academicTerm ? { academic_term: academicTerm } : {}),
    });
  }, [selectedPlan, academicYear, academicTerm, fetchResults]);

  useEffect(() => { loadResults(); }, [loadResults]);

  const localStats = useMemo(() => getLocalStats(results), [results, getLocalStats]);

  const handleSubmit = useCallback(async (name: string, studentName: string) => {
    const ok = await submitResult(name, studentName);
    if (ok) showSuccess('Result Submitted', `${studentName}'s result is now final`);
  }, [submitResult, showSuccess]);

  const handleCancel = useCallback(async (name: string, studentName: string) => {
    const ok = await cancelResult(name, studentName);
    if (ok) showSuccess('Result Cancelled', `${studentName}'s result was cancelled`);
  }, [cancelResult, showSuccess]);

  const studentRows = useMemo<StudentResultRow[]>(() => {
    if (!selectedPlan || groupStudents.length === 0) return [];
    return buildStudentRows(groupStudents, results, selectedPlan.maximum_assessment_score || 100);
  }, [groupStudents, results, selectedPlan, buildStudentRows]);

  const sortedRows = useMemo(() => {
    return [...studentRows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortCol === 'name') return a.student_name.localeCompare(b.student_name) * dir;
      const av = a.percentage ?? -1, bv = b.percentage ?? -1;
      return (av - bv) * dir;
    });
  }, [studentRows, sortCol, sortDir]);

  const toggleSort = (col: 'name' | 'score') => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };
  const si = (col: 'name' | 'score') => sortCol !== col ? null : sortDir === 'asc' ? Icon.up : Icon.down;

  const gradeCount = useMemo(() => {
    const m: Record<string, number> = {};
    results.forEach(r => { m[r.grade] = (m[r.grade] ?? 0) + 1; });
    return m;
  }, [results]);

  const criteriaAvgs = useMemo(() => {
    if (!results.length) return [];
    const map: Record<string, { total: number; count: number; max: number }> = {};
    for (const r of results) {
      for (const d of r.details) {
        if (!map[d.assessment_criteria]) map[d.assessment_criteria] = { total: 0, count: 0, max: d.maximum_score };
        map[d.assessment_criteria].total += d.score;
        map[d.assessment_criteria].count += 1;
      }
    }
    return Object.entries(map).map(([name, v]) => ({
      name, avg: Math.round(v.total / v.count), max: v.max, pct: Math.round((v.total / v.count / v.max) * 100),
    }));
  }, [results]);

  const handleExport = () => {
    const header = ['Student ID', 'Name', 'Section', 'Total Score', 'Max Score', '% Score', 'Grade', 'Status'];
    const rows = sortedRows.map(s => [
      s.student, s.student_name, selectedPlan?.student_group ?? '',
      s.totalScore ?? '', s.maxScore, s.percentage !== null ? `${s.percentage}%` : '',
      s.grade ?? '', s.docstatus === 1 ? 'Submitted' : s.docstatus === 2 ? 'Cancelled' : 'Draft',
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `assessment_${selectedPlan?.student_group ?? 'results'}_${academicYear || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const filteredPlans = useMemo(() =>
    plans.filter(p =>
      (!academicYear || p.academic_year === academicYear) &&
      (!academicTerm || p.academic_term === academicTerm)
    ),
  [plans, academicYear, academicTerm]);

  const TABS = [
    { id: 'overview', label: 'Overview',           icon: Icon.chart,  color: T.primary },
    { id: 'scores',   label: 'Student Scores',     icon: Icon.check,  color: T.blue },
    { id: 'criteria', label: 'Criteria Breakdown', icon: Icon.target, color: T.amber },
  ] as const;

  return (
    <div style={{ padding: '0 16px 24px', maxWidth: '100%', overflowX: 'hidden' }}>
      <style>{`
        @keyframes asmSpin { to { transform: rotate(360deg); } }
        @keyframes asmModalIn { from { opacity:0; transform:scale(.96) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes asmPopIn   { from { opacity:0; transform:scale(.85); } to { opacity:1; transform:scale(1); } }
        @keyframes asmCheckPop{ from { transform:scale(0); } to { transform:scale(1); } }
        @keyframes asmFadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

        .asm-card { position:relative; }
        .asm-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:var(--asm-accent, ${T.primary}); }
        .asm-card-body, .asm-card-body.no-pad { animation: asmFadeIn .25s ease; }
        .asm-tbl tbody tr:nth-child(even) { background: rgba(148,163,184,0.05); }
        .asm-tbl tbody tr:nth-child(even):hover { background:${T.surface}; }

        .asm-kpi { transition: transform .2s ease, box-shadow .2s ease; cursor: default; }
        .asm-kpi:hover { transform: translateY(-3px); box-shadow: 0 10px 20px -10px rgba(0,0,0,.15); }

        .asm-card { background:#fff; border:1.5px solid ${T.border}; border-radius:16px; box-shadow:0 2px 12px -8px rgba(0,0,0,0.08); overflow:hidden; }
        .asm-card-header { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 18px; border-bottom:1px solid ${T.border}; flex-wrap:wrap; }
        .asm-card-title { font-size:14px; font-weight:700; color:${T.ink}; }
        .asm-card-body { padding:18px; }
        .asm-card-body.no-pad { padding:0; }

        .asm-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }

        .asm-tbl { width:100%; border-collapse:collapse; }
        .asm-tbl th { text-align:left; padding:10px 12px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:${T.inkSoft}; border-bottom:1.5px solid ${T.border}; background:${T.surface}; }
        .asm-tbl td { padding:10px 12px; font-size:13px; border-bottom:1px solid ${T.border}; }
        .asm-tbl tbody tr:hover { background:${T.surface}; }
        .asm-tbl-sticky thead { position:sticky; top:0; z-index:2; }

        .asm-avatar { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; background-image: linear-gradient(135deg, rgba(255,255,255,.5), rgba(255,255,255,0)); background-blend-mode: overlay; }

        .asm-num-input { width:58px; padding:6px 6px; border:1.5px solid ${T.border}; border-radius:8px; font-size:14px; font-weight:700; text-align:center; font-family:inherit; outline:none; transition: border-color .15s; }
        .asm-num-input:focus { border-color:${T.primary}; }

        .asm-icon-btn { width:30px; height:30px; border-radius:9px; border:1.5px solid ${T.border}; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; color:${T.inkSoft}; flex-shrink:0; transition: background .15s; }
        .asm-icon-btn:hover { background:${T.redBg}; color:${T.red}; border-color:${T.redBg}; }

        .asm-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:9px 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; border:1.5px solid transparent; font-family:inherit; transition: all .15s ease; white-space:nowrap; }
        .asm-btn:disabled { opacity:.55; cursor:not-allowed; }
        .asm-btn-ghost { background:#fff; border-color:${T.border}; color:${T.ink}; }
        .asm-btn-ghost:hover:not(:disabled) { background:${T.surface}; }
        .asm-btn-primary { background:linear-gradient(135deg, #16a34a, #22c55e); color:#fff; box-shadow:0 6px 14px -6px rgba(22,163,74,.5); }
        .asm-btn-primary:hover:not(:disabled) { filter:brightness(1.06); }
        .asm-btn-sm { padding:7px 12px; font-size:12px; }

        .asm-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.5); display:flex; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(3px); }
        .asm-modal { background:#fff; border-radius:18px; width:100%; box-shadow:0 25px 50px -12px rgba(0,0,0,.3); animation: asmModalIn .22s ease; }
        .asm-modal-head { padding:16px 20px; border-bottom:1px solid ${T.border}; display:flex; justify-content:space-between; align-items:center; background:${T.surface}; gap:10px; }
        .asm-modal-foot { padding:14px 20px; border-top:1px solid ${T.border}; display:flex; gap:10px; flex-shrink:0; flex-wrap:wrap; }

        .asm-tabs { display:flex; align-items:center; gap:6px; margin-bottom:20px; background:#fff; border:1px solid ${T.border}; border-radius:14px; padding:6px; box-shadow:0 2px 10px -6px rgba(0,0,0,.06); overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .asm-tab-btn { padding:9px 16px; font-size:13px; font-weight:500; color:${T.inkSoft}; background:transparent; border:none; border-radius:10px; cursor:pointer; display:flex; align-items:center; gap:7px; white-space:nowrap; flex-shrink:0; transition:all .18s ease; font-family:inherit; }
        .asm-tab-btn:hover:not(.active) { background:${T.surface}; }
        .asm-tab-btn.active { color:#fff; }

        .asm-grid-2 { display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:16px; }

        .asm-filter-card { background:#fff; border:1.5px solid ${T.border}; border-radius:16px; padding:18px 20px; margin-bottom:16px; box-shadow:0 2px 12px -8px rgba(0,0,0,.08); }
        .asm-filter-row { display:flex; align-items:flex-end; gap:14px; flex-wrap:wrap; }
        .asm-action-row { display:flex; gap:8px; align-items:flex-end; flex-wrap:wrap; }

        /* ── FIX: Force select dropdown to open downward ── */
        select {
          list-position: bottom !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }

        select:focus {
          list-position: bottom !important;
        }

        /* For Chrome/Edge/Safari */
        select::-webkit-listbox {
          padding-top: 0 !important;
          margin-top: 2px !important;
        }

        /* For Firefox */
        select:-moz-listbox {
          padding-top: 0 !important;
          margin-top: 2px !important;
        }

        @media (max-width: 640px) {
          .asm-modal-foot { flex-direction:column; }
          .asm-modal-foot .asm-btn { width:100%; flex:none !important; }
          .asm-card-header { flex-direction:column; align-items:flex-start; }
          .asm-action-row { width:100%; }
          .asm-action-row .asm-btn { flex:1 1 auto; }
        }
      `}</style>

      {/* ── Header banner ── */}
      <div style={{
        background: `linear-gradient(120deg, #15803d 0%, #16a34a 45%, #0d9488 100%)`,
        borderRadius: '0 0 22px 22px', padding: '22px 16px', marginBottom: 22,
        marginLeft: -16, marginRight: -16,
        boxShadow: '0 14px 32px -14px rgba(22,163,74,0.45)',
        position: 'relative', overflow: 'hidden',
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
              <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, color: '#fff', marginBottom: 3, letterSpacing: '-0.3px' }}>Assessment</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)' }}>Enter grades, track performance & spot at-risk students</p>
            </div>
          </div>
          {selectedPlan && (
            <span style={{ padding: '7px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 12.5, fontWeight: 600, backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}>
              📋 {selectedPlan.student_group}
            </span>
          )}
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <KpiStrip avg={localStats.avg} passRate={localStats.passRate} atRisk={localStats.atRisk} pending={localStats.pending} total={results.length} />

      {/* ── Filter Card ── */}
      <div className="asm-filter-card">
        <div className="asm-filter-row">
          <FSelect label="Academic Year" value={academicYear} onChange={v => { setAcademicYear(v); setAcademicTerm(''); setSelectedPlan(null); }}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </FSelect>

          <FSelect label="Term" value={academicTerm} onChange={v => { setAcademicTerm(v); setSelectedPlan(null); }}>
            <option value="">All Terms</option>
            {terms.map(t => <option key={t} value={t}>{t}</option>)}
          </FSelect>

          <FSelect label="Assessment Plan" value={selectedPlan?.name ?? ''} disabled={plansLoading} minW={220}
            onChange={v => setSelectedPlan(filteredPlans.find(pl => pl.name === v) ?? null)}>
            <option value="">— Select Plan —</option>
            {filteredPlans.map(p => <option key={p.name} value={p.name}>{p.name} · {p.student_group}</option>)}
          </FSelect>

          <div style={{ flex: '1 1 0', minWidth: 0 }} />

          <div className="asm-action-row">
            <button className="asm-btn asm-btn-ghost asm-btn-sm" onClick={loadResults} disabled={loading}>{Icon.refresh} Refresh</button>
            <button className="asm-btn asm-btn-ghost asm-btn-sm" onClick={handleExport} disabled={!sortedRows.length}>{Icon.download} Export</button>
            <button className="asm-btn asm-btn-primary asm-btn-sm" onClick={() => { if (!selectedPlan) { toast.error('Select an Assessment Plan first'); return; } setShowEntry(true); }}>
              {Icon.edit} Enter Grades
            </button>
          </div>
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.inkSoft, marginBottom: 16, flexWrap: 'wrap' }}>
        <span>Academic</span><span style={{ color: T.inkFaint }}>›</span>
        <span>Assessment</span><span style={{ color: T.inkFaint }}>›</span>
        {selectedPlan ? (
          <>
            <span>{selectedPlan.student_group}</span><span style={{ color: T.inkFaint }}>›</span>
            <span style={{ color: T.ink, fontWeight: 600 }}>{selectedPlan.course || selectedPlan.name}</span>
          </>
        ) : <span style={{ color: T.ink, fontWeight: 600 }}>All Plans</span>}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ background: T.redBg, border: `1px solid ${T.red}55`, borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: T.red, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>⚠ {error}</span>
          <button onClick={loadResults} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', fontSize: 13 }}>Retry</button>
        </div>
      )}

      {/* ── No Plan selected hint ── */}
      {!selectedPlan && !loading && (
        <div style={{ background: T.surface, border: `1.5px dashed ${T.border}`, borderRadius: 16, padding: '32px 20px', textAlign: 'center', color: T.inkSoft, marginBottom: 20 }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.ink, marginBottom: 6 }}>Select an Assessment Plan to get started</div>
          <div style={{ fontSize: 13 }}>Use the filters above to choose a plan, then view and enter grades.</div>
        </div>
      )}

      {/* ── Tabs + Content ── */}
      {selectedPlan && (
        <>
          <div className="asm-tabs">
            {TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`asm-tab-btn${active ? ' active' : ''}`}
                  style={{ background: active ? tab.color : 'transparent', boxShadow: active ? `0 6px 14px -6px ${tab.color}88` : 'none' }}>
                  <span style={{ display: 'flex', opacity: active ? 1 : .75 }}>{tab.icon}</span>{tab.label}
                </button>
              );
            })}
            <div style={{ marginLeft: 'auto', paddingRight: 10, fontSize: 12, color: T.inkSoft, whiteSpace: 'nowrap' }}>
              {loading ? 'Loading…' : `${results.length} records · ${groupStudents.length} students`}
            </div>
          </div>

          {(loading || groupLoading) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 52, borderRadius: 10, background: T.surface, opacity: 0.7 }} />)}
            </div>
          )}

          {/* TAB: OVERVIEW */}
          {!loading && !groupLoading && activeTab === 'overview' && (
            <div className="asm-grid-2">
              <div className="asm-card" style={{ ['--asm-accent' as any]: T.primary }}>
                <div className="asm-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: T.primary, display: 'flex' }}>{Icon.chart}</span>
                    <div className="asm-card-title">Grade Distribution</div>
                  </div>
                  <span className="asm-badge" style={{ background: T.blueBg, color: T.blue }}>{results.length} results</span>
                </div>
                <div className="asm-card-body">
                  {results.length === 0 ? (
                    <div style={{ textAlign: 'center', color: T.inkSoft, padding: '20px 0' }}>No results yet</div>
                  ) : (
                    <>
                      <GradeDistChart gradeCount={gradeCount} />
                      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                        {[['#15803d', 'A+/A'], ['#4DBF9F', 'B'], ['#FDECD1', 'C'], ['#FAD2B0', 'D'], ['#F8C8C8', 'F']].map(([c, g]) => (
                          <span key={g} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.inkSoft }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />Grade {g}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="asm-card" style={{ ['--asm-accent' as any]: T.teal }}>
                <div className="asm-card-header">
                  <div className="asm-card-title">Criteria Averages</div>
                  <span className="asm-badge" style={{ background: T.tealBg, color: T.teal }}>{selectedPlan.course || selectedPlan.name}</span>
                </div>
                <div className="asm-card-body no-pad" style={{ overflowX: 'auto' }}>
                  {criteriaAvgs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: T.inkSoft, padding: 24 }}>No criteria data</div>
                  ) : (
                    <table className="asm-tbl" style={{ minWidth: 340 }}>
                      <thead>
                        <tr><th>Criteria</th><th style={{ textAlign: 'center' }}>Avg Score</th><th style={{ textAlign: 'center' }}>Max</th><th style={{ textAlign: 'center' }}>Avg %</th></tr>
                      </thead>
                      <tbody>
                        {criteriaAvgs.map(c => (
                          <tr key={c.name}>
                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.avg}</td>
                            <td style={{ textAlign: 'center', color: T.inkSoft }}>{c.max}</td>
                            <td style={{ textAlign: 'center' }}><span style={{ fontWeight: 700, color: scoreColor(c.pct) }}>{c.pct}%</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STUDENT SCORES */}
          {!loading && !groupLoading && activeTab === 'scores' && (
            <div className="asm-card" style={{ ['--asm-accent' as any]: T.blue }}>
              <div className="asm-card-header">
                <div className="asm-card-title">Student Scores — {selectedPlan.student_group} · {selectedPlan.course || selectedPlan.name}</div>
                <span style={{ fontSize: 12, color: T.inkSoft }}>Avg: <b style={{ color: T.primary }}>{localStats.avg}%</b></span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="asm-tbl" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Student {si('name')}</span>
                      </th>
                      <th style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('score')}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>Score {si('score')}</span>
                      </th>
                      <th style={{ textAlign: 'center' }}>Grade</th>
                      <th style={{ textAlign: 'center' }}>%</th>
                      <th style={{ textAlign: 'center' }}>Flag</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: T.inkSoft, padding: 32 }}>No results found for this plan.</td></tr>
                    ) : sortedRows.map(s => {
                      const rawResult = results.find(r => r.name === s.resultName);
                      return (
                        <tr key={s.student}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div className="asm-avatar" style={{
                                background: s.flag === 'risk' ? T.redBg : s.flag === 'top' ? T.tealBg : T.surface,
                                color: s.flag === 'risk' ? T.red : s.flag === 'top' ? T.teal : T.inkSoft,
                              }}>{initials(s.student_name)}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{s.student_name}</div>
                                <div style={{ fontSize: 10.5, color: T.inkSoft }}>{s.student}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}><ScoreBar score={s.totalScore} max={s.maxScore} /></td>
                          <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: !s.grade ? T.inkFaint : s.grade === 'F' ? T.red : s.grade.startsWith('A') ? T.teal : T.ink }}>{s.grade ?? '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: scoreColor(s.percentage) }}>{s.percentage !== null ? `${s.percentage}%` : '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {s.flag === 'top'  && <span className="asm-badge" style={{ background: T.tealBg, color: T.teal }}>Top</span>}
                            {s.flag === 'risk' && <span className="asm-badge" style={{ background: T.redBg, color: T.red }}>At Risk</span>}
                            {s.flag === 'pass' && <span className="asm-badge" style={{ background: T.blueBg, color: T.blue }}>Pass</span>}
                            {!s.resultName     && <span className="asm-badge" style={{ background: T.surface, color: T.inkSoft }}>No Result</span>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {s.resultName && (
                              <span className="asm-badge" style={{
                                background: s.docstatus === 1 ? T.tealBg : s.docstatus === 2 ? T.surface : T.amberBg,
                                color: s.docstatus === 1 ? T.teal : s.docstatus === 2 ? T.inkSoft : T.amber,
                              }}>
                                {s.docstatus === 1 ? '✓ Submitted' : s.docstatus === 2 ? 'Cancelled' : '⚡ Draft'}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                              {rawResult && <button className="asm-icon-btn" title="View Details" onClick={() => setDetailResult(rawResult)}>{Icon.eye}</button>}
                              {rawResult && rawResult.docstatus === 0 && <button className="asm-icon-btn" title="Submit" onClick={() => handleSubmit(rawResult.name, s.student_name)} disabled={saving}>{Icon.submit}</button>}
                              {rawResult && rawResult.docstatus === 1 && <button className="asm-icon-btn" title="Cancel" onClick={() => handleCancel(rawResult.name, s.student_name)} disabled={saving}>{Icon.x}</button>}
                              {rawResult && rawResult.docstatus !== 1 && <button className="asm-icon-btn" title="Delete" onClick={() => setDeleteTarget({ docName: rawResult.name, studentName: s.student_name })} disabled={saving}>{Icon.trash}</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.inkSoft, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span>Avg: <b style={{ color: T.primary }}>{localStats.avg}%</b></span>
                <span>At Risk: <b style={{ color: T.red }}>{localStats.atRisk}</b> · Top: <b style={{ color: T.teal }}>{localStats.top}</b></span>
              </div>
            </div>
          )}

          {/* TAB: CRITERIA BREAKDOWN */}
          {!loading && !groupLoading && activeTab === 'criteria' && (
            <div className="asm-card" style={{ ['--asm-accent' as any]: T.amber }}>
              <div className="asm-card-header">
                <div className="asm-card-title">Per-Criteria Scores</div>
                <span className="asm-badge" style={{ background: T.amberBg, color: T.amber }}>{selectedPlan.student_group}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="asm-tbl" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      {criteriaAvgs.map(c => (
                        <th key={c.name} style={{ textAlign: 'center' }}>{c.name}<br /><span style={{ fontWeight: 400, fontSize: 10, color: T.inkFaint }}>/{c.max}</span></th>
                      ))}
                      <th style={{ textAlign: 'center' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.length === 0 ? (
                      <tr><td colSpan={criteriaAvgs.length + 3} style={{ textAlign: 'center', color: T.inkSoft, padding: 32 }}>No data.</td></tr>
                    ) : sortedRows.map(s => {
                      const raw = results.find(r => r.name === s.resultName);
                      return (
                        <tr key={s.student}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{s.student_name}</div>
                            <div style={{ fontSize: 10.5, color: T.inkSoft }}>{s.student}</div>
                          </td>
                          {criteriaAvgs.map(c => {
                            const detail = raw?.details.find(d => d.assessment_criteria === c.name);
                            return <td key={c.name} style={{ textAlign: 'center' }}><ScoreBar score={detail?.score ?? null} max={c.max} /></td>;
                          })}
                          <td style={{ textAlign: 'center', fontWeight: 700, color: T.primary }}>{s.totalScore ?? '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: s.grade === 'F' ? T.red : T.teal }}>{s.grade ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {criteriaAvgs.length > 0 && results.length > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${T.border}`, background: T.surface }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: T.inkSoft }}>Section Avg</td>
                        {criteriaAvgs.map(c => <td key={c.name} style={{ textAlign: 'center', fontWeight: 700, color: scoreColor(c.pct) }}>{c.avg}/{c.max}</td>)}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: T.primary }}>—</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: scoreColor(localStats.avg) }}>{localStats.avg}%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODALS ── */}
      {showEntry && selectedPlan && (
        <GradeEntryModal
          plan={planDetail ?? selectedPlan}
          groupStudents={groupStudents}
          existingResults={results}
          onClose={() => setShowEntry(false)}
          onSaved={() => { loadResults(); showSuccess('Grades Saved', `${selectedPlan.student_group} · ${selectedPlan.course || selectedPlan.name}`); }}
          bulkSaveGrades={bulkSaveGrades}
          calcGrade={calcGrade}
          saving={saving}
        />
      )}

      {detailResult && <CriteriaModal result={detailResult} onClose={() => setDetailResult(null)} />}

      {deleteTarget && (
        <DeleteModal
          docName={deleteTarget.docName}
          studentName={deleteTarget.studentName}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { loadResults(); showSuccess('Result Deleted', `${deleteTarget.studentName}'s result was removed`); }}
          deleteResult={deleteResult}
          saving={saving}
        />
      )}

      {successPopup && (
        <SuccessPopup title={successPopup.title} subtitle={successPopup.subtitle} onClose={() => setSuccessPopup(null)} />
      )}
    </div>
  );
}