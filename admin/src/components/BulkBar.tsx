import { Icon } from './Icon';
import { pluralize } from '@/lib/format';
import type { BulkAction } from '@/lib/types';

interface BulkBarProps {
  count: number;
  actions: BulkAction[];
  busy?: boolean;
  onAction: (action: BulkAction) => void;
  onClear: () => void;
}

const LABELS: Record<BulkAction, { label: string; icon: Parameters<typeof Icon>[0]['name']; className: string }> = {
  approve: { label: 'Approve', icon: 'check', className: 'btn-success' },
  reject: { label: 'Reject', icon: 'close', className: 'btn-ghost' },
  archive: { label: 'Archive', icon: 'archive', className: 'btn-ghost' },
  restore: { label: 'Restore', icon: 'restore', className: 'btn-ghost' },
  delete: { label: 'Delete', icon: 'trash', className: 'btn-danger' },
};

/** Floating action bar — appears only while rows are selected. */
export function BulkBar({ count, actions, busy, onAction, onClear }: BulkBarProps) {
  if (count === 0) return null;

  return (
    <div
      className="card row wrap gap-3 animate-in"
      style={{
        position: 'sticky',
        bottom: 20,
        zIndex: 30,
        margin: '16px 0 0',
        padding: '12px 16px',
        background: 'var(--ink-800)',
        borderColor: 'var(--line-strong)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <span className="row gap-2">
        <span
          className="center mono"
          style={{
            minWidth: 24, height: 24, padding: '0 7px', borderRadius: 'var(--r-full)',
            background: 'var(--grad-brand)', color: '#fff', fontSize: 12, fontWeight: 700,
          }}
        >
          {count}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{pluralize(count, 'row')} selected</span>
      </span>

      <span className="grow" />

      <div className="row wrap gap-2">
        {actions.map((action) => {
          const config = LABELS[action];
          return (
            <button
              key={action}
              className={`btn btn-sm ${config.className}`}
              onClick={() => onAction(action)}
              disabled={busy}
            >
              <Icon name={config.icon} size={14} />
              {config.label}
            </button>
          );
        })}
        <button className="btn btn-subtle btn-sm" onClick={onClear} disabled={busy}>
          Clear
        </button>
      </div>
    </div>
  );
}
