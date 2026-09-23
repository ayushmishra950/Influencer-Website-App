import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { Icon, type IconName } from '@/components/Icon';
import { useStats } from '@/hooks/useInfluencers';
import { formatRelative, locationLine } from '@/lib/format';
import type { Stats } from '@/lib/types';

interface Tile {
  key: keyof Omit<Stats, 'recent'>;
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  to: string;
  hint: string;
}

const TILES: Tile[] = [
  { key: 'total', label: 'Total influencers', icon: 'users', color: 'var(--violet-400)', bg: 'var(--violet-bg)', to: '/influencers?archived=all&status=all', hint: 'Every record on the platform' },
  { key: 'pending', label: 'Awaiting review', icon: 'clock', color: 'var(--amber-400)', bg: 'var(--amber-bg)', to: '/review', hint: 'Cannot log in until approved' },
  { key: 'approved', label: 'Approved', icon: 'check', color: 'var(--mint-400)', bg: 'var(--mint-bg)', to: '/influencers?status=approved', hint: 'Live in the public directory' },
  { key: 'rejected', label: 'Rejected', icon: 'close', color: 'var(--rose-400)', bg: 'var(--rose-bg)', to: '/influencers?status=rejected', hint: 'Not approved for listing' },
  { key: 'archived', label: 'Archived', icon: 'archive', color: 'var(--slate-400)', bg: 'var(--slate-bg)', to: '/archived', hint: 'Hidden, but restorable' },
  { key: 'pendingPackages', label: 'Packages to review', icon: 'price', color: 'var(--violet-400)', bg: 'var(--violet-bg)', to: '/packages', hint: 'Prices awaiting approval' },
];

export function DashboardPage() {
  const { data: stats, isLoading } = useStats();

  if (isLoading || !stats) return <PageLoader label="Loading dashboard" />;

  return (
    <div className="animate-in">
      <PageHeader
        title="Dashboard"
        subtitle="Platform health at a glance"
        actions={
          <Link className="btn btn-primary" to="/influencers/new">
            <Icon name="plus" size={16} />
            Add influencer
          </Link>
        }
      />

      {/* Pending work comes first: it is the only number that needs an action today. */}
      {stats.pending > 0 && (
        <Link
          to="/review"
          className="card row gap-4 between"
          style={{ padding: '16px 20px', marginBottom: 20, borderColor: 'rgba(251,191,36,.3)', background: 'var(--amber-bg)' }}
        >
          <span className="row gap-3">
            <span className="center" style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'rgba(251,191,36,.18)', color: 'var(--amber-400)' }}>
              <Icon name="clock" size={18} />
            </span>
            <span className="stack" style={{ lineHeight: 1.4 }}>
              <strong style={{ fontSize: 14 }}>
                {stats.pending} {stats.pending === 1 ? 'registration is' : 'registrations are'} waiting for review
              </strong>
              <span className="muted" style={{ fontSize: 12.5 }}>
                These creators cannot sign in until you approve them.
              </span>
            </span>
          </span>
          <span className="row gap-1" style={{ color: 'var(--amber-400)', fontSize: 13, fontWeight: 600 }}>
            Review now <Icon name="chevronRight" size={15} />
          </span>
        </Link>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {TILES.map((tile) => (
          <Link key={tile.key} to={tile.to} className="card card-pad stack gap-3">
            <span className="between">
              <span className="center" style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: tile.bg, color: tile.color }}>
                <Icon name={tile.icon} size={17} />
              </span>
              <Icon name="chevronRight" size={15} className="dim" />
            </span>
            <span className="stack gap-1">
              <strong className="mono" style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {stats[tile.key].toLocaleString('en-IN')}
              </strong>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{tile.label}</span>
              <span className="dim" style={{ fontSize: 11.5 }}>{tile.hint}</span>
            </span>
          </Link>
        ))}
      </div>

      <section className="card">
        <div className="between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2>Latest registrations</h2>
          <Link className="btn btn-subtle btn-sm" to="/influencers">View all</Link>
        </div>

        {stats.recent.length === 0 ? (
          <EmptyState
            icon="users"
            title="No influencers yet"
            description="Once creators register, they will appear here for review."
            action={<Link className="btn btn-primary" to="/influencers/new">Add the first one</Link>}
          />
        ) : (
          <ul className="stack">
            {stats.recent.map((item) => (
              <li key={item._id}>
                <Link
                  to={`/influencers/${item._id}`}
                  className="row gap-3"
                  style={{ padding: '12px 20px', borderBottom: '1px solid var(--line)' }}
                >
                  <Avatar name={item.name} src={item.profileImage} size={38} />
                  <span className="stack grow" style={{ minWidth: 0, lineHeight: 1.4 }}>
                    <strong className="truncate" style={{ fontSize: 13.5 }}>{item.name}</strong>
                    <span className="dim truncate" style={{ fontSize: 12 }}>
                      {item.category?.name ?? 'Uncategorised'} · {locationLine(item.location)}
                    </span>
                  </span>
                  <StatusPill status={item.status} />
                  <span className="dim mono" style={{ fontSize: 11.5, minWidth: 64, textAlign: 'right' }}>
                    {formatRelative(item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
