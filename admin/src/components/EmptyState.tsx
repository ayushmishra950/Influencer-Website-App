import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'sparkles', title, description, action }: EmptyStateProps) {
  return (
    <div className="center stack gap-3" style={{ padding: '64px 24px', textAlign: 'center' }}>
      <span
        className="center"
        style={{
          width: 52, height: 52, borderRadius: 'var(--r-lg)',
          background: 'var(--violet-bg)', color: 'var(--violet-400)',
        }}
      >
        <Icon name={icon} size={24} />
      </span>
      <h3>{title}</h3>
      {description && (
        <p className="muted" style={{ maxWidth: 380, fontSize: 13.5 }}>{description}</p>
      )}
      {action}
    </div>
  );
}
