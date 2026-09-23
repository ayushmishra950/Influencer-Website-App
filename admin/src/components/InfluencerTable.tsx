import { Link } from 'react-router-dom';
import { Avatar } from './Avatar';
import { StatusPill } from './StatusPill';
import { Icon } from './Icon';
import { formatDate, locationLine, socialUrl } from '@/lib/format';
import type { Influencer } from '@/lib/types';

export type RowAction = 'approve' | 'reject' | 'archive' | 'restore' | 'delete';

interface InfluencerTableProps {
  items: Influencer[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onAction: (influencer: Influencer, action: RowAction) => void;
  busyId?: string;
}

/** Which row buttons make sense depends on the record's current state. */
function rowActions(influencer: Influencer): RowAction[] {
  if (influencer.isArchived) return ['restore', 'delete'];
  if (influencer.status === 'pending') return ['approve', 'reject', 'archive'];
  if (influencer.status === 'rejected') return ['approve', 'archive', 'delete'];
  return ['archive', 'delete'];
}

const ACTION_CONFIG: Record<RowAction, { icon: Parameters<typeof Icon>[0]['name']; title: string; color?: string }> = {
  approve: { icon: 'check', title: 'Approve', color: 'var(--mint-400)' },
  reject: { icon: 'close', title: 'Reject', color: 'var(--rose-400)' },
  archive: { icon: 'archive', title: 'Archive' },
  restore: { icon: 'restore', title: 'Restore', color: 'var(--mint-400)' },
  delete: { icon: 'trash', title: 'Delete permanently', color: 'var(--rose-400)' },
};

export function InfluencerTable({
  items, selected, onToggle, onToggleAll, onAction, busyId,
}: InfluencerTableProps) {
  const allSelected = items.length > 0 && items.every((item) => selected.has(item._id));
  const someSelected = items.some((item) => selected.has(item._id));

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 44 }}>
              <input
                className="checkbox"
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={onToggleAll}
                aria-label="Select all rows"
              />
            </th>
            <th>Influencer</th>
            <th>Category</th>
            <th>Location</th>
            <th style={{ width: 90 }}>Social</th>
            <th style={{ width: 110 }}>Status</th>
            <th style={{ width: 110 }}>Joined</th>
            <th style={{ width: 150, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((influencer) => {
            const isSelected = selected.has(influencer._id);
            const instagram = socialUrl('instagram', influencer.social?.instagram ?? '');
            const youtube = socialUrl('youtube', influencer.social?.youtube ?? '');
            const busy = busyId === influencer._id;

            return (
              <tr key={influencer._id} className={isSelected ? 'is-selected' : ''}>
                <td>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(influencer._id)}
                    aria-label={`Select ${influencer.name}`}
                  />
                </td>

                <td>
                  <Link to={`/influencers/${influencer._id}`} className="row gap-3">
                    <Avatar name={influencer.name} src={influencer.profileImage} size={36} />
                    <span className="stack" style={{ minWidth: 0, lineHeight: 1.4 }}>
                      <strong className="truncate" style={{ fontSize: 13.5 }}>{influencer.name}</strong>
                      <span className="dim truncate" style={{ fontSize: 12, maxWidth: 220 }}>
                        {influencer.email}
                      </span>
                    </span>
                  </Link>
                </td>

                <td>
                  <span
                    className="pill"
                    style={{ background: 'var(--violet-bg)', color: 'var(--violet-300)', borderColor: 'rgba(124,92,252,.25)' }}
                  >
                    {influencer.category?.name ?? 'Uncategorised'}
                  </span>
                </td>

                <td className="muted" style={{ fontSize: 13 }}>{locationLine(influencer.location)}</td>

                <td>
                  <span className="row gap-2">
                    {instagram ? (
                      <a href={instagram} target="_blank" rel="noreferrer noopener" title="Instagram" style={{ color: 'var(--violet-400)', display: 'flex' }}>
                        <Icon name="instagram" size={16} />
                      </a>
                    ) : (
                      <span className="dim" style={{ display: 'flex', opacity: 0.3 }}><Icon name="instagram" size={16} /></span>
                    )}
                    {youtube ? (
                      <a href={youtube} target="_blank" rel="noreferrer noopener" title="YouTube" style={{ color: 'var(--rose-400)', display: 'flex' }}>
                        <Icon name="youtube" size={16} />
                      </a>
                    ) : (
                      <span className="dim" style={{ display: 'flex', opacity: 0.3 }}><Icon name="youtube" size={16} /></span>
                    )}
                  </span>
                </td>

                <td><StatusPill status={influencer.status} archived={influencer.isArchived} /></td>

                <td className="dim mono" style={{ fontSize: 12 }}>{formatDate(influencer.createdAt)}</td>

                <td>
                  <span className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                    {busy && <span className="spinner" />}
                    <Link className="btn btn-subtle btn-icon" to={`/influencers/${influencer._id}`} title="View">
                      <Icon name="eye" size={15} />
                    </Link>
                    <Link className="btn btn-subtle btn-icon" to={`/influencers/${influencer._id}/edit`} title="Edit">
                      <Icon name="edit" size={15} />
                    </Link>
                    {rowActions(influencer).map((action) => {
                      const config = ACTION_CONFIG[action];
                      return (
                        <button
                          key={action}
                          className="btn btn-subtle btn-icon"
                          title={config.title}
                          aria-label={`${config.title} ${influencer.name}`}
                          onClick={() => onAction(influencer, action)}
                          disabled={busy}
                          style={config.color ? { color: config.color } : undefined}
                        >
                          <Icon name={config.icon} size={15} />
                        </button>
                      );
                    })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
