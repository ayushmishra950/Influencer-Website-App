import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/StatusPill';
import { Pagination } from '@/components/Pagination';
import { Icon } from '@/components/Icon';
import { useDebounced } from '@/hooks/useDebounced';
import {
  DEFAULT_PACKAGE_FILTERS,
  useDeletePackage,
  usePackageList,
  usePackageReview,
  type PackageFilters,
} from '@/hooks/useInfluencers';
import { useConfirm } from '@/context/ConfirmContext';
import {
  confirmApprovePackage,
  confirmDeletePackage,
  confirmRejectPackage,
} from '@/lib/confirmations';
import { formatPrice, formatRelative } from '@/lib/format';
import type { Package, Status } from '@/lib/types';

const STATUS_OPTIONS: { value: Status | 'all'; label: string }[] = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All packages' },
];

/** A package is only ever as visible as the influencer it belongs to. */
const isPublic = (pkg: Package): boolean =>
  !!pkg.influencer && pkg.influencer.status === 'approved' && !pkg.influencer.isArchived;

export function PackagesPage() {
  const [filters, setFilters] = useState<PackageFilters>(DEFAULT_PACKAGE_FILTERS);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);

  const { data, isLoading, isFetching } = usePackageList(filters);
  const review = usePackageReview();
  const remove = useDeletePackage();
  const confirm = useConfirm();

  useEffect(() => {
    setFilters((current) => ({ ...current, q: debounced, page: 1 }));
  }, [debounced]);

  const items = data?.data ?? [];
  const busy = review.isPending || remove.isPending;

  async function act(pkg: Package, action: 'approve' | 'reject' | 'delete') {
    const who = pkg.influencer?.name ?? 'this influencer';
    const influencerIsPublic = isPublic(pkg);
    const options =
      action === 'approve'
        ? confirmApprovePackage(pkg.title, who, influencerIsPublic)
        : action === 'reject'
          ? confirmRejectPackage(pkg.title, who)
          : confirmDeletePackage(pkg.title);

    const { confirmed, reason } = await confirm(options);
    if (!confirmed) return;

    if (action === 'delete') remove.mutate(pkg._id);
    else review.mutate({ id: pkg._id, action, reason });
  }

  if (isLoading) return <PageLoader label="Loading packages" />;

  return (
    <div className="animate-in">
      <PageHeader
        title="Packages"
        subtitle="What influencers charge. Nothing is public until you approve it."
      />

      <div className="card card-pad row wrap gap-2" style={{ marginBottom: 16 }}>
        <div className="row grow" style={{ position: 'relative', minWidth: 220 }}>
          <span className="dim" style={{ position: 'absolute', left: 12, display: 'flex', pointerEvents: 'none' }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by service or influencer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search packages"
          />
        </div>

        <select
          className="select"
          style={{ width: 'auto', minWidth: 170 }}
          value={filters.status}
          onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value as Status | 'all', page: 1 }))}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity .15s' }}>
        {items.length === 0 ? (
          <EmptyState
            icon="price"
            title={filters.status === 'pending' ? 'Nothing to review' : 'No packages found'}
            description={
              filters.status === 'pending'
                ? 'Every submitted package has been reviewed. New ones appear here automatically.'
                : 'Try a different search term or status.'
            }
          />
        ) : (
          <>
            <ul className="stack">
              {items.map((pkg) => (
                <li
                  key={pkg._id}
                  className="stack gap-3"
                  style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}
                >
                  <div className="between wrap gap-3">
                    {pkg.influencer ? (
                      <Link to={`/influencers/${pkg.influencer._id}`} className="row gap-3" style={{ minWidth: 0 }}>
                        <Avatar name={pkg.influencer.name} src={pkg.influencer.profileImage} size={36} />
                        <span className="stack" style={{ minWidth: 0, lineHeight: 1.4 }}>
                          <strong className="truncate" style={{ fontSize: 13.5 }}>{pkg.influencer.name}</strong>
                          <span className="dim truncate" style={{ fontSize: 12 }}>{pkg.influencer.email}</span>
                        </span>
                      </Link>
                    ) : (
                      <span className="dim" style={{ fontSize: 13 }}>Influencer removed</span>
                    )}

                    <span className="row gap-3">
                      {/* Approving a package for someone who is not live achieves
                          nothing on its own, so flag it before the admin clicks. */}
                      {!isPublic(pkg) && (
                        <span
                          className="pill pill-archived"
                          title="This influencer is not in the public directory, so their packages cannot be seen"
                        >
                          profile not public
                        </span>
                      )}
                      <StatusPill status={pkg.status} />
                      <span className="dim mono" style={{ fontSize: 11.5 }}>{formatRelative(pkg.updatedAt)}</span>
                    </span>
                  </div>

                  <div
                    className="between wrap gap-3"
                    style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--ink-950)' }}
                  >
                    <span className="stack gap-1" style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 14 }}>{pkg.title}</strong>
                      {!!pkg.description && (
                        <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{pkg.description}</span>
                      )}
                      {pkg.deliveryDays > 0 && (
                        <span className="dim" style={{ fontSize: 11.5 }}>
                          {pkg.deliveryDays} {pkg.deliveryDays === 1 ? 'day' : 'days'} delivery
                        </span>
                      )}
                    </span>

                    <strong style={{ fontSize: 18, color: 'var(--violet-400)', fontFamily: 'var(--font-display)' }}>
                      {formatPrice(pkg.price, pkg.currency)}
                    </strong>
                  </div>

                  {pkg.status === 'rejected' && !!pkg.rejectionReason && (
                    <span style={{ fontSize: 12.5, color: 'var(--rose-400)' }}>
                      Rejected: {pkg.rejectionReason}
                    </span>
                  )}

                  <div className="row wrap gap-2">
                    {pkg.status !== 'approved' && (
                      <button className="btn btn-success btn-sm" disabled={busy} onClick={() => void act(pkg, 'approve')}>
                        <Icon name="check" size={14} /> Approve
                      </button>
                    )}
                    {pkg.status !== 'rejected' && (
                      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void act(pkg, 'reject')}>
                        <Icon name="close" size={14} /> Reject
                      </button>
                    )}
                    <span className="grow" />
                    <button className="btn btn-subtle btn-icon" disabled={busy} title="Delete package"
                      aria-label={`Delete ${pkg.title}`} style={{ color: 'var(--rose-400)' }}
                      onClick={() => void act(pkg, 'delete')}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {data?.meta && (
              <Pagination
                meta={data.meta}
                noun="package"
                onChange={(page) => {
                  setFilters((c) => ({ ...c, page }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
