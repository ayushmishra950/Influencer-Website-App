import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { TextAreaField } from '@/components/Field';
import { useDebounced } from '@/hooks/useDebounced';
import {
  DEFAULT_ENQUIRY_FILTERS,
  useDeleteEnquiry,
  useEnquiryList,
  useUpdateEnquiry,
} from '@/hooks/useInfluencers';
import { useConfirm } from '@/context/ConfirmContext';
import { confirmDeleteEnquiry } from '@/lib/confirmations';
import { formatRelative } from '@/lib/format';
import type { Enquiry, EnquiryFilters, EnquiryStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: EnquiryStatus | 'all'; label: string }[] = [
  { value: 'new', label: 'Needs contacting' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All enquiries' },
];

/** Reuses the shared pill palette so a status reads the same way as everywhere else. */
const PILL: Record<EnquiryStatus, { className: string; label: string }> = {
  new: { className: 'pill pill-pending', label: 'new' },
  contacted: { className: 'pill pill-approved', label: 'contacted' },
  closed: { className: 'pill pill-archived', label: 'closed' },
};

/** Phone and email are the whole point of this page, so both are one click to use. */
function ContactRow({ enquiry }: { enquiry: Enquiry }) {
  const items = [
    { icon: 'mail' as const, text: enquiry.email, href: `mailto:${enquiry.email}` },
    { icon: 'phone' as const, text: enquiry.phone, href: `tel:${enquiry.phone}` },
    ...(enquiry.website
      ? [{ icon: 'pin' as const, text: enquiry.website, href: enquiry.website }]
      : []),
  ];

  return (
    <div className="row wrap gap-2">
      {items.map((item) => (
        <a
          key={item.icon}
          href={item.href}
          // The website is a URL a stranger typed into a public form. Opening it in this
          // tab would hand that page a reference back to the admin panel.
          {...(item.icon === 'pin' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="btn btn-subtle btn-sm"
          style={{ maxWidth: 280 }}
        >
          <Icon name={item.icon} size={14} />
          <span className="truncate">{item.text}</span>
        </a>
      ))}
    </div>
  );
}

export function EnquiriesPage() {
  const [filters, setFilters] = useState<EnquiryFilters>(DEFAULT_ENQUIRY_FILTERS);
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);

  const { data, isLoading, isFetching } = useEnquiryList(filters);
  const update = useUpdateEnquiry();
  const remove = useDeleteEnquiry();
  const confirm = useConfirm();

  const [noting, setNoting] = useState<Enquiry | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    setFilters((current) => ({ ...current, q: debounced, page: 1 }));
  }, [debounced]);

  // Marking the last enquiry on a page would otherwise strand the admin on an empty one.
  useEffect(() => {
    if (data?.meta && filters.page > data.meta.totalPages) {
      setFilters((current) => ({ ...current, page: data.meta.totalPages }));
    }
  }, [data?.meta, filters.page]);

  const items = data?.data ?? [];
  const busy = update.isPending || remove.isPending;

  async function requestDelete(enquiry: Enquiry) {
    const { confirmed } = await confirm(confirmDeleteEnquiry(enquiry.name, enquiry.company));
    if (confirmed) remove.mutate(enquiry._id);
  }

  function saveNote() {
    if (!noting) return;
    update.mutate({ id: noting._id, note: note.trim() });
    setNoting(null);
  }

  if (isLoading) return <PageLoader label="Loading enquiries" />;

  return (
    <div className="animate-in">
      <PageHeader
        title="Enquiries"
        subtitle="Campaign briefs sent from the public website. Contact them, then mark what you did."
      />

      <div className="card card-pad row wrap gap-2" style={{ marginBottom: 16 }}>
        <div className="row grow" style={{ position: 'relative', minWidth: 220 }}>
          <span className="dim" style={{ position: 'absolute', left: 12, display: 'flex', pointerEvents: 'none' }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name, company, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search enquiries"
          />
        </div>

        <select
          className="select"
          style={{ width: 'auto', minWidth: 180 }}
          value={filters.status}
          onChange={(e) =>
            setFilters((c) => ({ ...c, status: e.target.value as EnquiryStatus | 'all', page: 1 }))
          }
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
            icon="inbox"
            title={filters.status === 'new' ? 'Nothing waiting' : 'No enquiries found'}
            description={
              filters.status === 'new'
                ? 'Every enquiry has been picked up. New ones from the website appear here automatically.'
                : 'Try a different search term or status.'
            }
          />
        ) : (
          <>
            <ul className="stack">
              {items.map((enquiry) => (
                <li
                  key={enquiry._id}
                  className="stack gap-3"
                  style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}
                >
                  <div className="between wrap gap-3">
                    <span className="stack gap-1" style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 14.5 }}>{enquiry.company}</strong>
                      <span className="dim" style={{ fontSize: 12.5 }}>
                        {enquiry.name} · {enquiry.who}
                        {enquiry.budget ? ` · ${enquiry.budget}` : ''}
                      </span>
                    </span>

                    <span className="row gap-3">
                      <span className={PILL[enquiry.status].className}>{PILL[enquiry.status].label}</span>
                      <span className="dim mono" style={{ fontSize: 11.5 }}>
                        {formatRelative(enquiry.createdAt)}
                      </span>
                    </span>
                  </div>

                  <ContactRow enquiry={enquiry} />

                  {!!enquiry.note && (
                    <p
                      style={{
                        margin: 0,
                        padding: '10px 12px',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--ink-950)',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                      }}
                    >
                      {enquiry.note}
                    </p>
                  )}

                  {/* Who touched it last, so a shared inbox does not mean two people
                      ringing the same brand. */}
                  {!!enquiry.handledBy && !!enquiry.handledAt && (
                    <span className="dim" style={{ fontSize: 11.5 }}>
                      Last updated by {enquiry.handledBy.name} · {formatRelative(enquiry.handledAt)}
                    </span>
                  )}

                  <div className="row wrap gap-2">
                    {enquiry.status !== 'contacted' && (
                      <button
                        className="btn btn-success btn-sm"
                        disabled={busy}
                        onClick={() => update.mutate({ id: enquiry._id, status: 'contacted' })}
                      >
                        <Icon name="check" size={14} /> Mark contacted
                      </button>
                    )}
                    {enquiry.status !== 'closed' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => update.mutate({ id: enquiry._id, status: 'closed' })}
                      >
                        <Icon name="archive" size={14} /> Close
                      </button>
                    )}
                    {enquiry.status !== 'new' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => update.mutate({ id: enquiry._id, status: 'new' })}
                      >
                        <Icon name="restore" size={14} /> Reopen
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => {
                        setNoting(enquiry);
                        setNote(enquiry.note);
                      }}
                    >
                      <Icon name="edit" size={14} /> {enquiry.note ? 'Edit note' : 'Add note'}
                    </button>

                    <span className="grow" />

                    <button
                      className="btn btn-subtle btn-icon"
                      disabled={busy}
                      title="Delete enquiry"
                      aria-label={`Delete enquiry from ${enquiry.company}`}
                      style={{ color: 'var(--rose-400)' }}
                      onClick={() => void requestDelete(enquiry)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {data?.meta && (
              <Pagination
                meta={data.meta}
                noun="enquiry"
                nounPlural="enquiries"
                onChange={(page) => {
                  setFilters((c) => ({ ...c, page }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>

      <Modal
        open={!!noting}
        title="Internal note"
        description="Only visible here. The sender never sees it."
        onClose={() => setNoting(null)}
        width={460}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setNoting(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveNote} disabled={update.isPending}>
              {update.isPending && <span className="spinner" />}
              Save note
            </button>
          </>
        }
      >
        <TextAreaField
          label="Note"
          rows={4}
          autoFocus
          maxLength={600}
          placeholder="e.g. Called on 12th, wants reels for a Diwali launch. Sending a shortlist."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}
