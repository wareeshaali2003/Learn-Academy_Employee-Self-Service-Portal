import { type ReactNode } from 'react';

interface WarningCardProps {
  type?: 'red' | 'amber' | 'blue' | 'teal';
  icon?: string;
  title: string;
  body: string;
  action?: ReactNode;
}

export default function WarningCard({ type = 'amber', icon, title, body, action }: WarningCardProps) {
  const defaultIcons: Record<string, string> = { red: '🚨', amber: '⚠️', blue: 'ℹ️', teal: '✅' };
  const ic = icon || defaultIcons[type];

  return (
    <div className={`alert-card ${type}`}>
      <div className="alert-icon">{ic}</div>
      <div style={{ flex: 1 }}>
        <div className="alert-title">{title}</div>
        <div className="alert-body">{body}</div>
      </div>
      {action && <div style={{ marginLeft: 'auto', flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

