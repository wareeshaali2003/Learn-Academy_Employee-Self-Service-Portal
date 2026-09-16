import { type ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  color?: 'teal' | 'red' | 'amber' | 'blue';
  sub?: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  sparkline?: number[];
}

// ── Mini Sparkline SVG ─────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${(data.length - 1) * step},${h}`}
        fill={`url(#sg-${color})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={(data.length - 1) * step}
        cy={h - ((data[data.length - 1] - min) / range) * (h - 4) - 2}
        r="3" fill={color}
      />
    </svg>
  );
}

const colorMap = {
  teal: { hex: '#0B8B6F', pale: '#E0F5EF', text: '#0B8B6F' },
  red: { hex: '#D94F4F', pale: '#FDEAEA', text: '#D94F4F' },
  amber: { hex: '#E8A020', pale: '#FEF4E0', text: '#E8A020' },
  blue: { hex: '#2A7BDE', pale: '#E8F1FC', text: '#2A7BDE' },
};

export default function KpiCard({ label, value, color = 'teal', sub, onClick, icon, sparkline }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`kpi-card ${color}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      {/* Icon badge */}
      {icon && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          width: 36, height: 36, borderRadius: 10,
          background: c.pale,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.hex, fontSize: 16,
        }}>
          {icon}
        </div>
      )}

      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${color}`}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}

      {/* Sparkline */}
      {sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: 10, opacity: 0.85 }}>
          <Sparkline data={sparkline} color={c.hex} />
        </div>
      )}

      {/* Click hint */}
      {onClick && (
        <div style={{
          position: 'absolute', bottom: 12, right: 14,
          fontSize: 10, color: c.hex, opacity: 0.5,
          display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600,
          letterSpacing: '0.5px', textTransform: 'uppercase',
        }}>
          View →
        </div>
      )}
    </div>
  );
}