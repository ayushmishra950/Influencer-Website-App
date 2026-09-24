'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { FormError } from '@/components/FormError';
import { apiRequest, errorMessage, tokenStore } from '@/lib/client-api';
import { deliveryLabel, formatPrice, pluralize, relativeTime } from '@/lib/format';
import { notifySessionChange } from '@/lib/session';
import type { Order, OrderCounts, OrderStatus } from '@/lib/types';

type Filter = OrderStatus | 'all';

const TABS: { value: Filter; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'all', label: 'All' },
];

const PILL: Record<OrderStatus, { label: string; tone: string; bg: string }> = {
  new: { label: 'Needs an answer', tone: 'var(--amber-400)', bg: 'var(--amber-bg)' },
  accepted: { label: 'Accepted', tone: 'var(--violet-400)', bg: 'var(--violet-bg)' },
  completed: { label: 'Completed', tone: 'var(--mint-400)', bg: 'var(--mint-bg)' },
  declined: { label: 'Declined', tone: 'var(--rose-400)', bg: 'var(--rose-bg)' },
};

const EMPTY_COUNTS: OrderCounts = { new: 0, accepted: 0, declined: 0, completed: 0 };

interface Payload {
  data: Order[];
  meta: { total: number; counts: OrderCounts };
}

export function OrdersView() {
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('new');
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<OrderCounts>(EMPTY_COUNTS);
  const [error, setError] = useState('');

  // Which filter the list on screen belongs to. Derived rather than a `loading` flag,
  // because setting one at the top of the effect is a synchronous state update on
  // mount -- an extra render for something the data already tells us. A refresh of the
  // filter already shown therefore never flashes a spinner, which is what we want when
  // it happens behind someone's back.
  const [loadedKey, setLoadedKey] = useState<Filter | null>(null);
  const [failedKey, setFailedKey] = useState<Filter | null>(null);
  const [acting, setActing] = useState('');
  const [declining, setDeclining] = useState<Order | null>(null);
  const [reason, setReason] = useState('');

  const requestId = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback(async (which: Filter) => {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    const current = ++requestId.current;
    inFlight.current = true;

    try {
      const body = await apiRequest<Payload>(
        `/api/influencer/orders?status=${which}&limit=50`,
        { auth: true },
      );
      // A slower earlier request must not overwrite a newer one's results.
      if (current !== requestId.current) return;
      setOrders(body.data);
      setCounts(body.meta.counts);
      setError('');
      setFailedKey(null);
      setLoadedKey(which);
    } catch (err) {
      if (current !== requestId.current) return;
      setError(errorMessage(err, 'Could not load your orders.'));
      setFailedKey(which);
    } finally {
      if (current === requestId.current) inFlight.current = false;
    }
  }, [router]);

  useEffect(() => {
    // Wrapped rather than called straight: every setState inside `load` happens after
    // an await, but an effect body that calls a setState-bearing function is flagged
    // regardless, and the wrapper is also what makes that true by construction.
    void (async () => { await load(filter); })();
  }, [filter, load]);

  const loading = loadedKey !== filter && failedKey !== filter;

  /**
   * Refetch when the tab comes back to the front.
   *
   * Orders arrive while this page is sitting in a background tab, and the server does
   * emit a socket event for them — but this panel has no socket client, so coming back
   * to the tab is the moment to catch up. The list stays on screen while it refreshes,
   * rather than flashing a spinner at someone who just switched back.
   */
  useEffect(() => {
    const onVisible = () => {
      // Skipped while a request is already running. Focus and visibilitychange can
      // arrive in bursts, and each new request supersedes the last -- so a burst could
      // leave every one of them cancelled and the view stuck on "Loading".
      if (document.visibilityState !== 'visible' || inFlight.current) return;
      void load(filter);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [filter, load]);

  async function act(order: Order, status: OrderStatus, declineReason = '') {
    setActing(order._id);
    try {
      await apiRequest(`/api/influencer/orders/${order._id}`, {
        method: 'PATCH',
        auth: true,
        body: { status, declineReason },
      });
      await load(filter);
    } catch (err) {
      const message = errorMessage(err, 'Could not update that order.');
      setError(message);
      // A token the server no longer accepts is not a session.
      if (message.toLowerCase().includes('session')) {
        tokenStore.clear();
        notifySessionChange();
        router.replace('/login');
      }
    } finally {
      setActing('');
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-24 text-center">
        <p style={{ color: 'var(--text-3)' }}>Loading your orders…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <header>
        <h1 className="text-[28px] sm:text-[34px]">Orders</h1>
        <p className="prose-body mt-2 max-w-2xl text-[14.5px]">
          Requests brands have sent for your packages. Answer them here, then deal with
          the brand directly — Aura does not take payment or a commission.
        </p>
      </header>

      {counts.new > 0 && (
        <p className="mt-4 text-[14px] font-semibold" style={{ color: 'var(--amber-400)' }}>
          {pluralize(counts.new, 'order')} waiting for your answer
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filter orders">
        {TABS.map((tab) => {
          const selected = tab.value === filter;
          const count = tab.value === 'all'
            ? Object.values(counts).reduce((sum, n) => sum + n, 0)
            : counts[tab.value];

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(tab.value)}
              className="chip border px-3.5 py-2 text-[13px]"
              style={{
                background: selected ? 'var(--violet-bg)' : 'var(--ink-800)',
                color: selected ? 'var(--violet-400)' : 'var(--text-2)',
                borderColor: selected ? 'var(--violet-500)' : 'var(--line)',
              }}
            >
              {tab.label} {count > 0 && <span style={{ opacity: 0.75 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {!!error && <div className="mt-5"><FormError message={error} /></div>}

      {orders.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <p className="text-[16px] font-bold">
            {filter === 'new' ? 'Nothing waiting' : 'Nothing here yet'}
          </p>
          <p className="prose-body mx-auto mt-2 max-w-sm text-[14px]">
            {filter === 'new'
              ? 'You have answered everything. New requests from brands appear here.'
              : 'Brands find you through the directory and request a package from your profile.'}
          </p>
          <Link href="/profile" className="btn btn-ghost mt-5">Manage your packages</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4" aria-busy={loading}>
          {orders.map((order) => {
            const pill = PILL[order.status];
            const busy = acting === order._id;

            return (
              <li key={order._id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-bold">{order.packageTitle}</h2>
                    <p className="mt-1 text-[13px]" style={{ color: 'var(--text-3)' }}>
                      {[order.buyerCompany || order.buyerName, deliveryLabel(order.deliveryDays)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="chip" style={{ background: pill.bg, color: pill.tone }}>
                      {pill.label}
                    </span>
                    <span className="text-[17px] font-bold" style={{ color: 'var(--violet-400)' }}>
                      {formatPrice(order.price, order.currency)}
                    </span>
                  </div>
                </div>

                {!!order.message && (
                  <p
                    className="mt-3.5 rounded-xl p-3.5 text-[13.5px] leading-[1.6]"
                    style={{ background: 'var(--ink-800)', color: 'var(--text-2)' }}
                  >
                    {order.message}
                  </p>
                )}

                {/* The point of the whole page: how to reach them, one tap each. */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`mailto:${order.buyerEmail}`} className="btn btn-ghost h-9 px-3.5 text-[13px]">
                    {order.buyerEmail}
                  </a>
                  <a href={`tel:${order.buyerPhone}`} className="btn btn-ghost h-9 px-3.5 text-[13px]">
                    {order.buyerPhone}
                  </a>
                </div>

                {order.status === 'declined' && !!order.declineReason && (
                  <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                    Your note: {order.declineReason}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3.5">
                  <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                    {order.buyerName} · {relativeTime(order.createdAt)}
                  </span>
                  <span className="flex-1" />

                  {order.status === 'new' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => void act(order, 'accepted')}
                        className="btn btn-primary h-9 px-4 text-[13px]">
                        Accept
                      </button>
                      <button type="button" disabled={busy}
                        onClick={() => { setDeclining(order); setReason(''); }}
                        className="btn btn-ghost h-9 px-4 text-[13px]">
                        Decline
                      </button>
                    </>
                  )}

                  {order.status === 'accepted' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => void act(order, 'completed')}
                        className="btn btn-primary h-9 px-4 text-[13px]">
                        Mark completed
                      </button>
                      <button type="button" disabled={busy}
                        onClick={() => { setDeclining(order); setReason(''); }}
                        className="btn btn-ghost h-9 px-4 text-[13px]">
                        Fell through
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Declining is the one answer that cannot be taken back, so it asks first. */}
      <Dialog
        open={!!declining}
        title="Decline this order?"
        onClose={() => setDeclining(null)}
      >
        <p className="prose-body text-[14px]">
          {declining?.buyerCompany || declining?.buyerName} will not be told automatically —
          it is worth replying to them yourself. This cannot be undone.
        </p>
        <label className="mt-4 grid gap-1.5">
          <span className="text-[13px] font-semibold">Note for yourself (optional)</span>
          <textarea
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Dates clash with a shoot"
            className="input"
          />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => setDeclining(null)}>
            Keep it
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const order = declining;
              setDeclining(null);
              if (order) void act(order, 'declined', reason.trim());
            }}
          >
            Decline
          </button>
        </div>
      </Dialog>
    </div>
  );
}
