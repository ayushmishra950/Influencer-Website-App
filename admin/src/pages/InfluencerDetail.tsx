import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { Avatar } from '@/components/Avatar';
import { StatusPill } from '@/components/StatusPill';
import { Icon, type IconName } from '@/components/Icon';
import { EmptyState } from '@/components/EmptyState';
import { useDeleteInfluencer, useInfluencer, useInfluencerAction } from '@/hooks/useInfluencers';
import { useConfirm } from '@/context/ConfirmContext';
import {
  confirmApprove,
  confirmArchive,
  confirmDelete,
  confirmReject,
  confirmRestore,
} from '@/lib/confirmations';
import { formatDate, locationLine, socialUrl } from '@/lib/format';

function DetailRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="row gap-3" style={{ padding: '11px 0', borderBottom: '1px solid var(--line)' }}>
      <span className="dim" style={{ display: 'flex' }}><Icon name={icon} size={16} /></span>
      <span className="dim" style={{ fontSize: 12.5, width: 92, flexShrink: 0 }}>{label}</span>
      <span className="grow" style={{ fontSize: 13.5, minWidth: 0 }}>{children}</span>
    </div>
  );
}

export function InfluencerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: influencer, isLoading } = useInfluencer(id);
  const action_ = useInfluencerAction();
  const remove = useDeleteInfluencer();

  const confirm = useConfirm();

  if (isLoading) return <PageLoader label="Loading profile" />;
  if (!influencer) {
    return (
      <div className="card">
        <EmptyState
          icon="users"
          title="Influencer not found"
          description="This record may have been deleted."
          action={<Link className="btn btn-primary" to="/influencers">Back to list</Link>}
        />
      </div>
    );
  }

  const instagram = socialUrl('instagram', influencer.social?.instagram ?? '');
  const youtube = socialUrl('youtube', influencer.social?.youtube ?? '');
  const busy = action_.isPending || remove.isPending;

  type DetailAction = 'approve' | 'reject' | 'archive' | 'restore' | 'delete';

  /** Nothing on this page changes a record without asking first. */
  async function run(action: DetailAction) {
    if (!influencer) return;
    const options = {
      approve: confirmApprove,
      reject: confirmReject,
      archive: confirmArchive,
      restore: confirmRestore,
      delete: confirmDelete,
    }[action](influencer.name);

    const { confirmed, reason } = await confirm(options);
    if (!confirmed) return;

    if (action === 'delete') {
      remove.mutate(influencer._id, { onSuccess: () => navigate('/influencers') });
      return;
    }
    action_.mutate({ id: influencer._id, action, ...(action === 'reject' ? { reason } : {}) });
  }

  return (
    <div className="animate-in">
      <Link className="btn btn-subtle btn-sm" to="/influencers" style={{ marginBottom: 12 }}>
        <Icon name="chevronLeft" size={14} /> All influencers
      </Link>

      <PageHeader
        title={influencer.name}
        subtitle={influencer.email}
        actions={
          <>
            <Link className="btn btn-ghost" to={`/influencers/${influencer._id}/edit`}>
              <Icon name="edit" size={15} /> Edit
            </Link>
            {influencer.isArchived ? (
              <button className="btn btn-success" disabled={busy} onClick={() => void run('restore')}>
                <Icon name="restore" size={15} /> Restore
              </button>
            ) : (
              <>
                {influencer.status !== 'approved' && (
                  <button className="btn btn-success" disabled={busy} onClick={() => void run('approve')}>
                    <Icon name="check" size={15} /> Approve
                  </button>
                )}
                {influencer.status !== 'rejected' && (
                  <button className="btn btn-ghost" disabled={busy} onClick={() => void run('reject')}>
                    <Icon name="close" size={15} /> Reject
                  </button>
                )}
                <button className="btn btn-ghost" disabled={busy} onClick={() => void run('archive')}>
                  <Icon name="archive" size={15} /> Archive
                </button>
              </>
            )}
            <button className="btn btn-danger" disabled={busy} onClick={() => void run('delete')}>
              <Icon name="trash" size={15} />
            </button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: 16, alignItems: 'start' }}>
        <div className="stack gap-4">
          <section className="card card-pad stack gap-4 center" style={{ textAlign: 'center' }}>
            <Avatar name={influencer.name} src={influencer.profileImage} size={92} />
            <div className="stack gap-2 center">
              <h2>{influencer.name}</h2>
              <span
                className="pill"
                style={{ background: 'var(--violet-bg)', color: 'var(--violet-300)', borderColor: 'rgba(124,92,252,.25)' }}
              >
                {influencer.category?.name ?? 'Uncategorised'}
              </span>
              <StatusPill status={influencer.status} archived={influencer.isArchived} />
            </div>

            {influencer.bio && (
              <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.65 }}>{influencer.bio}</p>
            )}

            <div className="row gap-2" style={{ justifyContent: 'center' }}>
              {instagram && (
                <a className="btn btn-ghost btn-sm" href={instagram} target="_blank" rel="noreferrer noopener">
                  <Icon name="instagram" size={15} /> Instagram
                </a>
              )}
              {youtube && (
                <a className="btn btn-ghost btn-sm" href={youtube} target="_blank" rel="noreferrer noopener">
                  <Icon name="youtube" size={15} /> YouTube
                </a>
              )}
              {!instagram && !youtube && <span className="dim" style={{ fontSize: 12.5 }}>No social links added</span>}
            </div>
          </section>

          {influencer.status === 'rejected' && influencer.rejectionReason && (
            <section className="card card-pad stack gap-2" style={{ borderColor: 'rgba(251,113,133,.3)' }}>
              <span className="row gap-2" style={{ color: 'var(--rose-400)', fontSize: 12.5, fontWeight: 600 }}>
                <Icon name="warning" size={15} /> Rejection reason
              </span>
              <p className="muted" style={{ fontSize: 13.5 }}>{influencer.rejectionReason}</p>
            </section>
          )}
        </div>

        <div className="stack gap-4">
          <section className="card card-pad">
            <h3 style={{ marginBottom: 6 }}>Contact &amp; location</h3>
            <DetailRow icon="mail" label="Email">{influencer.email}</DetailRow>
            <DetailRow icon="phone" label="Phone">{influencer.phone || '—'}</DetailRow>
            <DetailRow icon="pin" label="Location">{locationLine(influencer.location)}</DetailRow>
            <DetailRow icon="tag" label="Category">{influencer.category?.name ?? '—'}</DetailRow>
          </section>

          <section className="card card-pad">
            <h3 style={{ marginBottom: 6 }}>Verification trail</h3>
            <DetailRow icon="clock" label="Registered">
              {formatDate(influencer.createdAt)}
              <span className="dim"> · {influencer.createdBy === 'admin' ? 'created by admin' : 'self-registered'}</span>
            </DetailRow>
            <DetailRow icon="check" label="Reviewed">
              {influencer.reviewedAt ? (
                <>
                  {formatDate(influencer.reviewedAt)}
                  {influencer.reviewedBy && <span className="dim"> · by {influencer.reviewedBy.name}</span>}
                </>
              ) : (
                <span className="dim">Not reviewed yet</span>
              )}
            </DetailRow>
            <DetailRow icon="archive" label="Archived">
              {influencer.isArchived ? formatDate(influencer.archivedAt) : <span className="dim">No</span>}
            </DetailRow>
            <DetailRow icon="logout" label="Can sign in">
              {influencer.status === 'approved' && !influencer.isArchived ? (
                <span style={{ color: 'var(--mint-400)' }}>Yes</span>
              ) : (
                <span style={{ color: 'var(--amber-400)' }}>
                  No — {influencer.isArchived ? 'archived' : `status is ${influencer.status}`}
                </span>
              )}
            </DetailRow>
          </section>
        </div>
      </div>

      <style>{`@media (max-width: 860px) { .animate-in > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; } }`}</style>

    </div>
  );
}
