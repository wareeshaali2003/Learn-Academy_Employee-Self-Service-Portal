import { type ReactNode } from 'react';

interface BadgeProps {
  variant?: 'teal' | 'red' | 'amber' | 'blue' | 'gray';
  dot?: boolean;
  children: ReactNode;
}

export default function Badge({ variant = 'gray', dot, children }: BadgeProps) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
      {children}
    </span>
  );
}

// ─── Preset status badge ───────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { v: 'teal' | 'red' | 'amber' | 'blue' | 'gray'; label: string }> = {
    Active:     { v: 'teal',  label: '● Active' },
    Inactive:   { v: 'red',   label: '● Inactive' },
    Suspended:  { v: 'amber', label: '● Suspended' },
    'On-Leave': { v: 'blue',  label: '● On-Leave' },
  };
  const cfg = map[status] || { v: 'gray', label: status };
  return <Badge variant={cfg.v}>{cfg.label}</Badge>;
}

// ─── Attendance badge ──────────────────────────────────────
export function AttBadge({ status }: { status: string }) {
  if (status === 'Present') return <span className="badge badge-teal">P</span>;
  if (status === 'Absent')  return <span className="badge badge-red">A</span>;
  if (status === 'Late')    return <span className="badge badge-amber">L</span>;
  return <span className="badge badge-gray">—</span>;
}